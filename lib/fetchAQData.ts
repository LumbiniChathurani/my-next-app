import { supabase_2 } from "./supabaseClient";

export type Period = "10min" | "1hour" | "1day";
export type Source = "purpleair" | "iqair";

export type Station = {
  id: number;
  source: Source;
  station_code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
};

export type Reading = {
  timestamp: string;
  pm25: number | null;
  pm25_epa_corrected: number | null;
  pm10: number | null;
  aqi_pm25: number | null;
  aqi_pm10: number | null;
  aqi_overall: number | null;
  aqi_category: string | null;
  humidity: number | null;
  temperature: number | null;
  source: Source;
  station_id: number;
  station_name: string;
};

// ── Stations ─────────────────────────────────────────────────────────────────

export async function fetchAllStations(): Promise<Station[]> {
  const { data, error } = await supabase_2
    .from("stations")
    .select("id, source, station_code, name, latitude, longitude, city, province")
    .order("source")
    .order("name");
  if (error) throw error;
  return data as Station[];
}

// ── PurpleAir ─────────────────────────────────────────────────────────────────

const PA_TABLE: Record<Period, string> = {
  "10min": "purpleair_10min",
  "1hour": "purpleair_hourly",
  "1day":  "purpleair_daily",
};

export async function fetchPurpleAirReadings(
  stationIds: number[],
  period: Period,
  from: string,
  to: string,
  stationMap: Record<number, string>
): Promise<Reading[]> {
  const table = PA_TABLE[period];
  const { data, error } = await supabase_2
    .from(table)
    .select(
      "station_id, timestamp, pm25, pm25_epa_corrected, pm10, aqi_pm25, aqi_pm10, aqi_overall, aqi_category, humidity, temperature"
    )
    .in("station_id", stationIds)
    .gte("timestamp", from)
    .lte("timestamp", to + "T23:59:59Z")
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    pm25_epa_corrected: r.pm25_epa_corrected ?? null,
    source: "purpleair" as Source,
    station_name: stationMap[r.station_id] ?? `Station ${r.station_id}`,
  }));
}

// ── IQAir ─────────────────────────────────────────────────────────────────────

export async function fetchIQAirReadings(
  stationIds: number[],
  period: Period,
  from: string,
  to: string,
  stationMap: Record<number, string>
): Promise<Reading[]> {
  // IQAir has no 10min tables — fall back to hourly for 10min period
  const isDaily    = period === "1day";
  const isHourly   = period === "1hour" || period === "10min";
  const aqiTable   = isDaily ? "iqair_daily_aqi"  : "iqair_hourly_aqi";
  const pm25Table  = isDaily ? "iqair_daily_pm25" : "iqair_hourly_pm25";
  const tsCol      = isDaily ? "date" : "timestamp";
  const toTs       = isDaily ? to : to + "T23:59:59Z";

  type AQIRow  = { station_id: number; aqi: number | null; aqi_category: string | null } & Record<string, any>;
  type PM25Row = { station_id: number; pm25: number | null } & Record<string, any>;

  const [aqiRes, pm25Res] = await Promise.all([
    supabase_2
      .from(aqiTable)
      .select(`station_id, ${tsCol}, aqi, aqi_category`)
      .in("station_id", stationIds)
      .gte(tsCol, from)
      .lte(tsCol, toTs)
      .order(tsCol, { ascending: true }),
    supabase_2
      .from(pm25Table)
      .select(`station_id, ${tsCol}, pm25`)
      .in("station_id", stationIds)
      .gte(tsCol, from)
      .lte(tsCol, toTs)
      .order(tsCol, { ascending: true }),
  ]);

  if (aqiRes.error) throw aqiRes.error;
  if (pm25Res.error) throw pm25Res.error;

  // Merge AQI and PM2.5 by station_id + timestamp
  const pm25Map: Record<string, number | null> = {};
  for (const r of (pm25Res.data ?? []) as PM25Row[]) {
    pm25Map[`${r.station_id}__${r[tsCol]}`] = r.pm25;
  }

  return ((aqiRes.data ?? []) as AQIRow[]).map((r) => {
    const key = `${r.station_id}__${r[tsCol]}`;
    return {
      timestamp: r[tsCol],
      pm25: pm25Map[key] ?? null,
      pm25_epa_corrected: null,
      pm10: null,
      aqi_pm25: r.aqi ?? null,
      aqi_pm10: null,
      aqi_overall: r.aqi ?? null,
      aqi_category: r.aqi_category ?? null,
      humidity: null,
      temperature: null,
      source: "iqair" as Source,
      station_id: r.station_id,
      station_name: stationMap[r.station_id] ?? `Station ${r.station_id}`,
    };
  });
}

// ── Combined ──────────────────────────────────────────────────────────────────

export async function fetchCombinedReadings(
  stations: Station[],
  period: Period,
  from: string,
  to: string
): Promise<Reading[]> {
  const paStations = stations.filter((s) => s.source === "purpleair");
  const iqStations = stations.filter((s) => s.source === "iqair");

  const paMap: Record<number, string> = Object.fromEntries(
    paStations.map((s) => [s.id, s.name])
  );
  const iqMap: Record<number, string> = Object.fromEntries(
    iqStations.map((s) => [s.id, s.name])
  );

  const results = await Promise.allSettled([
    paStations.length > 0
      ? fetchPurpleAirReadings(paStations.map((s) => s.id), period, from, to, paMap)
      : Promise.resolve([]),
    iqStations.length > 0
      ? fetchIQAirReadings(iqStations.map((s) => s.id), period, from, to, iqMap)
      : Promise.resolve([]),
  ]);

  const readings: Reading[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") readings.push(...r.value);
  }
  return readings;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getAQIColor(aqi: number): string {
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

export function getAQILabel(aqi: number): string {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function presetRanges(): { label: string; from: string; to: string }[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const sub = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return fmt(d);
  };
  return [
    { label: "Last 7 days",  from: sub(7),  to: fmt(today) },
    { label: "Last 30 days", from: sub(30), to: fmt(today) },
    { label: "Last 90 days", from: sub(90), to: fmt(today) },
  ];
}