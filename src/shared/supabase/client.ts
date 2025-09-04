import { Config } from '@/src/config'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)