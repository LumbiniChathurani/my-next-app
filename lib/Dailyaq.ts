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

/** The n days BEFORE today (today is left out), oldest first. lastNDates(1)[0] = yesterday. */
export function lastNDates(n = 7): string[] {
  // "en-CA" formats as YYYY-MM-DD
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const base = new Date(today + "T00:00:00Z");
  const out: string[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Every date from `from` to `to` inclusive, as YYYY-MM-DD, oldest first. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(to + "T00:00:00Z");
  for (let d = new Date(from + "T00:00:00Z"); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const dayKey = (value: string) => String(value).slice(0, 10);

// ── Paging (Supabase returns at most 1,000 rows per request) ──────────────────

async function fetchAllRows(build: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const pageSize = 1000;
  const out: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await build(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as any[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

/**
 * Daily AQI for every station (or only `stationIds`) between `from` and `to` (YYYY-MM-DD, inclusive).
 */
export async function fetchDailyRange(
  from: string,
  to: string,
  stationIds?: number[]
): Promise<DailyResult> {
  const dates = datesBetween(from, to);
  const errors: string[] = [];

  // 1. Stations
  const { data: stationData, error: stationErr } = await supabase_2
    .from("stations")
    .select("id, source, name")
    .order("source")
    .order("name");
  if (stationErr) throw stationErr;

  const stations = ((stationData ?? []) as { id: number; source: Source; name: string }[]).filter(
    (s) => !stationIds || stationIds.includes(s.id)
  );
  const paIds = stations.filter((s) => s.source === "purpleair").map((s) => s.id);
  const iqIds = stations.filter((s) => s.source === "iqair").map((s) => s.id);

  // 2. All three daily tables in parallel. allSettled = one failing doesn't kill the rest.
  const [paRes, iqAqiRes, iqPmRes] = await Promise.allSettled([
    paIds.length
      ? fetchAllRows((a, b) =>
          supabase_2
            .from("purpleair_daily")
            .select("station_id, timestamp, pm25, aqi_overall, aqi_category")
            .in("station_id", paIds)
            .gte("timestamp", from)
            .lte("timestamp", to + "T23:59:59Z")
            .order("station_id")
            .order("timestamp")
            .range(a, b)
        )
      : Promise.resolve([] as any[]),
    iqIds.length
      ? fetchAllRows((a, b) =>
          supabase_2
            .from("iqair_daily_aqi")
            .select("station_id, date, aqi, aqi_category")
            .in("station_id", iqIds)
            .gte("date", from)
            .lte("date", to)
            .order("station_id")
            .order("date")
            .range(a, b)
        )
      : Promise.resolve([] as any[]),
    iqIds.length
      ? fetchAllRows((a, b) =>
          supabase_2
            .from("iqair_daily_pm25")
            .select("station_id, date, pm25")
            .in("station_id", iqIds)
            .gte("date", from)
            .lte("date", to)
            .order("station_id")
            .order("date")
            .range(a, b)
        )
      : Promise.resolve([] as any[]),
  ]);

  // 3. Build one row per station
  const rowMap = new Map<number, DailyRow>();
  for (const s of stations) {
    rowMap.set(s.id, { stationId: s.id, name: s.name, source: s.source, days: {} });
  }

  const unwrap = (res: PromiseSettledResult<any[]>, label: string): any[] => {
    if (res.status === "rejected") {
      errors.push(`${label}: ${res.reason?.message ?? "request failed"}`);
      return [];
    }
    return res.value;
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

/** The table's view: the 7 days before today (today is left out). */
export async function fetchDailyLast7Days(): Promise<DailyResult> {
  const dates = lastNDates(7);
  return fetchDailyRange(dates[0], dates[dates.length - 1]);
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