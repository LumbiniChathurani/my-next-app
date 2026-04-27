"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

import { useRef } from "react";
import html2canvas from "html2canvas";
import { FiDownload } from "react-icons/fi";

type Props = {
  data: { date: string; aqi: number }[];
};

export default function AQIChart({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  

  const downloadChart = async () => {
    if (!chartRef.current) return;

    const canvas = await html2canvas(chartRef.current);
    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = image;
    link.download = "aqi-chart.png";
    link.click();
  };

  return (
    <div
      ref={chartRef}
      className="bg-white p-4 rounded-lg shadow-md mt-20 ml-16 mr-16 relative"
    >
      {/* 🔽 Download Button */}
      <button
        onClick={downloadChart}
        className="absolute top-3 right-3 p-2 bg-cyan-600 text-white rounded-full shadow hover:bg-cyan-700"
      >
        <FiDownload size={18} />
      </button>

      <h2 className="text-center font-semibold mb-4">
        AQI Trend
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <ReferenceArea y1={0} y2={50} fill="#16a34a" fillOpacity={0.3} />
          <ReferenceArea y1={50} y2={100} fill="#fde047" fillOpacity={0.3} />
          <ReferenceArea y1={100} y2={150} fill="#f97316" fillOpacity={0.3} />
          <ReferenceArea y1={150} y2={200} fill="#dc2626" fillOpacity={0.3} />
          <ReferenceArea y1={200} y2={300} fill="#7e22ce" fillOpacity={0.3} />

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 300]} />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="aqi"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}