// /components/AQITable.tsx
"use client";

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

  // 4. Color function (reuse AQCard logic)
  const getColorClass = (aqi: number) => {
    if (aqi <= 50) return 'bg-green-600';
    if (aqi <= 100) return '#FFEA00';
    if (aqi <= 150) return '#FFA500';
    if (aqi <= 200) return 'bg-red-200';
    if (aqi <= 300) return 'bg-purple-200';
    return 'bg-red-900';
  };

  return (
    <div className="p-4 overflow-x-auto">
      <table className="table-auto border border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-2">Station / Date</th>
            {dates.map((date) => (
              <th key={date} className="border p-2">
                {new Date(date).toLocaleDateString()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => (
            <tr key={station}>
              <td className="border p-2 font-bold">{station}</td>
              {dates.map((date) => {
                const key = `${station}-${date}`;
                return (
                  <td
                    key={key}
                    className={`border p-2 text-center ${
                      dataMap[key] !== undefined &&
                      !getColorClass(dataMap[key]).startsWith('#')
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}