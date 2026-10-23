// /api/v1/vehiculos — tabla VEHICULO.
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, esViajero, texto, toId } from '../http.js'
import { personaPorRut } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']
const TIPOS = ['PARTICULAR', 'DIPLOMATICO', 'COMERCIAL']

const SELECT = `
  SELECT v.ID_VEHICULO AS id, v.PATENTE, v.MARCA, v.MODELO, v.ANIO, v.TIPO_VEHICULO, v.ESTADO,
         p.RUT AS rut_propietario, p.NOMBRES || ' ' || p.APELLIDOS AS propietario,
         (SELECT pa.ESTADO FROM PLAZO_ADMISION pa WHERE pa.ID_VEHICULO = v.ID_VEHICULO
           ORDER BY pa.FECHA_INGRESO DESC FETCH FIRST 1 ROWS ONLY) AS estado_plazo
  FROM VEHICULO v JOIN PERSONA p ON p.ID_PERSONA = v.ID_PERSONA_PROPIETARIO`

router.get('/', h((req) => {
  if (esViajero(req)) {
    return query(`${SELECT} WHERE v.ID_PERSONA_PROPIETARIO = :p ORDER BY v.PATENTE`, { p: req.user.idPersona })
  }
  return query(`${SELECT} ORDER BY v.PATENTE`)
}))

router.get('/:id', h(async (req) => {
  const v = await queryOne(`${SELECT} WHERE v.ID_VEHICULO = :id`, { id: toId(req.params.id) })
  if (!v || (esViajero(req) && v.rutPropietario !== req.user.rut)) throw notFound('Vehículo no encontrado')
  return v
}))

function validar(b) {
  required(b, ['patente', 'marca', 'modelo', 'anio', 'tipoVehiculo', 'rutPropietario'])
  const anio = Number(b.anio)
  if (!Number.isInteger(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) throw badRequest('Año inválido')
  const tipo = String(b.tipoVehiculo).toUpperCase()
  if (!TIPOS.includes(tipo)) throw badRequest(`Tipo de vehículo inválido. Debe ser: ${TIPOS.join(', ')}`)
  return {
    patente: String(b.patente).replace(/[\s-]/g, '').toUpperCase(),
    marca: texto(b.marca), modelo: texto(b.modelo), anio, tipo,
    estado: (texto(b.estado) || 'ACTIVO').toUpperCase(),
  }
}

router.post('/', permitir(...EDITORES), h(async (req) => {
  const d = validar(req.body)
  const id = await transaction(async (db) => {
    const prop = await personaPorRut(req.body.rutPropietario, db)
    const nuevo = await db.nextId('VEHICULO', 'ID_VEHICULO', 'SEQ_VEHICULO')
    await db.execute(
      `INSERT INTO VEHICULO (ID_VEHICULO, PATENTE, MARCA, MODELO, ANIO, TIPO_VEHICULO, ID_PERSONA_PROPIETARIO, ESTADO)
       VALUES (:id, :patente, :marca, :modelo, :anio, :tipo, :prop, :estado)`,
      { id: nuevo, ...d, prop: prop.id })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE v.ID_VEHICULO = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const d = validar(req.body)
  const r = await transaction(async (db) => {
    const prop = await personaPorRut(req.body.rutPropietario, db)
    return db.execute(
      `UPDATE VEHICULO SET PATENTE = :patente, MARCA = :marca, MODELO = :modelo, ANIO = :anio,
              TIPO_VEHICULO = :tipo, ID_PERSONA_PROPIETARIO = :prop, ESTADO = :estado
       WHERE ID_VEHICULO = :id`, { id, ...d, prop: prop.id })
  })
  if (!r.rowsAffected) throw notFound('Vehículo no encontrado')
  return queryOne(`${SELECT} WHERE v.ID_VEHICULO = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM VEHICULO WHERE ID_VEHICULO = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Vehículo no encontrado')
}))

export default router
