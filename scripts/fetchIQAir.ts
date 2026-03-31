import 'dotenv/config';
import { supabase } from "./supabaseClient";

const API_KEY = process.env.IQAIR_API_KEY;

const cities = [
  { city: "Akurana", state: "Central", country: "Sri Lanka" },
  { city: "Digana", state: "Central", country: "Sri Lanka" },
  { city: "Nuwara Eliya", state: "Central", country: "Sri Lanka" },
  { city: "Dambulla", state: "Central", country: "Sri Lanka" },          // reported in Central area ranking :contentReference[oaicite:1]{index=1}
  { city: "Nawalapitiya", state: "Central", country: "Sri Lanka" },      // reported in Central area ranking :contentReference[oaicite:2]{index=2}
  { city: "Kandy", state: "Central", country: "Sri Lanka" },             // reported in Central area ranking :contentReference[oaicite:3]{index=3}
  { city: "Kurunegala", state: "North Western", country: "Sri Lanka" },
  { city: "Mirihana", state: "Western", country: "Sri Lanka" },
  { city: "Colombo", state: "Western", country: "Sri Lanka" },           // major city – widely reported :contentReference[oaicite:4]{index=4}
  { city: "Gampaha", state: "Western", country: "Sri Lanka" },           // included in Western rankings :contentReference[oaicite:5]{index=5}
  { city: "Nugegoda", state: "Western", country: "Sri Lanka" },          // included in Western rankings :contentReference[oaicite:6]{index=6}
  { city: "Battaramulla", state: "Western", country: "Sri Lanka" },       // included in Western rankings :contentReference[oaicite:7]{index=7}
  { city: "Homagama", state: "Western", country: "Sri Lanka" },          // included in Western rankings :contentReference[oaicite:8]{index=8}
  { city: "Pitipana", state: "Western", country: "Sri Lanka" },          // included in Western rankings :contentReference[oaicite:9]{index=9}
  { city: "Negombo", state: "Western", country: "Sri Lanka" },
  { city: "Anuradhapura", state: "North Central", country: "Sri Lanka" }, // appears in national rankings :contentReference[oaicite:10]{index=10}
  { city: "Jaffna", state: "Northern Province", country: "Sri Lanka" },   // appears in national rankings :contentReference[oaicite:11]{index=11}
  { city: "Ambalantota", state: "Southern Province", country: "Sri Lanka" } // from widget source :contentReference[oaicite:12]{index=12}
];

async function fetchIQAir() {
  for (const place of cities) {
    try {
      const response = await fetch(
        `http://api.airvisual.com/v2/city?city=${place.city}&state=${place.state}&country=${place.country}&key=${API_KEY}`
      );

      const data: any = await response.json();

      if (data.status !== "success") {
        console.log(`❌ No data for ${place.city}`);
        continue;
      }

      // 🔹 Station object (STATIC DATA)
      const station = {
        station_id: `iqair_${place.city.toLowerCase().replace(/\s+/g, "_")}`,
        station_name: place.city,
        source: "iqair",
        lat: data.data.location.coordinates[1],
        lon: data.data.location.coordinates[0],
      };

      // 🔹 AQI value (DYNAMIC DATA)
      const aqi = data.data.current.pollution.aqius;

      console.log("Processing:", station.station_name);

      // ✅ 1. UPSERT station
      const { error: stationError } = await supabase
        .from("stations")
        .upsert([station], {
          onConflict: "station_id"
        });

      if (stationError) {
        console.error(`Station Error (${place.city}):`, stationError);
        continue;
      }

      // ✅ 2. INSERT AQI reading
      const { error: aqiError } = await supabase
        .from("aq_hourly_temp")
        .insert([
          {
            station_id: station.station_id,
            aqi: aqi,
            timestamp: new Date().toISOString()
          }
        ]);

      if (aqiError) {
        console.error(`AQI Insert Error (${place.city}):`, aqiError);
      } else {
        console.log(`✅ ${place.city} AQI saved`);
      }

    } catch (error) {
      console.error(`Error (${place.city}):`, error);
    }
  }

  const { data: joinData, error: joinError } = await supabase
  .from("aq_hourly_temp")
  .select(`
    aqi,
    timestamp,
    stations (
      station_name,
      lat,
      lon
    )
  `)
  .limit(5); // 👈 only fetch few rows

if (joinError) {
  console.error("JOIN Error:", joinError);
} else {
  console.log("JOIN TEST:", JSON.stringify(joinData, null, 2));
}
}


fetchIQAir();