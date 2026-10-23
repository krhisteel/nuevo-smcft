// Búsquedas comunes entre módulos.
import { queryOne } from './db.js'
import { badRequest, notFound, toId } from './http.js'

const RUT_RE = /^\d{7,8}-[\dkK]$/

export function normalizarRut(rut) {
  const limpio = String(rut || '').replace(/\./g, '').trim().toUpperCase()
  if (!RUT_RE.test(limpio)) throw badRequest(`RUT inválido: ${rut} (formato 12345678-9)`)
  return limpio
}

// Devuelve el ID_PERSONA de un RUT o lanza error
export async function personaPorRut(rut, db = { queryOne }) {
  const r = normalizarRut(rut)
  const p = await db.queryOne('SELECT ID_PERSONA AS id, FECHA_NACIMIENTO FROM PERSONA WHERE RUT = :r', { r })
  if (!p) throw badRequest(`No existe una persona registrada con RUT ${r}`)
  return p
}

export async function vehiculoPorPatente(patente, db = { queryOne }) {
  const v = await db.queryOne('SELECT ID_VEHICULO AS id FROM VEHICULO WHERE PATENTE = UPPER(:p)', { p: String(patente).trim() })
  if (!v) throw badRequest(`No existe un vehículo registrado con patente ${patente}`)
  return v
}

// Funcionario asociado al usuario conectado (null si no es funcionario)
export async function funcionarioDe(req, db = { queryOne }) {
  if (!req.user?.idPersona) return null
  return db.queryOne('SELECT ID_FUNCIONARIO AS id FROM FUNCIONARIO WHERE ID_PERSONA = :p', { p: req.user.idPersona })
}

// Verifica que exista una fila y devuelve su id numérico
export async function existe(tabla, columna, id, etiqueta, db = { queryOne }) {
  const n = toId(id)
  const row = await db.queryOne(`SELECT ${columna} AS id FROM ${tabla} WHERE ${columna} = :id`, { id: n })
  if (!row) throw notFound(`${etiqueta} no encontrado (id ${id})`)
  return n
}
