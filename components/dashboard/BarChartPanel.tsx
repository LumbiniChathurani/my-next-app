"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { useMemo } from "react";
import { type Reading, getAQIColor } from "../../lib/fetchAQData";

type Props = {
  readings: Reading[];
  metric: "aqi_overall" | "pm25" | "pm10";
  metricLabel: string;
};

export default function BarChartPanel({ readings, metric, metricLabel }: Props) {
  const data = useMemo(() => {
    const byStation: Record<string, { sum: number; count: number; source: string }> = {};
    for (const r of readings) {
      const val = r[metric] as number | null;
      if (val === null) continue;
      if (!byStation[r.station_name]) {
        byStation[r.station_name] = { sum: 0, count: 0, source: r.source };
      }
      byStation[r.station_name].sum   += val;
      byStation[r.station_name].count += 1;
    }
    return Object.entries(byStation)
      .map(([name, { sum, count, source }]) => ({
        name: name.length > 18 ? name.slice(0, 18) + "…" : name,
        fullName: name,
        avg: Math.round((sum / count) * 10) / 10,
        source,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [readings, metric]);

  return (
    <div style={card}>
      <div style={cardHeader}>
        <h2 style={cardTitle}>Station Comparison — Avg {metricLabel}</h2>
        <span style={badge}>{data.length} stations</span>
      </div>

      {data.length === 0 ? (
        <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "12px", color: "#1e293b" }}
              cursor={{ fill: "#f1f5f9" }}
              formatter={(value, _, props: any) => {
                const num = typeof value === "number" ? value : Number(value);
                return [`${num} (${props?.payload?.source ?? ""})`, metricLabel] as [string, string];
              }}
              labelFormatter={(_: any, payload: readonly any[]) => payload?.[0]?.payload?.fullName ?? ""}
            />
            <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={metric === "aqi_overall" ? getAQIColor(entry.avg) : (entry.source === "purpleair" ? "#a855f7" : "#3b82f6")}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  backgroundColor: "#ffffff", borderRadius: "16px",
  padding: "24px", border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
const cardHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "20px",
};
const cardTitle: React.CSSProperties = {
  fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: 0,
};
const badge: React.CSSProperties = {
  fontSize: "12px", color: "#64748b",
  backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "999px",
};