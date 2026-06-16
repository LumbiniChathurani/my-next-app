"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { type Reading } from "../../lib/fetchAQData";

type Props = { readings: Reading[] };

const CATEGORY_COLORS: Record<string, string> = {
  "Good":                              "#22c55e",
  "Moderate":                          "#eab308",
  "Unhealthy for Sensitive Groups":    "#f97316",
  "Unhealthy":                         "#ef4444",
  "Very Unhealthy":                    "#a855f7",
  "Hazardous":                         "#7f1d1d",
};

export default function PieChartPanel({ readings }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of readings) {
      const cat = r.aqi_category ?? "Unknown";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [readings]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={card}>
      <div style={cardHeader}>
        <h2 style={cardTitle}>AQI Category Distribution</h2>
        <span style={badge}>{total.toLocaleString()} readings</span>
      </div>

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? "#94a3b8"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "12px", color: "#1e293b" }}
              formatter={(value) => {
                const num = typeof value === "number" ? value : Number(value);
                return [`${num} (${((num / total) * 100).toFixed(1)}%)`, "Readings"] as [string, string];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#64748b" }}
              formatter={(value) => <span style={{ color: CATEGORY_COLORS[value] ?? "#64748b" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
      No category data available
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