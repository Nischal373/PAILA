import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Supabase environment variables are missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

if (supabaseServiceRoleKey.startsWith("sb_publishable_")) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. Replace it with the Service Role key from Supabase settings to allow server inserts."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

export const potholeBucket =
  process.env.SUPABASE_STORAGE_BUCKET ?? "pothole-images";
