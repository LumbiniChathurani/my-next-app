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

      const aqiData = {
        station_name: place.city,
        station_id: `iqair_${place.city.toLowerCase().replace(/\s+/g, "_")}`,
        aqi: data.data.current.pollution.aqius,
        lat: data.data.location.coordinates[1],
        lon: data.data.location.coordinates[0],
      };

      console.log("Saving (TEMP):", aqiData);

      const { error } = await supabase
        .from("aq_hourly_temp") // ✅ CHANGED
        .insert([aqiData]);

      if (error) {
        console.error(`Insert Error (${place.city}):`, error);
      } else {
        console.log(`✅ ${place.city} saved to temp`);
      }

    } catch (error) {
      console.error(`Error (${place.city}):`, error);
    }
  }
}

fetchIQAir();