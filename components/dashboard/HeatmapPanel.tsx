"use client";

import React, { useMemo } from "react";
import { type Reading, getAQIColor } from "../../lib/fetchAQData";

type Props = {
  readings: Reading[];
  metric: "aqi_overall" | "pm25" | "pm10";
  metricLabel: string;
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS  = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

function interpolateColor(value: number, min: number, max: number): string {
  if (max === min) return "#3b82f6";
  const t = (value - min) / (max - min);
  if (t < 0.33) {
    const s = t / 0.33;
    return `rgb(${Math.round(30 + s * 20)}, ${Math.round(100 + s * 90)}, ${Math.round(200 - s * 50)})`;
  }
  if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return `rgb(${Math.round(50 + s * 200)}, ${Math.round(190 - s * 10)}, ${Math.round(150 - s * 130)})`;
  }
  const s = (t - 0.66) / 0.34;
  return `rgb(${Math.round(250)}, ${Math.round(180 - s * 150)}, ${Math.round(20 - s * 10)})`;
}

export default function HeatmapPanel({ readings, metric, metricLabel }: Props) {
  const { grid, min, max } = useMemo(() => {
    const acc: Record<number, Record<number, { sum: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) {
      acc[d] = {};
      for (let h = 0; h < 24; h++) acc[d][h] = { sum: 0, count: 0 };
    }

    for (const r of readings) {
      const val = r[metric] as number | null;
      if (val === null) continue;
      try {
        const dt   = new Date(r.timestamp);
        const day  = dt.getDay();
        const hour = dt.getHours();
        acc[day][hour].sum   += val;
        acc[day][hour].count += 1;
      } catch { /* skip */ }
    }

    const avgs: Record<number, Record<number, number | null>> = {};
    let min = Infinity, max = -Infinity;
    for (let d = 0; d < 7; d++) {
      avgs[d] = {};
      for (let h = 0; h < 24; h++) {
        const { sum, count } = acc[d][h];
        if (count === 0) { avgs[d][h] = null; continue; }
        const v = sum / count;
        avgs[d][h] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    return { grid: avgs, min, max };
  }, [readings, metric]);

  const hasData = min !== Infinity;

  return (
    <div style={card}>
      <div style={cardHeader}>
        <h2 style={cardTitle}>Heatmap — Avg {metricLabel} by Hour &amp; Day</h2>
        <span style={badge}>all stations combined</span>
      </div>

      {!hasData ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
          No data available for heatmap
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(24, 1fr)`, gap: "2px", minWidth: "700px" }}>

            {/* Hour labels */}
            <div />
            {HOURS.map((h) => (
              <div key={h} style={{ fontSize: "9px", color: "#94a3b8", textAlign: "center", paddingBottom: "4px" }}>
                {h.split(":")[0]}
              </div>
            ))}

            {/* Rows */}
            {DAYS.map((day, d) => (
              <React.Fragment key={day}>
                <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", paddingRight: "8px", fontWeight: "500" }}>
                  {day}
                </div>
                {HOURS.map((_, h) => {
                  const val = grid[d][h];
                  const bg  = val !== null ? interpolateColor(val, min, max) : "#e2e8f0";
                  return (
                    <div
                      key={`${d}-${h}`}
                      title={val !== null ? `${day} ${HOURS[h]}: ${Math.round(val)}` : "No data"}
                      style={{
                        height: "28px",
                        borderRadius: "4px",
                        backgroundColor: bg,
                        opacity: val !== null ? 0.9 : 0.4,
                        cursor: "default",
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Colour scale legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>{Math.round(min)}</span>
            <div style={{
              flex: 1, height: "8px", borderRadius: "4px",
              background: "linear-gradient(to right, rgb(30,100,200), rgb(50,190,150), rgb(250,180,20), rgb(250,30,10))",
            }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>{Math.round(max)}</span>
          </div>
        </div>
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