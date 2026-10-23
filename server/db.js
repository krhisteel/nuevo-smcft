// Acceso a la base Oracle (esquema SMCFT en Oracle Cloud).
// Usa node-oracledb en modo "Thin" (JavaScript puro, sin Instant Client),
// por lo que funciona en Vercel.
import oracledb from 'oracledb'

// Columnas CHAR(1) 'S'/'N' del modelo que se exponen como booleanos
const BOOLEANAS = new Set(['activo', 'exitoso', 'requiereDeclaracion', 'aprobado', 'enviada', 'leida', 'accesoWeb', 'vencido', 'excedeLimite'])
// Columnas DATE que representan solo un día
const SOLO_FECHA = new Set(['fechaNacimiento', 'fechaEmision', 'fechaVencimiento', 'fecha'])

const pad = (n) => String(n).padStart(2, '0')
const toCamel = (s) => s.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())

// Oracle Cloud guarda SYSTIMESTAMP en UTC: las fechas con hora se envían en ISO con "Z"
// para que el navegador las muestre en la hora local del usuario.
function formatearFecha(d, soloFecha) {
  const dia = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (soloFecha) return dia
  return `${dia}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}Z`
}

function normalizarFila(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const col = toCamel(k)
    if (v instanceof Date) out[col] = formatearFecha(v, SOLO_FECHA.has(col))
    else if (BOOLEANAS.has(col) && (v === 'S' || v === 'N')) out[col] = v === 'S'
    else out[col] = v
  }
  return out
}

let poolPromise = null

function crearPool() {
  const faltan = ['ORACLE_USER', 'ORACLE_PASSWORD', 'ORACLE_CONNECT_STRING'].filter((v) => !process.env[v])
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno de Oracle: ${faltan.join(', ')}`)
  }
  const schema = (process.env.ORACLE_SCHEMA || 'SMCFT').replace(/[^\w$#]/g, '')
  const config = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 0,
    poolMax: Number(process.env.ORACLE_POOL_MAX || 4),
    poolIncrement: 1,
    // Todas las consultas apuntan al esquema SMCFT aunque se conecte otro usuario
    sessionCallback: (conn, _tag, done) => {
      conn.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${schema}`).then(() => done(), done)
    },
  }
  // Wallet de Autonomous Database (solo si la base exige mTLS)
  if (process.env.ORACLE_WALLET_PEM) {
    config.walletContent = process.env.ORACLE_WALLET_PEM.replace(/\\n/g, '\n')
    config.walletPassword = process.env.ORACLE_WALLET_PASSWORD
  }
  return oracledb.createPool(config)
}

function pool() {
  if (!poolPromise) {
    poolPromise = Promise.resolve().then(crearPool).catch((err) => {
      poolPromise = null
      throw err
    })
  }
  return poolPromise
}

// Funciones de consulta sobre una conexión. autoCommit=false dentro de transacciones.
function cliente(conn, autoCommit) {
  const execute = (sql, binds = {}) =>
    conn.execute(sql, binds, { autoCommit, outFormat: oracledb.OUT_FORMAT_OBJECT })

  const query = async (sql, binds) => ((await execute(sql, binds)).rows || []).map(normalizarFila)

  return {
    execute,
    query,
    queryOne: async (sql, binds) => (await query(sql, binds))[0] || null,

    // Siguiente id libre. Con secuencia la avanza hasta superar el máximo
    // (mismo criterio que siguiente_id del script 03_datos_prueba.sql);
    // las tablas sin secuencia usan MAX + 1.
    nextId: async (tabla, columna, secuencia) => {
      const { rows: [[max]] } = await conn.execute(`SELECT NVL(MAX(${columna}), 0) FROM ${tabla}`)
      if (!secuencia) return max + 1
      for (let i = 0; i < 1000; i++) {
        const { rows: [[id]] } = await conn.execute(`SELECT ${secuencia}.NEXTVAL FROM DUAL`)
        if (id > max) return id
      }
      throw new Error(`La secuencia ${secuencia} está muy atrasada respecto de ${tabla}`)
    },
  }
}

async function conConexion(fn) {
  const conn = await (await pool()).getConnection()
  try {
    return await fn(conn)
  } finally {
    await conn.close()
  }
}

// Consultas sueltas (cada una con autocommit)
export const query = (sql, binds) => conConexion((c) => cliente(c, true).query(sql, binds))
export const queryOne = (sql, binds) => conConexion((c) => cliente(c, true).queryOne(sql, binds))
export const execute = (sql, binds) => conConexion((c) => cliente(c, true).execute(sql, binds))

// Ejecuta fn dentro de una transacción. fn recibe { query, queryOne, execute, nextId }.
export function transaction(fn) {
  return conConexion(async (conn) => {
    try {
      const result = await fn(cliente(conn, false))
      await conn.commit()
      return result
    } catch (err) {
      await conn.rollback()
      throw err
    }
  })
}

export const OUT_NUMBER = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
export const sn = (v) => (v === true || v === 'S' || v === 'true' ? 'S' : 'N')
