import 'dotenv/config';
import { supabase } from "./supabaseClient";

const API_KEY = process.env.IQAIR_API_KEY;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const cities = [
  // Central Province
  { city: "Akurana", state: "Central", country: "Sri Lanka" },
  { city: "Digana", state: "Central", country: "Sri Lanka" },
  { city: "Nuwara Eliya", state: "Central", country: "Sri Lanka" },
  { city: "Dambulla", state: "Central", country: "Sri Lanka" },

  // Western Province
  { city: "Colombo", state: "Western", country: "Sri Lanka" },
  { city: "Battaramulla", state: "Western", country: "Sri Lanka" },
  { city: "Gampaha", state: "Western", country: "Sri Lanka" },

  // North Western Province
  { city: "Kurunegala", state: "North Western", country: "Sri Lanka" },

  // North Central Province
  { city: "Anuradhapura", state: "North Central", country: "Sri Lanka" },

  // Northern Province
  { city: "Jaffna", state: "Northern", country: "Sri Lanka" },

  // Eastern Province
  { city: "Batticaloa", state: "Eastern", country: "Sri Lanka" },

  // Southern Province
  { city: "Galle", state: "Southern", country: "Sri Lanka" },

  // Sabaragamuwa Province
  { city: "Ratnapura", state: "Sabaragamuwa", country: "Sri Lanka" },

  // Uva Province
  { city: "Bandarawela", state: "Uva", country: "Sri Lanka" }
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
    await sleep(2000); // wait 2 seconds before next request
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