// Utilidades compartidas por todos los módulos de la API.
import { query, queryOne } from './db.js'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const badRequest = (msg) => new HttpError(400, msg)
export const notFound = (msg) => new HttpError(404, msg)

// Envuelve un handler async: lo que retorne se envía como JSON.
// Si retorna undefined se responde 204 (sin contenido).
export const h = (fn, status = 200) => async (req, res, next) => {
  try {
    const result = await fn(req, res)
    if (res.headersSent) return
    if (result === undefined) res.status(204).end()
    else res.status(status).json(result)
  } catch (err) {
    next(err)
  }
}

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

// Valida que los campos obligatorios vengan con valor.
export function required(body, fields) {
  const faltantes = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '')
  if (faltantes.length) throw badRequest(`Campos obligatorios: ${faltantes.join(', ')}`)
}

export const toId = (v) => {
  const n = Number(v)
  if (!Number.isInteger(n)) throw badRequest(`Identificador inválido: ${v}`)
  return n
}

export async function findById(table, id, label) {
  const row = await queryOne(`SELECT * FROM ${table} WHERE id = $1`, [toId(id)])
  if (!row) throw notFound(`${label} no encontrado con id: ${id}`)
  return row
}

export async function insert(table, data, q = query) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined)
  const cols = keys.map(toSnake).join(', ')
  const vals = keys.map((_, i) => `$${i + 1}`).join(', ')
  const rows = await q(`INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`, keys.map((k) => data[k]))
  return rows[0]
}

export async function update(table, id, data, q = query) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined)
  if (!keys.length) return queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id])
  const sets = keys.map((k, i) => `${toSnake(k)} = $${i + 1}`).join(', ')
  const rows = await q(
    `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
    [...keys.map((k) => data[k]), id],
  )
  return rows[0]
}

export async function remove(table, id, label) {
  const rows = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [toId(id)])
  if (!rows.length) throw notFound(`${label} no encontrado con id: ${id}`)
}

// Registra rutas GET de filtro simples a partir de una tabla de definiciones:
//   { '/estado/:estado': { where: 'estado = $1', order: 'id DESC', limit: 10 } }
// Los parámetros de la ruta se pasan en el orden en que aparecen.
export function filterRoutes(router, table, defs) {
  for (const [path, def] of Object.entries(defs)) {
    const names = [...path.matchAll(/:(\w+)/g)].map((m) => m[1])
    router.get(path, h(async (req) => {
      const params = names.map((n) => req.params[n])
      const where = def.where ? `WHERE ${def.where}` : ''
      const order = `ORDER BY ${def.order || 'id ASC'}`
      const limit = def.limit ? `LIMIT ${def.limit}` : ''
      return query(`SELECT * FROM ${table} ${where} ${order} ${limit}`, params)
    }))
  }
}

// Registra rutas GET de conteo: devuelven { <campo>: valor, total: n }.
export function countRoutes(router, table, defs) {
  for (const [path, column] of Object.entries(defs)) {
    const name = path.match(/:(\w+)/)[1]
    router.get(path, h(async (req) => {
      const row = await queryOne(
        `SELECT COUNT(*)::int AS total FROM ${table} WHERE ${column} = $1`,
        [req.params[name]],
      )
      return { [name]: req.params[name], total: row.total }
    }))
  }
}

// Ruta GET /fechas?desde=...&hasta=... sobre una columna de fecha.
export function dateRangeRoute(router, table, column) {
  router.get('/fechas', h(async (req) => {
    required(req.query, ['desde', 'hasta'])
    return query(
      `SELECT * FROM ${table} WHERE ${column} BETWEEN $1 AND $2 ORDER BY ${column} ASC`,
      [req.query.desde, req.query.hasta],
    )
  }))
}

// Ruta GET /buscar?<param>=texto (búsqueda parcial sin distinguir mayúsculas).
export function searchRoute(router, table, column, param = 'texto') {
  router.get('/buscar', h(async (req) => {
    const texto = req.query[param] ?? req.query.texto ?? ''
    return query(`SELECT * FROM ${table} WHERE ${column} ILIKE $1 ORDER BY id ASC`, [`%${texto}%`])
  }))
}

// Rechaza fechas futuras. Se tolera la diferencia horaria del navegador
// (el cliente envía su hora local sin zona horaria).
export function assertNotFuture(fecha, message) {
  if (!fecha) return
  const value = Date.parse(fecha)
  if (Number.isNaN(value)) throw badRequest(`Fecha inválida: ${fecha}`)
  if (value > Date.now() + 14 * 3600 * 1000) throw badRequest(message)
}

// Normaliza fechas que vienen del cliente ("2025-01-01T10:00:00.000Z" o sin zona).
export const toTimestamp = (v) => (v ? String(v).replace('Z', '').split('.')[0] : v)
