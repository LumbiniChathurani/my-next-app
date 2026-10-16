"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDailyLast7Days, getAQILabel, type DailyResult, type DailyRow } from "../lib/Dailyaq";
import {
  adminSignIn,
  adminSignOut,
  fetchSelectedStationIds,
  saveSelectedStationIds,
  subscribeAdminSession,
} from "../lib/dailyTableConfig";

const REFRESH_MS = 5 * 60 * 1000; // re-fetch every 5 minutes

// Column order, left to right. Names must match the "name" column in your
// stations table (case-insensitive). Stations not listed go at the end, A-Z.
const STATION_ORDER = [
  "Akurana-outdoor",
  "Digana",
  "Nuwara Eliya",
  "Colombo (EFIC)",
  "Kurunegala",
  "Minihana",
  "Negombo",
  "Battaramulla (CEA)",
  "Puttalam",
  "Chilaw (CEA)",
  "Galle",
  "Ambalanthota",
  "Mannar",
  "Trincomalee",
  "Jaffna",
  "Anuradhapura",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellColor(aqi: number): string {
  if (aqi <= 50) return "#2e9e3e"; // green
  if (aqi <= 100) return "#ffff33"; // yellow
  if (aqi <= 150) return "#ffc04d"; // orange
  if (aqi <= 200) return "#ff4d4d"; // red
  if (aqi <= 300) return "#8f3f97"; // purple
  return "#7e0023"; // maroon
}

const textColor = (aqi: number) => (aqi > 200 ? "#fff" : "#000");

const LEGEND = [
  { aqi: 50, label: "0–50 Good" },
  { aqi: 100, label: "51–100 Moderate" },
  { aqi: 150, label: "101–150 Unhealthy for sensitive groups" },
  { aqi: 200, label: "151–200 Unhealthy" },
  { aqi: 300, label: "201–300 Very unhealthy" },
  { aqi: 301, label: "301+ Hazardous" },
];

function dateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`; // e.g. "5-Oct"
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function stationRank(name: string) {
  const i = STATION_ORDER.findIndex((n) => n.toLowerCase() === name.toLowerCase());
  return i === -1 ? 999 : i;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const boxed: React.CSSProperties = {
  border: "1px solid #000",
  textAlign: "center",
  minWidth: 44,
  height: 30,
  fontSize: 14,
};

const bigLabel: React.CSSProperties = { fontWeight: 800, fontSize: 18, textAlign: "center" };

// Hover popup text for a station/date cell: AQI, category and PM2.5
function cellTip(s: DailyRow, d: string): string {
  const c = s.days[d];
  const head = `${s.name}, ${dateLabel(d)}`;
  if (!c || c.aqi == null) return `${head}\nNo data`;
  const pm = c.pm25 != null ? `\nPM2.5: ${c.pm25.toFixed(1)} µg/m³` : "";
  return `${head}\nAQI ${Math.round(c.aqi)} (${getAQILabel(c.aqi)})${pm}`;
}

function AQCell({ value, title }: { value: number | null | undefined; title?: string }) {
  if (value == null) {
    return (
      <td title={title} style={{ ...boxed, background: "#a6a6a6", color: "#333" }}>
        -
      </td>
    );
  }
  return (
    <td title={title} style={{ ...boxed, background: cellColor(value), color: textColor(value) }}>
      {value}
    </td>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DailyAQITable() {
  const [data, setData] = useState<DailyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Selection saved by the admin (null = nothing saved yet -> automatic default)
  const [savedIds, setSavedIds] = useState<number[] | null>(null);

  // Admin-only state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false); // login form appears only at ?admin
  const [draft, setDraft] = useState<Set<number> | null>(null); // unsaved changes
  const [saving, setSaving] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const [result, saved] = await Promise.all([
        fetchDailyLast7Days(),
        fetchSelectedStationIds()
          .then((v) => ({ ok: true as const, v }))
          .catch(() => ({ ok: false as const, v: null })),
      ]);
      setData(result);
      if (saved.ok) setSavedIds(saved.v); // if loading the selection fails, keep the previous one
      setFatalError(null);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setFatalError(e?.message ?? "Could not load air quality data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-update: load once, poll every 5 min, refresh when the tab is visible again.
  // This also picks up selection changes the admin saved.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Admin session + hidden ?admin login
  useEffect(() => {
    setShowAdminLogin(new URLSearchParams(window.location.search).has("admin"));
    return subscribeAdminSession((signedIn) => {
      setIsAdmin(signedIn);
      if (!signedIn) setDraft(null);
    });
  }, []);

  // Every station, in display order
  const allStations = useMemo<DailyRow[]>(
    () =>
      data
        ? [...data.rows].sort(
            (a, b) => stationRank(a.name) - stationRank(b.name) || a.name.localeCompare(b.name)
          )
        : [],
    [data]
  );

  // How many of the 7 days are empty for each station
  const missingByStation = useMemo(() => {
    const m: Record<number, number> = {};
    if (data) {
      for (const s of data.rows) {
        m[s.stationId] = data.dates.filter((d) => s.days[d]?.aqi == null).length;
      }
    }
    return m;
  }, [data]);

  // Which stations are shown:
  //  1. the admin's unsaved changes (admin only)
  //  2. otherwise the selection the admin saved (everyone)
  //  3. otherwise the default: only stations with NO empty cells
  const selectedSet = useMemo<Set<number>>(() => {
    if (isAdmin && draft) return draft;
    if (savedIds) return new Set(savedIds);
    return new Set(allStations.filter((s) => missingByStation[s.stationId] === 0).map((s) => s.stationId));
  }, [isAdmin, draft, savedIds, allStations, missingByStation]);

  const computed = useMemo(() => {
    if (!data) return null;

    const stations: DailyRow[] = allStations.filter((s) => selectedSet.has(s.stationId));

    // Daily AQI = average of the shown stations for that date
    const daily: Record<string, number | null> = {};
    for (const d of data.dates) {
      const vals = stations.map((s) => s.days[d]?.aqi).filter((v): v is number => v != null);
      daily[d] = average(vals);
    }

    // Weekly AQI = average of the 7 days for each station
    const weekly: Record<number, number | null> = {};
    for (const s of stations) {
      const vals = data.dates.map((d) => s.days[d]?.aqi).filter((v): v is number => v != null);
      weekly[s.stationId] = average(vals);
    }

    return { stations, daily, weekly };
  }, [data, allStations, selectedSet]);

  // ── Admin actions ───────────────────────────────────────────────────────────

  const toggleStation = (id: number) =>
    setDraft(() => {
      const next = new Set(selectedSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function saveSelection(ids: number[] | null) {
    setSaving(true);
    setAdminMsg(null);
    try {
      await saveSelectedStationIds(ids);
      setSavedIds(ids);
      setDraft(null);
      setAdminMsg(ids === null ? "Reset to the default selection." : "Saved. Everyone now sees this selection.");
    } catch (e: any) {
      setAdminMsg(`Couldn't save: ${e?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminMsg(null);
    try {
      await adminSignIn(email, password);
      setPassword("");
    } catch (err: any) {
      setAdminMsg(`Sign-in failed: ${err?.message ?? "unknown error"}`);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <p className="p-4">Loading air quality data...</p>;
  if (fatalError && !data) return <p className="p-4 text-red-600">Couldn't load data: {fatalError}</p>;
  if (!data || !computed) return null;

  const { stations, daily, weekly } = computed;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-fit max-w-full">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
          {/* Admin controls (hidden from everyone else) */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <>
                <details className="relative">
                  <summary className="cursor-pointer select-none rounded border border-gray-300 bg-white px-3 py-1 text-gray-900">
                    Stations ({stations.length} of {allStations.length})
                  </summary>
                  <div className="absolute left-0 z-20 mt-1 max-h-80 w-80 overflow-y-auto rounded border border-gray-300 bg-white p-3 text-gray-900 shadow-lg">
                    <div className="mb-2 flex gap-3 text-xs">
                      <button
                        className="underline"
                        onClick={() => setDraft(new Set(allStations.map((s) => s.stationId)))}
                      >
                        Select all
                      </button>
                      <button className="underline" onClick={() => setDraft(new Set())}>
                        Clear
                      </button>
                      <button
                        className="underline"
                        disabled={saving}
                        onClick={() => saveSelection(null)}
                        title="Show only stations with no empty cells"
                      >
                        Reset to default
                      </button>
                    </div>
                    {allStations.map((s) => {
                      const missing = missingByStation[s.stationId] ?? 0;
                      return (
                        <label key={s.stationId} className="flex cursor-pointer items-center gap-2 py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(s.stationId)}
                            onChange={() => toggleStation(s.stationId)}
                          />
                          <span>{s.name}</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {missing > 0 && <span className="text-orange-600">{missing} empty </span>}
                            {s.source === "purpleair" ? "PurpleAir" : "IQAir"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </details>

                {draft && (
                  <>
                    <button
                      onClick={() => saveSelection([...selectedSet])}
                      disabled={saving}
                      className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save for everyone"}
                    </button>
                    <button onClick={() => setDraft(null)} disabled={saving} className="underline">
                      Discard changes
                    </button>
                  </>
                )}

                <button onClick={() => adminSignOut()} className="underline">
                  Sign out
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {updatedAt && <span>Updated {updatedAt.toLocaleTimeString("en-GB")}</span>}
            <button onClick={load} className="underline">
              Refresh now
            </button>
          </div>
        </div>

        {adminMsg && <p className="mb-3 text-sm text-gray-700">{adminMsg}</p>}

        {isAdmin && draft && (
          <p className="mb-3 text-sm text-amber-800">
            Preview only. Visitors will not see these changes until you save.
          </p>
        )}

        {(data.errors.length > 0 || fatalError) && (
          <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-900">
            Some data may be missing: {[...data.errors, fatalError].filter(Boolean).join("; ")}
          </p>
        )}

        {stations.length === 0 && (
          <p className="mb-3 text-sm text-gray-600">
            {isAdmin ? "Select at least one station to see the table." : "No stations to show right now."}
          </p>
        )}

        {/* px-12 leaves room for the last rotated station name and keeps the table visually centered */}
        <div className="overflow-x-auto px-12 pt-2">
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...bigLabel, verticalAlign: "bottom", padding: "0 16px 6px 0" }}>DATE</th>

                {stations.map((s) => (
                  <th key={s.stationId} style={{ height: 150, minWidth: 44, position: "relative", padding: 0 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 6,
                        transformOrigin: "0 100%",
                        transform: "rotate(-60deg)",
                        whiteSpace: "nowrap",
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      {s.name}
                    </div>
                  </th>
                ))}

                <th style={{ width: 24 }} />
                <th style={{ ...bigLabel, verticalAlign: "bottom", padding: "0 0 6px 0", width: 70 }}>
                  DAILY AQI
                </th>
              </tr>
            </thead>

            <tbody>
              {data.dates.map((d) => (
                <tr key={d}>
                  <td style={{ ...boxed, background: "#fff", minWidth: 64 }}>{dateLabel(d)}</td>
                  {stations.map((s) => (
                    <AQCell key={s.stationId} value={s.days[d]?.aqi} title={cellTip(s, d)} />
                  ))}
                  <td />
                  <AQCell
                    value={daily[d]}
                    title={`Average of shown stations, ${dateLabel(d)}\nAQI: ${daily[d] ?? "no data"}`}
                  />
                </tr>
              ))}

              {/* gap row */}
              <tr>
                <td colSpan={stations.length + 3} style={{ height: 22 }} />
              </tr>

              <tr>
                <td style={{ ...bigLabel, padding: "0 12px 0 0", lineHeight: 1.1 }}>
                  WEEKLY
                  <br />
                  AQI
                </td>
                {stations.map((s) => (
                  <AQCell
                    key={s.stationId}
                    value={weekly[s.stationId]}
                    title={`${s.name}\n7-day average AQI: ${weekly[s.stationId] ?? "no data"}`}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 border border-black"
                style={{ backgroundColor: cellColor(l.aqi) }}
              />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 border border-black" style={{ backgroundColor: "#a6a6a6" }} />
            No data
          </span>
        </div>

        {/* Admin login: only appears when the page is opened with ?admin in the address */}
        {showAdminLogin && !isAdmin && (
          <form onSubmit={handleLogin} className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
              required
            />
            <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-white">
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}