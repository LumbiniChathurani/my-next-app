import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("Running at:", new Date().toISOString());

  const API_KEY = Deno.env.get("IQAIR_API_KEY");

  try {
    const res = await fetch(
      `https://api.airvisual.com/v2/city?city=Colombo&state=Western&country=Sri%20Lanka&key=${API_KEY}`
    );

    const data = await res.json();

    const aqi = data.data.current.pollution.aqius;

    await supabase.from("aq_hourly_temp").insert({
      station_id: 1,
      aqi: aqi,
      timestamp: new Date().toISOString()
    });

    console.log("Inserted AQI:", aqi);

    return new Response("Success");
  } catch (err) {
    console.error(err);
    return new Response("Error");
  }
});
