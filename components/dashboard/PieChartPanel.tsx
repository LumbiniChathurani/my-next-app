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
                  fill={CATEGORY_COLORS[entry.name] ?? "#64748b"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#151923", border: "1px solid #2d3748", borderRadius: "10px", fontSize: "12px" }}
              formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return [`${num} (${((num / total) * 100).toFixed(1)}%)`, "Readings"] as [string, string];
            }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
              formatter={(value) => <span style={{ color: CATEGORY_COLORS[value] ?? "#94a3b8" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: "13px" }}>
      No category data available
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
  fontSize: "14px", fontWeight: "600", color: "#e2e8f0", margin: 0,
};
const badge: React.CSSProperties = {
  fontSize: "12px", color: "#64748b",
  backgroundColor: "#1e2433", padding: "4px 10px", borderRadius: "999px",
};