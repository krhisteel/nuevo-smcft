// /api/v1/entries y /api/v1/entries/items (antes EntryService).
import { Router } from 'express'
import { query, transaction } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required, toId, toTimestamp, assertNotFuture,
  filterRoutes, countRoutes, dateRangeRoute,
} from '../http.js'
import { obtenerVehiculoPorPatente, cambiarEstadoVehiculo } from './vehicles.js'

const TIPOS = ['RETORNO', 'ADMISION_TEMPORAL']

// ---------------- Ítems declarados ----------------
export const entryItemsRouter = Router()

entryItemsRouter.get('/', h(() => query('SELECT * FROM entry_items ORDER BY id ASC')))
entryItemsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM entry_items WHERE UPPER(descripcion) LIKE UPPER($1) ORDER BY id', [`%${req.query.descripcion || req.query.texto || ''}%`])))
filterRoutes(entryItemsRouter, 'entry_items', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/ingreso/:entryId': { where: 'entry_id = $1' },
  '/ingreso/:entryId/aprobados': { where: 'entry_id = $1 AND aprobado = TRUE' },
  '/ingreso/:entryId/no-aprobados': { where: 'entry_id = $1 AND aprobado = FALSE' },
  '/ingreso/:entryId/ordenados': { where: 'entry_id = $1', order: 'valor_usd DESC' },
})
entryItemsRouter.get('/:id', h((req) => findById('entry_items', req.params.id, 'Item')))

entryItemsRouter.post('/', h(async (req) => {
  required(req.body, ['entryId', 'descripcion'])
  const ingreso = await findById('entries', req.body.entryId, 'Ingreso')
  if (ingreso.estado !== 'PENDIENTE') throw badRequest('Solo se pueden agregar items a ingresos en estado PENDIENTE')
  return insert('entry_items', {
    entryId: ingreso.id,
    descripcion: req.body.descripcion,
    cantidad: Number(req.body.cantidad ?? 1),
    valorUsd: Number(req.body.valorUsd ?? 0),
    aprobado: false,
  })
}, 201))

entryItemsRouter.patch('/:id/aprobar', h(async (req) =>
  update('entry_items', (await findById('entry_items', req.params.id, 'Item')).id, { aprobado: true })))
entryItemsRouter.patch('/:id/rechazar', h(async (req) =>
  update('entry_items', (await findById('entry_items', req.params.id, 'Item')).id, { aprobado: false })))
entryItemsRouter.delete('/:id', h((req) => remove('entry_items', req.params.id, 'Item')))

// ---------------- Ingresos ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM entries ORDER BY id ASC')))
dateRangeRoute(router, 'entries', 'fecha_ingreso')
router.get('/buscar', h((req) =>
  query('SELECT * FROM entries WHERE UPPER(pais_origen) LIKE UPPER($1) ORDER BY id', [`%${req.query.pais || req.query.texto || ''}%`])))
filterRoutes(router, 'entries', {
  '/ultimos': { order: 'fecha_ingreso DESC', limit: 10 },
  '/patente/:patente': { where: 'patente = UPPER($1)' },
  '/patente/:patente/ordenados': { where: 'patente = UPPER($1)', order: 'fecha_ingreso DESC' },
  '/patente/:patente/estado/:estado': { where: 'patente = UPPER($1) AND estado = $2' },
  '/conductor/:rut': { where: 'rut_conductor = $1' },
  '/estado/:estado': { where: 'estado = $1' },
  '/tipo/:tipoIngreso': { where: 'tipo_ingreso = $1' },
  '/paso/:pasoFronterizo': { where: 'paso_fronterizo = $1' },
  '/fiscalizador/:rut': { where: 'rut_fiscalizador = $1' },
})
countRoutes(router, 'entries', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/tipo/:tipo': 'tipo_ingreso',
})
router.get('/:id', h((req) => findById('entries', req.params.id, 'Ingreso')))

