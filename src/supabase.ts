import { createClient } from '@supabase/supabase-js'
import { config } from './config'

// Service-role client: bypasses RLS, so every query MUST filter by user_id itself.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
})
