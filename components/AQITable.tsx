// /components/AQITable.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { FiDownload } from "react-icons/fi";

type Reading = {
  aqi: number;
  date: string;
  stations: {
    station_name: string;
    lat: number;
    lon: number;
  };
};

type AQITableProps = {
  readings: Reading[];
};

export default function AQITable({ readings }: AQITableProps) {

  const downloadImage = async () => {
    if (!tableRef.current) return;
  
    const buttons = tableRef.current.querySelectorAll("button");
    buttons.forEach((btn) => (btn.style.display = "none"));
  
    const dataUrl = await toPng(tableRef.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
  
    buttons.forEach((btn) => (btn.style.display = "block"));
  
    const link = document.createElement("a");
    link.download = "aq-card.png";
    link.href = dataUrl;
    link.click();
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const dates = Array.from(new Set(readings.map((r) => r.date))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const stations = Array.from(
    new Set(readings.map((r) => r.stations.station_name))
  );

  const dataMap: Record<string, number> = {};
  readings.forEach((r) => {
    const key = `${r.stations.station_name}-${r.date}`;
    dataMap[key] = Math.round(r.aqi);
  });

  const weeklyAvgMap: Record<string, number> = {};

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
  
      const containerWidth = containerRef.current.offsetWidth;
      const tableWidth = tableRef.current.getBoundingClientRect().width;
      const newScale = (containerWidth / tableWidth) * 0.95;
      setScale(Math.max(0.4, Math.min(newScale, 1)));
    };
  
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  stations.forEach((station) => {
    let sum = 0;
    let count = 0;

    dates.forEach((date) => {
      const key = `${station}-${date}`;
      if (dataMap[key] !== undefined) {
        sum += dataMap[key];
        count++;
      }
    });

    weeklyAvgMap[station] = count > 0 ? Math.round(sum / count) : 0;
  });

  const dailyAvgMap: Record<string, number> = {};

  dates.forEach((date) => {
    let sum = 0;
    let count = 0;

    stations.forEach((station) => {
      const key = `${station}-${date}`;
      if (dataMap[key] !== undefined) {
        sum += dataMap[key];
        count++;
      }
    });

    dailyAvgMap[date] = count > 0 ? Math.round(sum / count) : 0;
  });

  const getColorClass = (aqi: number) => {
    if (aqi <= 50) return 'bg-green-600';
    if (aqi <= 100) return '#FFEA00';
    if (aqi <= 150) return '#FFA500';
    if (aqi <= 200) return 'bg-red-600';
    if (aqi <= 300) return 'bg-purple-600';
    return 'bg-red-900';
  };

  const aqiScale = [
    { label: 'Good (0-50)', color: 'bg-green-600' },
    { label: 'Moderate (51-100)', color: 'bg-yellow-400' },
    { label: 'Unhealthy for Sensitive (101-150)', color: 'bg-orange-500' },
    { label: 'Unhealthy (151-200)', color: 'bg-red-600' },
    { label: 'Very Unhealthy (201-300)', color: 'bg-purple-600' },
    { label: 'Hazardous (301+)', color: 'bg-red-900' },
  ];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const dateRange =
    dates.length > 0
      ? `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`
      : '';

  return (
    <div className="p-4 flex justify-center">
      <div className="w-full">
        <div ref={containerRef} className="w-full flex justify-center overflow-hidden">
          <div
            ref={tableRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: "fit-content",
            }}
          >
           

        <header style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, backgroundColor: "#ffffff", zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e", marginLeft: "-20px"}} />
          <span style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "0.02em", color: "#0f172a" }}>Weekly Air Quality Card</span>
        </div>
      </header>

            <div className="mb-4 mt-4 inline-block bg-slate-100 border-cyan-600 border-2 text-cyan-700 px-4 py-2 rounded-md text-sm font-medium">
              {dateRange}
            </div>

            <table className="table-fixed border border-collapse text-[10px] bg-slate-100 min-w-max">
              <thead>
                <tr>
                  {/* Station column */}
                  <th className="border p-2 w-32 text-left align-bottom">Station / Date</th>

                  {/* Date header cells — rotated 45deg, smaller */}
                  {dates.map((date) => (
                    <th
                      key={date}
                      className="border w-10 h-16 text-center align-bottom overflow-visible"
                    >
                      <div
                        style={{
                          transform: "rotate(-45deg)",
                          transformOrigin: "bottom center",
                          whiteSpace: "nowrap",
                          fontSize: "10px",
                          paddingBottom: "20px",
                          paddingLeft: "25px",
                        }}
                      >
                        {new Date(date).toLocaleDateString()}
                      </div>
                    </th>
                  ))}

                  {/* GAP */}
                  <th className="w-4"></th>

                  {/* Weekly Average Header — rotated 45deg */}
                  <th className="border w-10 h-16 text-center align-bottom overflow-visible">
                    <div
                      style={{
                        transform: "rotate(-45deg)",
                        transformOrigin: "bottom center",
                        whiteSpace: "nowrap",
                        fontSize: "10px",
                        paddingBottom: "20px",
                        paddingLeft: "25px",
                      }}
                    >
                      Weekly AQI
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* Station Rows */}
                {stations.map((station) => (
                  <tr key={station}>
                    {/* Station Name */}
                    <td className="border p-2 font-bold w-32 text-xs">
                      {station}
                    </td>

                    {/* Daily AQI Cells — small squares, bigger text */}
                    {dates.map((date) => {
                      const key = `${station}-${date}`;
                      return (
                        <td
                          key={key}
                          className={`border text-center align-middle w-10 h-10 text-sm font-bold ${
                            dataMap[key] === undefined
                              ? 'bg-gray-600'
                              : !getColorClass(dataMap[key]).startsWith('#')
                              ? getColorClass(dataMap[key])
                              : ''
                          }`}
                          style={
                            dataMap[key] !== undefined &&
                            getColorClass(dataMap[key]).startsWith('#')
                              ? { backgroundColor: getColorClass(dataMap[key]) }
                              : {}
                          }
                        >
                          {dataMap[key] ?? '-'}
                        </td>
                      );
                    })}

                    {/* GAP */}
                    <td className="w-4"></td>

                    {/* Weekly Average — small square, bigger text */}
                    <td
                      className={`border text-center align-middle w-10 h-10 text-sm font-bold ${
                        weeklyAvgMap[station] === 0
                          ? 'bg-gray-600'
                          : !getColorClass(weeklyAvgMap[station]).startsWith('#')
                          ? getColorClass(weeklyAvgMap[station])
                          : ''
                      }`}
                      style={
                        weeklyAvgMap[station] !== 0 &&
                        getColorClass(weeklyAvgMap[station]).startsWith('#')
                          ? { backgroundColor: getColorClass(weeklyAvgMap[station]) }
                          : {}
                      }
                    >
                      {weeklyAvgMap[station] || '-'}
                    </td>
                  </tr>
                ))}

                {/* GAP ROW */}
                <tr>
                  <td colSpan={dates.length + 3} className="h-3"></td>
                </tr>

                {/* Daily AQI Row */}
                <tr>
                  {/* Label */}
                  <td className="border p-2 font-bold bg-slate-200 text-xs">
                    Daily AQI
                  </td>

                  {/* Daily averages — small squares, bigger text */}
                  {dates.map((date) => (
                    <td
                      key={date}
                      className={`border text-center align-middle w-10 h-10 text-sm font-bold ${
                        dailyAvgMap[date] === 0
                          ? 'bg-gray-600'
                          : !getColorClass(dailyAvgMap[date]).startsWith('#')
                          ? getColorClass(dailyAvgMap[date])
                          : ''
                      }`}
                      style={
                        dailyAvgMap[date] !== 0 &&
                        getColorClass(dailyAvgMap[date]).startsWith('#')
                          ? { backgroundColor: getColorClass(dailyAvgMap[date]) }
                          : {}
                      }
                    >
                      {dailyAvgMap[date] || '-'}
                    </td>
                  ))}

                  {/* GAP */}
                  <td className="w-4"></td>

                  {/* Empty under Weekly Avg */}
                  <td className="border w-10 h-10"></td>
                </tr>
              </tbody>
            </table>

            <button
              onClick={downloadImage}
              className="fixed bottom-16 right-2 p-3 bg-cyan-200 text-black rounded-full shadow-lg hover:bg-cyan-700 transition"
            >
              <FiDownload size={20} />
            </button>

            <div className="mt-5 border border-gray-300 bg-slate-100 rounded-md p-4 inline-flex flex-wrap gap-4 items-center">
              {aqiScale.map((scale) => (
                <div key={scale.label} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 ${scale.color} border border-black`}></div>
                  <span className="text-sm">{scale.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}