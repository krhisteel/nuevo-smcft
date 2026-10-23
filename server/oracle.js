// Backend Oracle Database (Oracle Cloud / Autonomous Database).
// Usa node-oracledb en modo "Thin" (JavaScript puro, sin Instant Client),
// por lo que funciona en Vercel.
//
// Las consultas del monolito se escriben con placeholders $1, $2... y literales
// TRUE/FALSE; aquí se traducen a binds de Oracle (:b1, :b2...) y a 1/0,
// porque las columnas booleanas se guardan como NUMBER(1).
import oracledb from 'oracledb'

const BOOLEANOS = new Set(['activo', 'exitoso', 'vigente', 'requiere_declaracion', 'aprobado', 'enviada', 'leida'])
const SOLO_FECHA = new Set(['fecha_vencimiento'])

const pad = (n) => String(n).padStart(2, '0')

// Fecha devuelta por Oracle -> "YYYY-MM-DDTHH:mm:ss" (misma salida que con PostgreSQL)
function formatearFecha(d, soloFecha) {
  const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return soloFecha ? fecha : `${fecha}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizarFila(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const col = k.toLowerCase()
    if (v instanceof Date) out[col] = formatearFecha(v, SOLO_FECHA.has(col))
    else if (BOOLEANOS.has(col) && typeof v === 'number') out[col] = v === 1
    else out[col] = v
  }
  return out
}

export function traducir(sql, params, outId) {
  const text = sql
    .replace(/\$(\d+)/g, ':b$1')
    .replace(/\bTRUE\b/g, '1')
    .replace(/\bFALSE\b/g, '0')
  const binds = {}
  let outName = null
  params.forEach((v, i) => {
    const name = `b${i + 1}`
    if (v === outId) {
      binds[name] = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      outName = name
    } else if (typeof v === 'boolean') binds[name] = v ? 1 : 0
    else binds[name] = v === undefined ? null : v
  })
  return { text, binds, outName }
}

async function ejecutar(conn, sql, params, outId, autoCommit) {
  const { text, binds, outName } = traducir(sql, params, outId)
  const result = await conn.execute(text, binds, { autoCommit, outFormat: oracledb.OUT_FORMAT_OBJECT })
  if (outName) return { rows: [{ id: result.outBinds[outName][0] }] }
  return { rows: (result.rows || []).map(normalizarFila) }
}

export async function createOracleBackend(outId) {
  const config = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 0,
    poolMax: Number(process.env.ORACLE_POOL_MAX || 3),
    poolIncrement: 1,
    // Cada sesión trabaja en hora de Chile y con formatos ISO para las fechas
    sessionCallback: (conn, _tag, done) => {
      conn.execute(
        `ALTER SESSION SET TIME_ZONE = 'America/Santiago'
           NLS_DATE_FORMAT = 'YYYY-MM-DD'
           NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS'`,
      ).then(() => done(), done)
    },
  }
  // Wallet de Autonomous Database (solo si la base exige mTLS)
  if (process.env.ORACLE_WALLET_PEM) {
    config.walletContent = process.env.ORACLE_WALLET_PEM.replace(/\\n/g, '\n')
    config.walletPassword = process.env.ORACLE_WALLET_PASSWORD
  }
  const pool = await oracledb.createPool(config)

  const conUna = async (fn) => {
    const conn = await pool.getConnection()
    try {
      return await fn(conn)
    } finally {
      await conn.close()
    }
  }

  return {
    query: (sql, params = []) => conUna((conn) => ejecutar(conn, sql, params, outId, true)),
    transaction: (fn) => conUna(async (conn) => {
      try {
        const result = await fn((sql, params = []) => ejecutar(conn, sql, params, outId, false))
        await conn.commit()
        return result
      } catch (err) {
        await conn.rollback()
        throw err
      }
    }),
  }
}
