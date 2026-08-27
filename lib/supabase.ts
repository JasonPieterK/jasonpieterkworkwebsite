import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Server-only usage — every admin write route already gates on ADMIN_PASSWORD
// before touching this, so the publishable key's open RLS policies are fine.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
