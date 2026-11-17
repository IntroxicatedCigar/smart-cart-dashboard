import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mqdiyicizmyjnvvwftsv.supabase.co'
const supabaseAnonKey = 'sb_publishable_-ZAm49DLd35qjs7-dlVRNA_N68ujdhD'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)