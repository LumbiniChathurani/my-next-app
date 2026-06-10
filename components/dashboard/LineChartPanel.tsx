"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceArea,
} from "recharts";
import { useMemo } from "react";
import { type Reading, type Period, getAQIColor } from "../../lib/fetchAQData";

type Props = {
  readings: Reading[];
  metric: "aqi_overall" | "pm25" | "pm10";
  metricLabel: string;
  period: Period;
};

// Distinct colours for up to 21 stations
const PALETTE = [
  "#3b82f6","#a855f7","#22c55e","#f97316","#ef4444",
  "#eab308","#06b6d4","#ec4899","#14b8a6","#f59e0b",
  "#6366f1","#84cc16","#fb923c","#e879f9","#34d399",
  "#fbbf24","#60a5fa","#c084fc","#4ade80","#f87171","#a3e635",
];

function formatTimestamp(ts: string, period: Period): string {
  try {
    const d = new Date(ts);
    if (period === "1day")  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    if (period === "1hour") return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

export default function LineChartPanel({ readings, metric, metricLabel, period }: Props) {
  const { chartData, stationNames } = useMemo(() => {
    const names = Array.from(new Set(readings.map((r) => r.station_name)));
    // Group by timestamp, pivot stations as columns
    const byTs: Record<string, Record<string, number | null>> = {};
    for (const r of readings) {
      const ts = r.timestamp;
      if (!byTs[ts]) byTs[ts] = { __ts: ts as any };
      byTs[ts][r.station_name] = (r[metric] as number | null) ?? null;
    }
    const data = Object.values(byTs).sort((a, b) =>
      new Date(a.__ts as any).getTime() - new Date(b.__ts as any).getTime()
    );
    return { chartData: data, stationNames: names };
  }, [readings, metric]);

  const showAQIBands = metric === "aqi_overall";

  return (
    <div style={card}>
      <div style={cardHeader}>
        <h2 style={cardTitle}>{metricLabel} — Over Time</h2>
        <span style={badge}>{readings.length.toLocaleString()} readings</span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          {showAQIBands && <>
            <ReferenceArea y1={0}   y2={50}  fill="#22c55e" fillOpacity={0.06} />
            <ReferenceArea y1={50}  y2={100} fill="#eab308" fillOpacity={0.06} />
            <ReferenceArea y1={100} y2={150} fill="#f97316" fillOpacity={0.06} />
            <ReferenceArea y1={150} y2={200} fill="#ef4444" fillOpacity={0.06} />
            <ReferenceArea y1={200} y2={300} fill="#a855f7" fillOpacity={0.06} />
          </>}
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
          <XAxis
            dataKey="__ts"
            tickFormatter={(v) => formatTimestamp(v, period)}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e2433" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e2433" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#151923", border: "1px solid #2d3748", borderRadius: "10px", fontSize: "12px" }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            labelFormatter={(v) => formatTimestamp(v, period)}
          />
          <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8", paddingTop: "12px" }} />
          {stationNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const card: React.CSSProperties = {
  backgroundColor: "#151923", borderRadius: "16px",
  padding: "24px", border: "1px solid #1e2433",
};
const cardHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "20px",
};
const cardTitle: React.CSSProperties = {
  fontSize: "14px", fontWeight: "600",
  color: "#e2e8f0", margin: 0,
};
const badge: React.CSSProperties = {
  fontSize: "12px", color: "#64748b",
  backgroundColor: "#1e2433", padding: "4px 10px", borderRadius: "999px",
};