import { supabase_2 } from "./supabaseClient";

export type Source = "purpleair" | "iqair";

export type DailyCell = {
  aqi: number | null;
  pm25: number | null;
  category: string | null;
};

export type DailyRow = {
  stationId: number;
  name: string;
  source: Source;
  days: Record<string, DailyCell>; // key = "YYYY-MM-DD"
};

export type DailyResult = {
  dates: string[]; // oldest -> newest
  rows: DailyRow[];
  errors: string[]; // sources that failed, so the UI can warn instead of hiding it
};

const TIMEZONE = "Asia/Colombo";

// ── Dates (Sri Lanka time, not UTC) ───────────────────────────────────────────

export function lastNDates(n = 7): string[] {
  // "en-CA" formats as YYYY-MM-DD
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const base = new Date(today + "T00:00:00Z");
  const out: string[] = [];
  // Start at 1 (yesterday), not 0 (today): today's daily row is still incomplete
  for (let i = n; i >= 1; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const dayKey = (value: string) => String(value).slice(0, 10);

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchDailyLast7Days(): Promise<DailyResult> {
  const dates = lastNDates(7);
  const from = dates[0];
  const to = dates[dates.length - 1];
  const errors: string[] = [];

  // 1. Stations
  const { data: stationData, error: stationErr } = await supabase_2
    .from("stations")
    .select("id, source, name")
    .order("source")
    .order("name");
  if (stationErr) throw stationErr;

  const stations = (stationData ?? []) as { id: number; source: Source; name: string }[];
  const paIds = stations.filter((s) => s.source === "purpleair").map((s) => s.id);
  const iqIds = stations.filter((s) => s.source === "iqair").map((s) => s.id);

  // 2. All three daily tables in parallel. allSettled = one failing doesn't kill the rest.
  const [paRes, iqAqiRes, iqPmRes] = await Promise.allSettled([
    paIds.length
      ? supabase_2
          .from("purpleair_daily")
          .select("station_id, timestamp, pm25, aqi_overall, aqi_category")
          .in("station_id", paIds)
          .gte("timestamp", from)
          .lte("timestamp", to + "T23:59:59Z")
      : Promise.resolve({ data: [], error: null }),
    iqIds.length
      ? supabase_2
          .from("iqair_daily_aqi")
          .select("station_id, date, aqi, aqi_category")
          .in("station_id", iqIds)
          .gte("date", from)
          .lte("date", to)
      : Promise.resolve({ data: [], error: null }),
    iqIds.length
      ? supabase_2
          .from("iqair_daily_pm25")
          .select("station_id, date, pm25")
          .in("station_id", iqIds)
          .gte("date", from)
          .lte("date", to)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // 3. Build one row per station
  const rowMap = new Map<number, DailyRow>();
  for (const s of stations) {
    rowMap.set(s.id, { stationId: s.id, name: s.name, source: s.source, days: {} });
  }

  const unwrap = (res: PromiseSettledResult<any>, label: string): any[] => {
    if (res.status === "rejected") {
      errors.push(`${label}: ${res.reason?.message ?? "request failed"}`);
      return [];
    }
    if (res.value.error) {
      errors.push(`${label}: ${res.value.error.message}`);
      return [];
    }
    return res.value.data ?? [];
  };

  // PurpleAir
  for (const r of unwrap(paRes, "PurpleAir")) {
    const row = rowMap.get(r.station_id);
    if (!row) continue;
    row.days[dayKey(r.timestamp)] = {
      aqi: r.aqi_overall ?? null,
      pm25: r.pm25 ?? null,
      category: r.aqi_category ?? null,
    };
  }

  // IQAir: AQI and PM2.5 live in separate tables, so merge them
  for (const r of unwrap(iqAqiRes, "IQAir AQI")) {
    const row = rowMap.get(r.station_id);
    if (!row) continue;
    row.days[dayKey(r.date)] = { aqi: r.aqi ?? null, pm25: null, category: r.aqi_category ?? null };
  }
  for (const r of unwrap(iqPmRes, "IQAir PM2.5")) {
    const row = rowMap.get(r.station_id);
    if (!row) continue;
    const key = dayKey(r.date);
    row.days[key] = { ...(row.days[key] ?? { aqi: null, category: null }), pm25: r.pm25 ?? null };
  }

  // Return every station (stations with no readings show as grey "-" cells)
  const rows = [...rowMap.values()];

  return { dates, rows, errors };
}

// ── Color helpers (US EPA AQI scale) ──────────────────────────────────────────

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

export function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}