import 'dotenv/config';
import { supabase } from "./supabaseClient";

async function calculateDailyAverage() {
  // 1. Get averages
  const { data, error } = await supabase.rpc("calculate_daily_avg");

  if (error) {
    console.error("Error calculating average:", error);
    return;
  }

  console.log("Daily averages inserted:", data);

  // 2. Clear temp table (older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { error: deleteError } = await supabase
    .from("aq_hourly_temp")
    .delete()
    .lt("timestamp", sevenDaysAgo.toISOString());

  if (deleteError) {
    console.error("Error clearing temp table:", deleteError);
  } else {
    console.log("Temp table cleared");
  }
}

calculateDailyAverage();