// /components/AQITable.tsx
"use client";

import { useEffect, useRef, useState } from "react";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // 1. Get unique dates sorted (oldest first)
  const dates = Array.from(new Set(readings.map((r) => r.date))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // 2. Get unique station names
  const stations = Array.from(
    new Set(readings.map((r) => r.stations.station_name))
  );

  // 3. Create lookup map for AQI
  const dataMap: Record<string, number> = {};
  readings.forEach((r) => {
    const key = `${r.stations.station_name}-${r.date}`;
    dataMap[key] = Math.round(r.aqi); // round AQI
  });

  const weeklyAvgMap: Record<string, number> = {};

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
  
      const containerWidth = containerRef.current.offsetWidth;
  
      // ✅ FIX: use real rendered width
      const tableWidth = tableRef.current.getBoundingClientRect().width;
  
      // ✅ Add correction factor
      const newScale = (containerWidth / tableWidth) * 0.95;
  
      // ✅ Clamp scale
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

  // 4. Color function (reuse AQCard logic)
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
    width: "fit-content", // ✅ important
  }}
>

<h3 className="text-xl font-bold mb-4 text-cyan-600 flex justify-center">
  Weekly Air Quality Card
</h3>

<div className="mb-4 inline-block bg-slate-100 border-cyan-600 border-2 text-cyan-700 px-4 py-2 rounded-md text-sm font-medium">
  {dateRange}
</div>

<table className="table-fixed border border-collapse text-[10px] sm:text-xs bg-slate-100 min-w-max">
    <thead>
      <tr>
        <th className="border p-2 w-40">Station / Date</th>

        {dates.map((date) => (
          <th key={date} className="border p-2 w-24">
            {new Date(date).toLocaleDateString()}
          </th>
        ))}

       {/* GAP */}
  <th className="w-6"></th>

{/* Weekly Average Header */}
<th className="border p-2 w-32">Weekly AQI</th>

      </tr>
    </thead>

    <tbody>
  {/* Station Rows */}
  {stations.map((station) => (
    <tr key={station}>
      {/* Station Name */}
      <td className="border p-2 font-bold w-40">
        {station}
      </td>

      {/* Daily AQI Cells */}
      {dates.map((date) => {
        const key = `${station}-${date}`;
        return (
          <td
            key={key}
            className={`border text-center w-24 ${
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
      <td className="w-6"></td>

      {/* Weekly Average */}
      <td
        className={`border text-center w-32 font-semibold ${
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
    <td colSpan={dates.length + 3} className="h-4"></td>
  </tr>

  {/* Daily AQI Row */}
  <tr>
    {/* Label */}
    <td className="border p-2 font-bold bg-slate-200">
      Daily AQI
    </td>

    {/* Daily averages */}
    {dates.map((date) => (
      <td
        key={date}
        className={`border text-center w-24 font-semibold ${
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
    <td className="w-6"></td>

    {/* Empty under Weekly Avg */}
    <td className="border"></td>
  </tr>
</tbody>
  </table>

  <div className="mt-9 border border-gray-300 bg-slate-100 rounded-md p-4 inline-flex flex-wrap gap-4 items-center">
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