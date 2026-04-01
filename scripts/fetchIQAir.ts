import 'dotenv/config';
import { supabase } from "./supabaseClient";

const API_KEY = process.env.IQAIR_API_KEY;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));


async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "success") return data;

    console.log(`Retrying... (${i + 1}/${retries})`);
    await sleep(2000);
  }
  return null;
}

const cities = [
  { city: "Akurana", state: "Central", country: "Sri Lanka", lat: 7.3928, lon: 80.6178 },
  { city: "Digana", state: "Central", country: "Sri Lanka", lat: 7.2970, lon: 80.7600 },
  { city: "Nuwara Eliya", state: "Central", country: "Sri Lanka", lat: 6.9708, lon: 80.7829 },
  { city: "Dambulla", state: "Central", country: "Sri Lanka", lat: 7.4863, lon: 80.3623 },

  { city: "Colombo", state: "Western", country: "Sri Lanka", lat: 6.9271, lon: 79.8612 },
  { city: "Battaramulla", state: "Western", country: "Sri Lanka", lat: 6.8990, lon: 79.9230 },
  { city: "Gampaha", state: "Western", country: "Sri Lanka", lat: 7.0860, lon: 79.9990 },

  { city: "Kurunegala", state: "North Western", country: "Sri Lanka", lat: 7.4867, lon: 80.3647 },
  { city: "Anuradhapura", state: "North Central", country: "Sri Lanka", lat: 8.3114, lon: 80.4037 },
  { city: "Jaffna", state: "Northern", country: "Sri Lanka", lat: 9.6615, lon: 80.0255 },

  { city: "Batticaloa", state: "Eastern", country: "Sri Lanka", lat: 7.7170, lon: 81.7000 },
  { city: "Galle", state: "Southern", country: "Sri Lanka", lat: 6.0535, lon: 80.2210 },

  { city: "Ratnapura", state: "Sabaragamuwa", country: "Sri Lanka", lat: 6.6828, lon: 80.3992 },
  { city: "Bandarawela", state: "Uva", country: "Sri Lanka", lat: 6.8289, lon: 80.9870 }
];

async function fetchIQAir() {
  for (const place of cities) {
    try {
      const url = `http://api.airvisual.com/v2/nearest_city?lat=${place.lat}&lon=${place.lon}&key=${API_KEY}`;

      let data: any = await fetchWithRetry(url);

      if (!data) {
        console.log(`⚠️ Falling back to nearest_city for ${place.city}`);
      
        const fallbackUrl = `http://api.airvisual.com/v2/nearest_city?lat=${place.lat}&lon=${place.lon}&key=${API_KEY}`;
      
        data = await fetchWithRetry(fallbackUrl);
      
        if (!data) {
          console.log(`❌ No data for ${place.city} even after fallback`);
          continue;
        }
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
    await sleep(4000); // wait 2 seconds before next request
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