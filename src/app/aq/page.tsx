"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQITable from "../../../components/AQITable";

type Reading = {
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
        .select(`aqi,date,stations(station_name,lat,lon)`)
        .order("date", { ascending: false });

      if (error) {
        console.error("SUPABASE ERROR:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const formatted = (data as any[])
        .filter((r) => r.stations)
        .map((r) => ({
          aqi: r.aqi,
          date: r.date,
          stations: r.stations,
        }));

      // ✅ Filter for only past 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);

      const past7Days = formatted.filter(
        (r) => new Date(r.date) >= sevenDaysAgo
      );

      setReadings(past7Days);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <p className="p-4">Loading AQI data...</p>;

  return <AQITable readings={readings} />;
}