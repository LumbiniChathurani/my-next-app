"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQIChart from "../../../components/AQIChart";

export default function AQTrendsPage() {
  const [stations, setStations] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<any[]>([]);

  // ✅ Fetch chart data
  const fetchChartData = async () => {
    if (!selectedStation || !fromDate || !toDate) {
      alert("Please select station and date range");
      return;
    }

    const { data, error } = await supabase
      .from("aq_readings")
      .select("aqi, date, stations(station_name)")
      .order("date", { ascending: true });

    console.log("RAW DATA:", data);
    console.log("ERROR:", error);

    if (error || !data) return;

    // ✅ Filter in frontend (safe + reliable)
    const filtered = data
      .filter((r: any) => r.stations?.station_name === selectedStation)
      .filter((r: any) => {
        const d = new Date(r.date);
        return d >= new Date(fromDate) && d <= new Date(toDate + "T23:59:59");
      });

    const formatted = filtered.map((r: any) => ({
      date: new Date(r.date).toLocaleDateString(),
      aqi: r.aqi,
    }));

    setData(formatted);
  };

  // ✅ Fetch stations
  useEffect(() => {
    async function fetchStations() {
      const { data } = await supabase
        .from("stations")
        .select("station_name");

      if (data) {
        const names = data.map((s) => s.station_name);
        setStations(names);
        setSelectedStation(names[0] || "");
      }
    }

    fetchStations();
  }, []);

  return (
    <div className="p-10 max-w-4xl mx-auto bg-slate-100 rounded-lg h-96">
  
      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-10">
        AQI Trends Chart
      </h1>
  
      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-6 mb-10 mt-10">
  
        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          className="border px-4 py-2 rounded min-w-[180px]"
        >
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
  
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border px-4 py-2 rounded"
        />
  
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border px-4 py-2 rounded"
        />
  
        <button
          onClick={fetchChartData}
          className="bg-blue-600 text-black px-6 py-2 rounded"
        >
          Generate Chart
        </button>
  
      </div>
  
      {/* Chart */}
      <div className="mt-6">
        {data.length > 0 && <AQIChart data={data} />}
      </div>
  
    </div>
  );
}