"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQCard from "../../../components/AQCard";

// Final UI type (what your component uses)
type Reading = {
  aqi: number;
  date: string;
  stations: {
    station_name: string;
    lat: number;
    lon: number;
  };
};

// Supabase raw response type
type SupabaseReading = {
  aqi: number;
  date: string;
  stations: {
    station_name: string;
    lat: number;
    lon: number;
  };
};

export default function Home() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("aq_readings")
        .select(`
          aqi,
          date,
          stations (
            station_name,
            lat,
            lon
          )
        `)
        .order("date", { ascending: false });

      // ✅ Proper error logging
      if (error) {
        console.error("SUPABASE ERROR:", JSON.stringify(error, null, 2));
        setLoading(false);
        return;
      }

      if (!data) {
        console.log("No data found");
        setLoading(false);
        return;
      }

      console.log("RAW DATA:", data); // debug

      // ✅ Safe mapping (avoid crashes if stations is empty)
      const formatted: Reading[] = (data as any[])
      .filter((r) => r.stations) // just check exists
      .map((r) => ({
        aqi: r.aqi,
        date: r.date,
        stations: r.stations, // no [0]
      }));

      setReadings(formatted);
      setLoading(false);
    }

    fetchData();
  }, []);

  // ✅ Loading UI
  if (loading) {
    return <p className="p-4">Loading AQI data...</p>;
  }

  return (
    <main className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {readings.length === 0 ? (
        <p>No AQI data available</p>
      ) : (
        readings.map((r) => (
          <AQCard
            key={`${r.stations.station_name}-${r.date}`}
            station_name={r.stations.station_name}
            aqi={r.aqi}
            date={r.date}
          />
        ))
      )}
    </main>
  );
}