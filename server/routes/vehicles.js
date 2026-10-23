// /api/v1/vehicles y /api/v1/vehicles/documentos (antes VehicleService).
import { Router } from 'express'
import { query, queryOne } from '../db.js'
import {
  h, badRequest, notFound, findById, insert, update, remove, required, toId,
  filterRoutes,
} from '../http.js'
import { verificarUsuarioActivo } from './users.js'

const ESTADOS = ['EN_TERRITORIO_NACIONAL', 'FUERA_DEL_PAIS', 'ADMISION_TEMPORAL']

// Usado por ingresos, cruces y sanidad para validar la patente
export async function obtenerVehiculoPorPatente(patente) {
  const v = await queryOne('SELECT * FROM vehicles WHERE patente = UPPER($1)', [patente])
  if (!v) throw badRequest(`El vehículo con patente ${patente} no existe en el sistema`)
  return v
}

export async function cambiarEstadoVehiculo(patente, nuevoEstado, q = query) {
  if (!ESTADOS.includes(nuevoEstado)) {
    throw badRequest(`Estado inválido. Debe ser: ${ESTADOS.join(', ')}`)
  }
  const [vehiculo] = await q('SELECT * FROM vehicles WHERE patente = UPPER($1)', [patente])
  if (!vehiculo) throw notFound(`Vehículo no encontrado con patente: ${patente}`)
  return update('vehicles', vehiculo.id, { estado: nuevoEstado }, q)
}

// ---------------- Documentos ----------------
export const documentsRouter = Router()

documentsRouter.get('/', h(() => query('SELECT * FROM vehicle_documents ORDER BY id ASC')))
documentsRouter.get('/proximos-a-vencer', h(() => query(
  `SELECT * FROM vehicle_documents
   WHERE vigente = TRUE AND fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
   ORDER BY fecha_vencimiento ASC`)))
documentsRouter.get('/vencidos', h(() => query(
  'SELECT * FROM vehicle_documents WHERE vigente = TRUE AND fecha_vencimiento < CURRENT_DATE ORDER BY fecha_vencimiento ASC')))
filterRoutes(documentsRouter, 'vehicle_documents', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/vehiculo/:vehicleId': { where: 'vehicle_id = $1' },
  '/vehiculo/:vehicleId/vigentes': { where: 'vehicle_id = $1 AND vigente = TRUE' },
  '/vehiculo/:vehicleId/ordenados': { where: 'vehicle_id = $1', order: 'fecha_vencimiento ASC' },
})
documentsRouter.get('/:id', h((req) => findById('vehicle_documents', req.params.id, 'Documento')))

documentsRouter.post('/', h(async (req) => {
  required(req.body, ['vehicleId', 'tipo', 'numero', 'fechaVencimiento'])
  const { vehicleId, tipo, numero, fechaVencimiento } = req.body
  await findById('vehicles', vehicleId, 'Vehículo')
  if (await queryOne('SELECT id FROM vehicle_documents WHERE numero = $1', [numero])) {
    throw badRequest(`Ya existe un documento con el número: ${numero}`)
  }
  return insert('vehicle_documents', { vehicleId: toId(vehicleId), tipo, numero, fechaVencimiento, vigente: true })
}, 201))

documentsRouter.put('/:id', h(async (req) => {
  const doc = await findById('vehicle_documents', req.params.id, 'Documento')
  return update('vehicle_documents', doc.id, { tipo: req.body.tipo, fechaVencimiento: req.body.fechaVencimiento })
}))

documentsRouter.patch('/:id/invalidar', h(async (req) => {
  const doc = await findById('vehicle_documents', req.params.id, 'Documento')
  return update('vehicle_documents', doc.id, { vigente: false })
}))

documentsRouter.delete('/:id', h((req) => remove('vehicle_documents', req.params.id, 'Documento')))

// ---------------- Vehículos ----------------
const router = Router()

router.get('/', h((req) => {
  if (req.query.rutPropietario) {
    return query('SELECT * FROM vehicles WHERE rut_propietario = $1 ORDER BY id ASC', [req.query.rutPropietario])
  }
  return query('SELECT * FROM vehicles ORDER BY id ASC')
}))

router.get('/patente/:patente', h(async (req) => {
  const v = await queryOne('SELECT * FROM vehicles WHERE patente = UPPER($1)', [req.params.patente])
  if (!v) throw notFound(`Vehículo no encontrado con patente: ${req.params.patente}`)
  return v
}))

router.patch('/patente/:patente/estado', h((req) =>
  cambiarEstadoVehiculo(req.params.patente, req.query.nuevoEstado || req.body?.nuevoEstado)))

router.get('/anio/rango', h((req) => {
  required(req.query, ['desde', 'hasta'])
  return query('SELECT * FROM vehicles WHERE anio BETWEEN $1 AND $2 ORDER BY anio ASC', [req.query.desde, req.query.hasta])
}))

router.get('/buscar', h((req) =>
  query('SELECT * FROM vehicles WHERE UPPER(marca) LIKE UPPER($1) ORDER BY id ASC', [`%${req.query.marca || ''}%`])))

filterRoutes(router, 'vehicles', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/propietario/:rut': { where: 'rut_propietario = $1' },
  '/propietario/:rut/ordenado': { where: 'rut_propietario = $1', order: 'anio DESC' },
  '/propietario/:rut/estado/:estado': { where: 'rut_propietario = $1 AND estado = $2' },
  '/estado/:estado': { where: 'estado = $1' },
  '/tipo/:tipo': { where: 'tipo_vehiculo = $1' },
  '/anio/desde/:anio': { where: 'anio >= $1', order: 'anio ASC' },
})

router.get('/:id', h((req) => findById('vehicles', req.params.id, 'Vehículo')))

function validarAnio(anio) {
  const n = Number(anio)
  if (!Number.isInteger(n)) throw badRequest('El año debe ser un número entero')
  const actual = new Date().getFullYear()
  if (n > actual) throw badRequest(`El año del vehículo no puede ser mayor al año actual: ${actual}`)
  return n
}

router.post('/', h(async (req) => {
  required(req.body, ['patente', 'marca', 'modelo', 'anio', 'tipoVehiculo', 'rutPropietario'])
  const { patente, marca, modelo, tipoVehiculo, rutPropietario } = req.body
  if (await queryOne('SELECT id FROM vehicles WHERE patente = UPPER($1)', [patente])) {
    throw badRequest(`Ya existe un vehículo con la patente: ${patente}`)
  }
  const anio = validarAnio(req.body.anio)
  await verificarUsuarioActivo(rutPropietario, 'propietario')
  return insert('vehicles', {
    patente: patente.toUpperCase(), marca, modelo, anio, tipoVehiculo, rutPropietario,
    estado: 'EN_TERRITORIO_NACIONAL',
  })
}, 201))

router.put('/:id', h(async (req) => {
  const v = await findById('vehicles', req.params.id, 'Vehículo')
  const { marca, modelo, tipoVehiculo, estado } = req.body
  if (estado && !ESTADOS.includes(estado)) throw badRequest(`Estado inválido. Debe ser: ${ESTADOS.join(', ')}`)
  return update('vehicles', v.id, {
    marca, modelo, tipoVehiculo, estado: estado || undefined,
    anio: req.body.anio !== undefined ? validarAnio(req.body.anio) : undefined,
  })
}))

router.delete('/:id', h((req) => remove('vehicles', req.params.id, 'Vehículo')))

export default router
