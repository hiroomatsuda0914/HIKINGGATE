import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TABLES = ['prefecture', 'area', 'trailheads']
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'db_snapshot')

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    for (const table of TABLES) {
        const { data, error } = await supabase.from(table).select('*')
        if (error) { console.error(`❌ ${table}:`, error.message); continue }
        fs.writeFileSync(path.join(OUTPUT_DIR, `${table}.json`), JSON.stringify(data, null, 2), 'utf-8')
        console.log(`✓ ${table}: ${data?.length}件`)
    }

    fs.writeFileSync(
        path.join(OUTPUT_DIR, '_meta.json'),
        JSON.stringify({ fetched_at: new Date().toISOString(), tables: TABLES }, null, 2),
        'utf-8'
    )
}

main().catch(err => {
    console.error('Error fetching DB snapshot:', err)
    process.exit(1)
})