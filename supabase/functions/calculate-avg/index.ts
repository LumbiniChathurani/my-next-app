import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("Calculating daily averages...");

  const { error } = await supabase.rpc("calculate_daily_avg");

  if (error) {
    console.error(error);
    return new Response("Error");
  }

  return new Response("Daily averages calculated");
});
