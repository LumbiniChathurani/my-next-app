"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQDataViewer from "../../../components/AQDataViewer";

type StationKey =
  | "akurana_av_outdoor"
  | "digana"
  | "akurana_pa"
  | "akurana_av_downstairs";

const stationMap: Record<StationKey, string> = {
  akurana_av_outdoor: "Akurana AV Outdoor",
  digana: "Digana",
  akurana_pa: "Akurana PA",
  akurana_av_downstairs: "Akurana AV Downstairs",
};

type AQRow = {
  date: string;
  akurana_av_outdoor: number | string;
  digana: number | string;
  akurana_pa: number | string;
  akurana_av_downstairs: number | string;
};

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export default function AQTrendsPage() {
  const [selectedStation, setSelectedStation] =
    useState<StationKey>("akurana_av_outdoor");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [chartData, setChartData] = useState<{ date: string; aqi: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const [latestData, setLatestData] = useState<Record<StationKey, number | null>>({
    akurana_av_outdoor: null,
    digana: null,
    akurana_pa: null,
    akurana_av_downstairs: null,
  });
  const [latestDate, setLatestDate] = useState("");

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("aq_data_akurana_digana")
        .select("date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs")
        .order("date", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return;
      const row = data[0] as AQRow;
      setLatestDate(row.date);
      setLatestData({
        akurana_av_outdoor: row.akurana_av_outdoor !== "-" && row.akurana_av_outdoor !== null ? Number(row.akurana_av_outdoor) : null,
        digana: row.digana !== "-" && row.digana !== null ? Number(row.digana) : null,
        akurana_pa: row.akurana_pa !== "-" && row.akurana_pa !== null ? Number(row.akurana_pa) : null,
        akurana_av_downstairs: row.akurana_av_downstairs !== "-" && row.akurana_av_downstairs !== null ? Number(row.akurana_av_downstairs) : null,
      });
    };
    fetchLatest();
  }, []);

  const fetchChartData = useCallback(async () => {
    if (!fromDate || !toDate) {
      alert("Please select both dates first");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("aq_data_akurana_digana")
      .select("date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    setLoading(false);

    if (error || !data) {
      console.error(error);
      return;
    }

    const rows = data as AQRow[];
    const formatted = rows.map((row) => {
      const value = row[selectedStation];
      return {
        date: row.date,
        aqi: value !== null && value !== "-" ? Number(value) : null,
      };
    });

    setChartData(formatted);
  }, [fromDate, toDate, selectedStation]);

  // Re-fetch when station changes if dates already set
  useEffect(() => {
    if (fromDate && toDate) {
      fetchChartData();
    }
  }, [selectedStation]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadCSV = () => {
    if (chartData.length === 0) {
      alert("No data to download");
      return;
    }
    const headers = ["Date", "AQI"];
    const rows = chartData.map((row) => [row.date, row.aqi !== null ? row.aqi : ""]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stationMap[selectedStation]}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const recentRows = [...chartData].reverse().slice(0, 10);

  const validAQIValues = chartData
    .filter((d) => d.aqi !== null)
    .map((d) => d.aqi as number);

  const avgAQI =
    validAQIValues.length > 0
      ? Math.round(validAQIValues.reduce((sum, v) => sum + v, 0) / validAQIValues.length)
      : null;
  const maxAQI = validAQIValues.length > 0 ? Math.max(...validAQIValues) : null;
  const minAQI = validAQIValues.length > 0 ? Math.min(...validAQIValues) : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: "40px 16px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937", margin: "0 0 8px 0" }}>
            Air Quality Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
            Akurana &amp; Digana Monitoring Stations
          </p>
        </div>

        {/* Latest Cards */}
        <div>
          <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "12px" }}>
            Latest update {latestDate ? `— ${latestDate}` : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {(Object.keys(stationMap) as StationKey[]).map((key) => {
              const val = latestData[key];
              const color = val !== null ? getAQIColor(val) : "#9ca3af";
              const label = val !== null ? getAQILabel(val) : "N/A";
              const isSelected = selectedStation === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStation(key)}
                  style={{
                    backgroundColor: "#ffffff",
                    border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
                    borderRadius: "16px",
                    padding: "20px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "border-color 0.15s",
                  }}
                >
                  <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {stationMap[key]}
                  </p>
                  <p style={{ fontSize: "32px", fontWeight: "700", color, margin: "0 0 10px 0", lineHeight: 1 }}>
                    {val !== null ? val : "—"}
                  </p>
                  <span style={{ fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px", backgroundColor: color + "22", color }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "16px" }}>
            Filter Data
          </p>

          {/* Station select */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "6px" }}>
              Station
            </label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value as StationKey)}
              style={{ width: "100%", maxWidth: "300px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", backgroundColor: "#f9fafb", color: "#374151" }}
            >
              {Object.entries(stationMap).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date pickers + buttons in a row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "6px" }}>
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", backgroundColor: "#f9fafb", color: "#374151" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "6px" }}>
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", backgroundColor: "#f9fafb", color: "#374151" }}
              />
            </div>

            <button
              onClick={fetchChartData}
              disabled={loading}
              style={{
                backgroundColor: loading ? "#93c5fd" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Loading..." : "Generate Chart"}
            </button>

            <button
              onClick={downloadCSV}
              style={{
                backgroundColor: "#ffffff",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {chartData.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { label: "Average AQI", value: avgAQI },
              { label: "Max AQI", value: maxAQI },
              { label: "Min AQI", value: minAQI },
            ].map(({ label, value }) => (
              <div key={label} style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "10px" }}>
                  {label}
                </p>
                <p style={{ fontSize: "32px", fontWeight: "700", color: value !== null ? getAQIColor(value) : "#9ca3af", margin: 0 }}>
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#374151", margin: 0 }}>
              {stationMap[selectedStation]} — AQI Trend
            </h2>
            {chartData.length > 0 && (
              <span style={{ fontSize: "12px", color: "#9ca3af", backgroundColor: "#f3f4f6", padding: "4px 12px", borderRadius: "999px" }}>
                {chartData.length} days
              </span>
            )}
          </div>

          {chartData.length > 0 ? (
            <AQDataViewer
            data={chartData.filter(
              (d): d is { date: string; aqi: number } => d.aqi !== null
            )}
              stationName={stationMap[selectedStation]}
              fromDate={fromDate}
              toDate={toDate}
            />
          ) : (
            <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #e5e7eb", borderRadius: "12px", color: "#d1d5db", fontSize: "14px" }}>
              Select a date range and click Generate Chart
            </div>
          )}
        </div>

        {/* Recent Data Table */}
        {chartData.length > 0 && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#374151", margin: "0 0 16px 0" }}>
              Recent Readings
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                    <th style={{ textAlign: "left", padding: "8px 16px 12px 0", fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "8px 16px 12px 0", fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>AQI</th>
                    <th style={{ textAlign: "left", padding: "8px 0 12px 0", fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((row, i) => {
                    const color = row.aqi !== null ? getAQIColor(row.aqi) : "#9ca3af";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td style={{ padding: "12px 16px 12px 0", color: "#6b7280", fontFamily: "monospace", fontSize: "13px" }}>
                          {row.date}
                        </td>
                        <td style={{ padding: "12px 16px 12px 0", fontWeight: "700", fontSize: "16px", color }}>
                          {row.aqi !== null ? row.aqi : "—"}
                        </td>
                        <td style={{ padding: "12px 0" }}>
                          <span style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "999px", fontWeight: "600", backgroundColor: color + "22", color }}>
                            {row.aqi !== null ? getAQILabel(row.aqi) : "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AQI Legend */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "12px" }}>
            AQI Scale
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { range: "0–50", label: "Good", color: "#22c55e" },
              { range: "51–100", label: "Moderate", color: "#eab308" },
              { range: "101–150", label: "Unhealthy (Sensitive)", color: "#f97316" },
              { range: "151–200", label: "Unhealthy", color: "#ef4444" },
              { range: "201–300", label: "Very Unhealthy", color: "#a855f7" },
              { range: "301+", label: "Hazardous", color: "#7f1d1d" },
            ].map(({ range, label, color }) => (
              <div
                key={range}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", padding: "6px 12px", borderRadius: "999px", backgroundColor: color + "22", color }}
              >
                <span>{range}</span>
                <span style={{ fontWeight: "400" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
