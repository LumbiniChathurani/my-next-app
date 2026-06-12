// /lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// --- Database 1
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: "sb-client-1" },
});

// --- Database 2
const SUPABASE_URL_2 = process.env.NEXT_PUBLIC_SUPABASE_URL_2!;
const SUPABASE_ANON_KEY_2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_2!;

export const supabase_2 = createClient(SUPABASE_URL_2, SUPABASE_ANON_KEY_2, {
  auth: { storageKey: "sb-client-2" },
});

