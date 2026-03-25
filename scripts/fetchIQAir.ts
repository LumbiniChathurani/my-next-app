import 'dotenv/config';
import { supabase } from "./supabaseClient";

const API_KEY = process.env.IQAIR_API_KEY;

const cities = [
  { city: "Akurana", state: "Central", country: "Sri Lanka" },
  { city: "Digana", state: "Central", country: "Sri Lanka" },
  { city: "Nuwara Eliya", state: "Central", country: "Sri Lanka" },
  { city: "Kurunegala", state: "North Western", country: "Sri Lanka" },
  { city: "Mirihana", state: "Western", country: "Sri Lanka" },
  { city: "Negombo", state: "Western", country: "Sri Lanka" }
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
}

fetchIQAir();