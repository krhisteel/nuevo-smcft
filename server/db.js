// Capa de acceso a datos del monolito.
// - Con DATABASE_URL usa PostgreSQL real (Neon, Supabase, Vercel Postgres...).
// - Sin DATABASE_URL usa PGlite (Postgres embebido) para desarrollo local.
import { schemaSql } from './schema.js'
import { seed } from './seed.js'

// Los TIMESTAMP se devuelven como "YYYY-MM-DDTHH:mm:ss" (hora local, sin zona),
// igual que LocalDateTime en la versión Java.
const parsers = {
  1114: (v) => (v ? v.replace(' ', 'T').split('.')[0] : v), // timestamp
  1082: (v) => v, // date
  1700: (v) => (v === null ? null : parseFloat(v)), // numeric
  20: (v) => (v === null ? null : parseInt(v, 10)), // int8 (count)
}

let backend = null

async function createBackend() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg')
    for (const [oid, fn] of Object.entries(parsers)) pg.types.setTypeParser(Number(oid), fn)
    const url = process.env.DATABASE_URL
    const local = /localhost|127\.0\.0\.1/.test(url) || process.env.PGSSL === 'disable'
    const pool = new pg.Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
      max: Number(process.env.PG_POOL_MAX || 3),
    })
    return {
      query: (sql, params) => pool.query(sql, params),
      exec: (sql) => pool.query(sql),
      transaction: async (fn) => {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const result = await fn((sql, params) => client.query(sql, params))
          await client.query('COMMIT')
          return result
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      },
    }
  }

  const { PGlite } = await import('@electric-sql/pglite')
  // En Vercel el sistema de archivos es efímero: sin DATABASE_URL se usa memoria.
  const dataDir = process.env.VERCEL ? undefined : (process.env.PGLITE_DIR || './.data/pglite')
  if (process.env.VERCEL) {
    console.warn('[SMCFT] DATABASE_URL no configurada: usando base en memoria (los datos se pierden).')
  }
  if (dataDir && !dataDir.includes('://')) {
    const fs = await import('node:fs')
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const db = new PGlite(dataDir, { parsers })
  return {
    query: (sql, params) => db.query(sql, params),
    exec: (sql) => db.exec(sql),
    transaction: (fn) => db.transaction((tx) => fn((sql, params) => tx.query(sql, params))),
  }
}

let readyPromise = null

// Crea el esquema y los datos iniciales una sola vez por instancia.
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      backend = await createBackend()
      await backend.exec(schemaSql)
      await seed(query)
    })().catch((err) => {
      readyPromise = null
      throw err
    })
  }
  return readyPromise
}

const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

export function camelize(row) {
  if (!row) return row
  const out = {}
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v
  return out
}

function wrap(runner) {
  return async (sql, params = []) => {
    const res = await runner(sql, params)
    return res.rows.map(camelize)
  }
}

// Ejecuta una consulta y devuelve las filas con claves camelCase.
export const query = (sql, params) => wrap(backend.query)(sql, params)

export async function queryOne(sql, params) {
  const rows = await query(sql, params)
  return rows[0] || null
}

// Ejecuta fn dentro de una transacción; fn recibe una función q(sql, params).
export function transaction(fn) {
  return backend.transaction((runner) => fn(wrap(runner)))
}

// Hora actual en Chile como "YYYY-MM-DDTHH:mm:ss".
export function nowLocal(offsetMs = 0) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(Date.now() + offsetMs))
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}
