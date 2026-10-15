"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDailyLast7Days,
  getAQIColor,
  getAQILabel,
  type DailyResult,
} from "../lib/Dailyaq";

const REFRESH_MS = 5 * 60 * 1000; // re-fetch every 5 minutes

const LEGEND = [
  { max: 50, label: "Good" },
  { max: 100, label: "Moderate" },
  { max: 150, label: "Unhealthy (sensitive)" },
  { max: 200, label: "Unhealthy" },
  { max: 300, label: "Very unhealthy" },
  { max: 301, label: "Hazardous" },
];

function formatDay(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export default function DailyAQITable() {
  const [data, setData] = useState<DailyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchDailyLast7Days();
      setData(result);
      setFatalError(null);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setFatalError(e?.message ?? "Could not load air quality data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-update: load once, then poll, and refresh when the tab becomes visible again
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

  if (loading) return <p className="p-4">Loading air quality data...</p>;
  if (fatalError && !data)
    return <p className="p-4 text-red-600">Couldn't load data: {fatalError}</p>;
  if (!data) return null;

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Daily AQI, last 7 days</h2>
        <div className="text-sm text-gray-500">
          {updatedAt && <>Updated {updatedAt.toLocaleTimeString("en-GB")} · </>}
          <button onClick={load} className="underline">
            Refresh now
          </button>
        </div>
      </div>

      {(data.errors.length > 0 || fatalError) && (
        <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-900">
          Some data may be missing: {[...data.errors, fatalError].filter(Boolean).join("; ")}
        </p>
      )}

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="sticky left-0 z-10 bg-gray-100 px-3 py-2">Station</th>
              <th className="px-3 py-2">Source</th>
              {data.dates.map((d) => (
                <th key={d} className="px-3 py-2 text-center whitespace-nowrap">
                  {formatDay(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.stationId} className="border-t border-gray-200">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium whitespace-nowrap">
                  {row.name}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {row.source === "purpleair" ? "PurpleAir" : "IQAir"}
                </td>
                {data.dates.map((d) => {
                  const cell = row.days[d];
                  const aqi = cell?.aqi;
                  if (aqi == null) {
                    return (
                      <td key={d} className="px-3 py-2 text-center text-gray-300">
                        –
                      </td>
                    );
                  }
                  const bg = getAQIColor(aqi);
                  const dark = aqi > 50 && aqi <= 100; // yellow needs dark text
                  return (
                    <td
                      key={d}
                      className="px-3 py-2 text-center font-semibold"
                      style={{ backgroundColor: bg, color: dark ? "#1f2937" : "#fff" }}
                      title={`${getAQILabel(aqi)}${
                        cell.pm25 != null ? ` · PM2.5 ${cell.pm25.toFixed(1)} µg/m³` : ""
                      }`}
                    >
                      {Math.round(aqi)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: getAQIColor(l.max) }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}