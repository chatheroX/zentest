
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // Assuming you will generate this

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