router.post('/', h(async (req) => {
  required(req.body, ['patente', 'rutConductor', 'paisOrigen', 'pasoFronterizo', 'fechaIngreso', 'tipoIngreso'])
  const { patente, rutConductor, paisOrigen, pasoFronterizo, tipoIngreso, observaciones } = req.body
  if (!TIPOS.includes(tipoIngreso)) throw badRequest(`Tipo de ingreso inválido. Debe ser: ${TIPOS.join(', ')}`)

  const vehiculo = await obtenerVehiculoPorPatente(patente)
  if (tipoIngreso === 'RETORNO' && vehiculo.estado !== 'FUERA_DEL_PAIS') {
    throw badRequest(`Para registrar un RETORNO el vehículo debe estar FUERA_DEL_PAIS. Estado actual: ${vehiculo.estado}`)
  }
  if (tipoIngreso === 'ADMISION_TEMPORAL' && vehiculo.estado === 'FUERA_DEL_PAIS') {
    throw badRequest(`Estado inválido para ADMISION_TEMPORAL. Estado actual: ${vehiculo.estado}`)
  }
  assertNotFuture(req.body.fechaIngreso, 'La fecha de ingreso no puede ser futura')

  return transaction(async (q) => {
    const nuevo = await insert('entries', {
      patente: patente.toUpperCase(), rutConductor, paisOrigen, pasoFronterizo,
      fechaIngreso: toTimestamp(req.body.fechaIngreso), tipoIngreso, estado: 'PENDIENTE',
      observaciones: observaciones || null,
    }, q)
    await cambiarEstadoVehiculo(patente, tipoIngreso === 'RETORNO' ? 'EN_TERRITORIO_NACIONAL' : 'ADMISION_TEMPORAL', q)
    return nuevo
  })
}, 201))

router.put('/:id', h(async (req) => {
  const entry = await findById('entries', req.params.id, 'Ingreso')
  const b = req.body
  if (b.tipoIngreso && !TIPOS.includes(b.tipoIngreso)) throw badRequest(`Tipo de ingreso inválido. Debe ser: ${TIPOS.join(', ')}`)
  return update('entries', entry.id, {
    patente: b.patente ? b.patente.toUpperCase() : undefined,
    rutConductor: b.rutConductor,
    paisOrigen: b.paisOrigen,
    pasoFronterizo: b.pasoFronterizo,
    fechaIngreso: b.fechaIngreso ? toTimestamp(b.fechaIngreso) : undefined,
    tipoIngreso: b.tipoIngreso,
    estado: b.estado || undefined,
    observaciones: b.observaciones,
  })
}))

async function resolver(req, estado) {
  const ingreso = await findById('entries', req.params.id, 'Ingreso')
  const accion = estado === 'AUTORIZADO' ? 'autorizar' : 'rechazar'
  if (ingreso.estado !== 'PENDIENTE') {
    throw badRequest(`Solo se pueden ${accion} ingresos en estado PENDIENTE. Estado actual: ${ingreso.estado}`)
  }
  return transaction(async (q) => {
    if (estado === 'RECHAZADO') {
      // Se revierte el estado del vehículo
      await cambiarEstadoVehiculo(ingreso.patente,
        ingreso.tipoIngreso === 'RETORNO' ? 'FUERA_DEL_PAIS' : 'EN_TERRITORIO_NACIONAL', q)
    }
    return update('entries', ingreso.id, {
      estado,
      rutFiscalizador: req.query.rutFiscalizador || null,
      observaciones: req.query.observaciones || null,
    }, q)
  })
}

router.patch('/:id/autorizar', h((req) => resolver(req, 'AUTORIZADO')))
router.patch('/:id/rechazar', h((req) => resolver(req, 'RECHAZADO')))
router.delete('/:id', h((req) => remove('entries', toId(req.params.id), 'Ingreso')))

export default router
