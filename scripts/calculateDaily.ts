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
}

calculateDailyAverage();