// Run raw SQL against Supabase using the REST SQL endpoint
// Usage: node scripts/run-sql.mjs <path-to-sql-file>

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const sqlFile = process.argv[2]
if (!sqlFile) { console.error('Usage: node scripts/run-sql.mjs <file.sql>'); process.exit(1) }

const sql = readFileSync(resolve(process.cwd(), sqlFile), 'utf-8')
console.log(`Running: ${sqlFile}\n`)

// Use Supabase's pg_net / REST SQL endpoint
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
})

// If RPC doesn't work, try individual statements via raw pg
if (!response.ok) {
    console.log('Direct RPC not available, running statements individually...\n')

    // Split on semicolons but keep them, filter empty/comments
    const statements = sql
        .split(/;[\s]*\n/)
        .map(s => s.trim())
        .filter(s => s && !s.match(/^--/))

    for (const stmt of statements) {
        const cleanStmt = stmt.replace(/^--.*$/gm, '').trim()
        if (!cleanStmt) continue

        console.log(`→ ${cleanStmt.slice(0, 80)}...`)

        // Use the Supabase query endpoint
        const r = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ sql_text: cleanStmt }),
        })

        if (r.ok) {
            console.log('  ✅ Success')
        } else {
            const err = await r.text()
            console.log(`  ❌ ${err}`)
        }
    }
} else {
    console.log('✅ Migration executed successfully')
}
