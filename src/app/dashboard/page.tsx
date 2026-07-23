"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchAllStations,
  fetchCombinedReadings,
  getAQIColor,
  getAQILabel,
  presetRanges,
  type Station,
  type Reading,
  type Period,
} from "../../../lib/fetchAQData";
import LineChartPanel from "../../../components/dashboard/LineChartPanel";
import PieChartPanel from "../../../components/dashboard/PieChartPanel";
import BarChartPanel from "../../../components/dashboard/BarChartPanel";
import HeatmapPanel from "../../../components/dashboard/HeatmapPanel";



// ── Types ─────────────────────────────────────────────────────────────────────

type Metric = "aqi_overall" | "pm25" | "pm10";

const METRIC_LABELS: Record<Metric, string> = {
  aqi_overall: "AQI",
  pm25:        "PM2.5 (µg/m³)",
  pm10:        "PM10 (µg/m³)",
};

const PERIOD_LABELS: Record<Period, string> = {
  "10min": "10 min",
  "1hour": "1 hour",
  "1day":  "Daily",
};

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(readings: Reading[], metric: Metric, period: Period, stationName: string, from: string, to: string) {
  if (readings.length === 0) { alert("No data to export"); return; }
  const headers = ["Timestamp", "Station", "Source", "AQI Overall", "AQI Category", "PM2.5 Raw", "PM2.5 EPA Corrected", "PM10", "Humidity", "Temperature"];
  const rows = readings.map((r) => [
    r.timestamp,
    r.station_name,
    r.source,
    r.aqi_overall ?? "",
    r.aqi_category ?? "",
    r.pm25 ?? "",
    r.pm25_epa_corrected ?? "",
    r.pm10 ?? "",
    r.humidity ?? "",
    r.temperature ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `AQ_${stationName}_${period}_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stations, setStations]               = useState<Station[]>([]);
  const [selectedIds, setSelectedIds]         = useState<number[]>([]);
  const [period, setPeriod]                   = useState<Period>("1hour");
  const [metric, setMetric]                   = useState<Metric>("aqi_overall");
  const [fromDate, setFromDate]               = useState("");
  const [toDate, setToDate]                   = useState("");
  const [readings, setReadings]               = useState<Reading[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllStations()
      .then((data) => {
        setStations(data);
        setSelectedIds(data.map((s) => s.id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setStationsLoading(false));

    const presets = presetRanges();
    setFromDate(presets[0].from);
    setToDate(presets[0].to);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate || selectedIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const selected = stations.filter((s) => selectedIds.includes(s.id));
      const data = await fetchCombinedReadings(selected, period, fromDate, toDate);
      setReadings(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [stations, selectedIds, period, fromDate, toDate]);

  useEffect(() => {
    if (stations.length > 0 && fromDate && toDate) fetchData();
  }, [period, fromDate, toDate, selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const validAQI = readings.map((r) => r.aqi_overall).filter((v): v is number => v !== null);
  const avgAQI   = validAQI.length > 0 ? Math.round(validAQI.reduce((a, b) => a + b, 0) / validAQI.length) : null;
  const maxAQI   = validAQI.length > 0 ? Math.max(...validAQI) : null;
  const minAQI   = validAQI.length > 0 ? Math.min(...validAQI) : null;

  const selectedStationNames = stations
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => s.name)
    .join(", ");

  const toggleStation = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyPreset = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };

  const checkboxRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 8px",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#1e293b",
    cursor: "pointer",
  };

  return (
<div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", color: "#1e293b", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      <header style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, backgroundColor: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "0.02em", color: "#0f172a" }}>Sri Lanka Air Quality</span>
        </div>
        <div style={{ display: "flex", gap: "8px", padding: "4px", borderRadius: "999px", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(15,23,42,0.14), 0 1px 3px rgba(15,23,42,0.1)" }}>
          {(["10min", "1hour", "1day"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={glassPillBtn(period === p)}
            >{PERIOD_LABELS[p]}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* ── Controls ── */}
        <section style={{ ...glassCard, padding: "24px", position: "relative", zIndex: 60 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end" }}>

            {/* Date presets */}
            <div>
              <label style={labelStyle}>Quick range</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {presetRanges().map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.from, p.to)}
                    style={glassChip(fromDate === p.from && toDate === p.to)}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            {/* Custom date */}
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
            </div>

            {/* Metric */}
            <div>
              <label style={labelStyle}>Metric</label>
              <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} style={inputStyle}>
                {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                  <option key={m} value={m}>{METRIC_LABELS[m]}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              style={{ ...glassPrimaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >{loading ? "Loading..." : "Apply"}</button>

            {readings.length > 0 && (
              <button
                onClick={() => exportCSV(readings, metric, period, selectedStationNames, fromDate, toDate)}
                style={glassChip(false)}
              >↓ Export CSV</button>
            )}
          </div>

          {/* Station selector */}
          {/* Station selector */}
{!stationsLoading && (
  <div style={{ marginTop: "20px", position: "relative" }} ref={dropdownRef}>
    <label style={labelStyle}>Stations</label>
    <button
      onClick={() => setDropdownOpen((o) => !o)}
      style={{
        ...glassDropdownTrigger,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minWidth: "260px",
      }}
    >
      <span>{selectedIds.length} of {stations.length} selected</span>
      <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "8px" }}>
        {dropdownOpen ? "▲" : "▼"}
      </span>
    </button>

    {dropdownOpen && (
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 100,
          backgroundColor: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.14), inset 0 1px 1px rgba(255,255,255,0.9)",
          padding: "10px",
          minWidth: "260px",
          maxHeight: "320px",
          overflowY: "auto",
        }}
      >
        {/* All / None */}
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={selectedIds.length === stations.length}
            onChange={(e) =>
              setSelectedIds(e.target.checked ? stations.map((s) => s.id) : [])
            }
          />
          <span style={{ fontWeight: "600" }}>All</span>
        </label>
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={selectedIds.length === 0}
            onChange={(e) => {
              if (e.target.checked) setSelectedIds([]);
            }}
          />
          <span style={{ fontWeight: "600" }}>None</span>
        </label>

        <div style={{ height: "1px", backgroundColor: "rgba(226,232,240,0.8)", margin: "6px 0" }} />

        {/* Individual stations */}
        {stations.map((s) => {
          const active = selectedIds.includes(s.id);
          const accent = s.source === "purpleair" ? "#a855f7" : "#3b82f6";
          return (
            <label key={s.id} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleStation(s.id)}
              />
              <span style={{ fontSize: "9px", opacity: 0.7, color: accent, fontWeight: "700" }}>
                {s.source === "purpleair" ? "PA" : "IQ"}
              </span>
              <span>{s.name}</span>
            </label>
          );
        })}
      </div>
    )}
  </div>
)}
        </section>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#dc2626", fontSize: "14px" }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Summary cards ── */}
        {readings.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { label: "Avg AQI",        value: avgAQI },
              { label: "Max AQI",        value: maxAQI },
              { label: "Min AQI",        value: minAQI },
              { label: "Total readings", value: readings.length },
            ].map(({ label, value }) => {
              const color = typeof value === "number" && label !== "Total readings"
                ? getAQIColor(value) : "#64748b";
              return (
                <div key={label} style={{ ...glassCard, padding: "24px", textAlign: "center" }}>
                  <p style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "600", margin: "0 0 10px 0" }}>{label}</p>
                  <p style={{ fontSize: "36px", fontWeight: "800", color, margin: 0, lineHeight: 1 }}>
                    {value ?? "—"}
                  </p>
                  {typeof value === "number" && label !== "Total readings" && avgAQI !== null && (
                    <p style={{ fontSize: "12px", color, margin: "8px 0 0 0" }}>{getAQILabel(value)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Charts ── */}
        {readings.length > 0 ? (
          <>
            <LineChartPanel
              readings={readings}
              metric={metric}
              metricLabel={METRIC_LABELS[metric]}
              period={period}
            />

            {/* ── AQI legend ── */}
        <div style={{ ...glassCard, padding: "20px" }}>
          <p style={{ fontSize: "11px", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "600", margin: "0 0 12px 0" }}>US EPA AQI Scale</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginLeft: "150px" }}>
            {[
              { range: "0–50",    label: "Good",                   color: "#16a34a" },
              { range: "51–100",  label: "Moderate",               color: "#ca8a04" },
              { range: "101–150", label: "Unhealthy (Sensitive)",  color: "#ea580c" },
              { range: "151–200", label: "Unhealthy",              color: "#dc2626" },
              { range: "201–300", label: "Very Unhealthy",         color: "#9333ea" },
              { range: "301+",    label: "Hazardous",              color: "#7f1d1d" },
            ].map(({ range, label, color }) => (
              <div key={range} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", padding: "6px 12px", borderRadius: "999px", backgroundColor: color + "18", color }}>
                <span>{range}</span>
                <span style={{ fontWeight: "400", opacity: 0.8 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>


            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <PieChartPanel readings={readings} />
              <BarChartPanel readings={readings} metric={metric} metricLabel={METRIC_LABELS[metric]} />
            </div>

            {period !== "1day" && (
              <HeatmapPanel readings={readings} metric={metric} metricLabel={METRIC_LABELS[metric]} />
            )}
          </>
        ) : !loading && (
          <div style={{ height: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed #e2e8f0", borderRadius: "16px", color: "#cbd5e1", gap: "8px" }}>
            <span style={{ fontSize: "32px" }}>🌬</span>
            <span style={{ fontSize: "14px" }}>Select stations and a date range, then click Apply</span>
          </div>
        )}

        
      </main>
    </div>
  );
}

// ── Shared micro-styles ───────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.08em",
  fontWeight: "600", marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: "10px", padding: "9px 14px",
  fontSize: "13px", color: "#1e293b",
  outline: "none",
};

// ── Liquid glass card ──────────────────────────────────────────────────────────
// Same frosted-surface logic as the buttons: a translucent tinted fill, a soft
// top highlight to suggest curvature, and a real outer shadow with a tight
// contact layer so the card visibly lifts off the page background.

const glassCard: React.CSSProperties = {
  background: "linear-gradient(165deg, rgba(255,255,255,0.85) 0%, rgba(241,245,249,0.65) 100%)",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.35)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.04), 0 12px 28px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.1)",
};

// ── Liquid glass button system ────────────────────────────────────────────────
// Frosted, translucent surfaces with a soft top highlight and a faint inner
// shadow along the bottom edge, mimicking light passing through curved glass.

function glassPillBtn(active: boolean): React.CSSProperties {
  return {
    padding: "6px 16px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    border: active ? "1px solid rgba(37,99,235,0.55)" : "1px solid rgba(148,163,184,0.3)",
    cursor: "pointer",
    color: active ? "#1d4ed8" : "#475569",
    background: active
      ? "linear-gradient(180deg, rgba(147,197,253,0.65) 0%, rgba(37,99,235,0.5) 100%)"
      : "rgba(255,255,255,0.3)",
    boxShadow: active
      ? "inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(30,64,175,0.3), 0 4px 12px rgba(37,99,235,0.35), 0 1px 3px rgba(15,23,42,0.15)"
      : "0 1px 3px rgba(15,23,42,0.1)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

function glassChip(active: boolean): React.CSSProperties {
  return {
    padding: "9px 16px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    color: active ? "#2563eb" : "#334155",
    background: active
      ? "linear-gradient(180deg, rgba(219,234,254,0.9) 0%, rgba(147,197,253,0.6) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(241,245,249,0.55) 100%)",
    border: active ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(148,163,184,0.45)",
    boxShadow: active
      ? "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(37,99,235,0.2), 0 6px 16px rgba(37,99,235,0.25), 0 1px 3px rgba(15,23,42,0.12)"
      : "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(15,23,42,0.14), 0 1px 3px rgba(15,23,42,0.1)",
    backdropFilter: "blur(10px) saturate(180%)",
    WebkitBackdropFilter: "blur(10px) saturate(180%)",
    transition: "all 0.2s ease",
  };
}

const glassPrimaryBtn: React.CSSProperties = {
  padding: "10px 26px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "linear-gradient(180deg, rgba(96,165,250,0.95) 0%, rgba(37,99,235,0.95) 100%)",
  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -2px 3px rgba(29,78,216,0.4), 0 8px 20px rgba(37,99,235,0.45), 0 2px 5px rgba(15,23,42,0.2)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  transition: "all 0.2s ease",
};

const glassDropdownTrigger: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(241,245,249,0.6) 100%)",
  border: "1px solid rgba(148,163,184,0.45)",
  borderRadius: "14px",
  padding: "9px 14px",
  fontSize: "13px",
  color: "#1e293b",
  cursor: "pointer",
  outline: "none",
  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(15,23,42,0.14), 0 1px 3px rgba(15,23,42,0.1)",
  backdropFilter: "blur(10px) saturate(180%)",
  WebkitBackdropFilter: "blur(10px) saturate(180%)",
  transition: "all 0.2s ease",
};