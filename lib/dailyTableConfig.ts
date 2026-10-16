import { supabase_2 } from "./supabaseClient";

const CONFIG_ID = "daily_table";

// ── Shared station selection (readable by everyone, writable only by the admin) ──

/** Returns the saved station ids, or null if the admin hasn't saved a selection yet. */
export async function fetchSelectedStationIds(): Promise<number[] | null> {
  const { data, error } = await supabase_2
    .from("daily_table_config")
    .select("selected_station_ids")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (error) throw error;
  return (data?.selected_station_ids as number[] | null) ?? null;
}

/** Saves the selection for everyone. Pass null to go back to the automatic default. */
export async function saveSelectedStationIds(ids: number[] | null): Promise<void> {
  const { error } = await supabase_2.from("daily_table_config").upsert({
    id: CONFIG_ID,
    selected_station_ids: ids,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Admin session ─────────────────────────────────────────────────────────────

export async function adminSignIn(email: string, password: string): Promise<void> {
  const { error } = await supabase_2.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function adminSignOut(): Promise<void> {
  await supabase_2.auth.signOut();
}

/** Calls cb(true/false) now and whenever the sign-in state changes. Returns an unsubscribe function. */
export function subscribeAdminSession(cb: (signedIn: boolean) => void): () => void {
  supabase_2.auth.getSession().then(({ data }) => cb(!!data.session));
  const { data } = supabase_2.auth.onAuthStateChange((_event, session) => cb(!!session));
  return () => data.subscription.unsubscribe();
}