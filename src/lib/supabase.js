import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://blxetfhukshbsutnawrp.supabase.co'
const supabaseKey = 'sb_publishable_3HsIBVqDa59CyC6leMjZBw_DVoVVXPD'

export const supabase = createClient(supabaseUrl, supabaseKey)
