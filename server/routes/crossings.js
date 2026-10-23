// /api/v1/border-crossings y /api/v1/border-crossings/items (antes BorderCrossingService).
import { Router } from 'express'
import { query, transaction } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required, toTimestamp, assertNotFuture,
  filterRoutes, countRoutes, dateRangeRoute,
} from '../http.js'
import { obtenerVehiculoPorPatente, cambiarEstadoVehiculo } from './vehicles.js'

// ---------------- Ítems del cruce ----------------
export const crossingItemsRouter = Router()

crossingItemsRouter.get('/', h(() => query('SELECT * FROM border_crossing_items ORDER BY id ASC')))
crossingItemsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM border_crossing_items WHERE UPPER(descripcion) LIKE UPPER($1) ORDER BY id',
    [`%${req.query.descripcion || req.query.texto || ''}%`])))
filterRoutes(crossingItemsRouter, 'border_crossing_items', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/cruce/:borderCrossingId': { where: 'border_crossing_id = $1' },
  '/cruce/:borderCrossingId/aprobados': { where: 'border_crossing_id = $1 AND aprobado = TRUE' },
  '/cruce/:borderCrossingId/no-aprobados': { where: 'border_crossing_id = $1 AND aprobado = FALSE' },
  '/cruce/:borderCrossingId/ordenados': { where: 'border_crossing_id = $1', order: 'valor_usd DESC' },
  '/categoria/:categoriaId': { where: 'categoria_id = $1' },
})
crossingItemsRouter.get('/:id', h((req) => findById('border_crossing_items', req.params.id, 'Item')))

crossingItemsRouter.post('/', h(async (req) => {
  required(req.body, ['borderCrossingId', 'categoriaId', 'descripcion'])
  const cruce = await findById('border_crossings', req.body.borderCrossingId, 'Cruce')
  if (cruce.estado !== 'PENDIENTE') throw badRequest('Solo se pueden agregar items a cruces en estado PENDIENTE')
  const categoria = await findById('item_categories', req.body.categoriaId, 'Categoría').catch(() => {
    throw badRequest(`La categoría con id ${req.body.categoriaId} no existe en el sistema`)
  })
  if (!categoria.activo) throw badRequest(`La categoría con id ${categoria.id} está inactiva en el sistema`)
  return insert('border_crossing_items', {
    borderCrossingId: cruce.id,
    categoriaId: categoria.id,
    descripcion: req.body.descripcion,
    cantidad: Number(req.body.cantidad ?? 1),
    valorUsd: Number(req.body.valorUsd ?? 0),
    aprobado: false,
  })
}, 201))

crossingItemsRouter.patch('/:id/aprobar', h(async (req) =>
  update('border_crossing_items', (await findById('border_crossing_items', req.params.id, 'Item')).id, { aprobado: true })))
crossingItemsRouter.patch('/:id/rechazar', h(async (req) =>
  update('border_crossing_items', (await findById('border_crossing_items', req.params.id, 'Item')).id, { aprobado: false })))
crossingItemsRouter.delete('/:id', h((req) => remove('border_crossing_items', req.params.id, 'Item')))

// ---------------- Cruces ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM border_crossings ORDER BY id ASC')))
dateRangeRoute(router, 'border_crossings', 'fecha_cruce')
router.get('/buscar', h((req) =>
  query('SELECT * FROM border_crossings WHERE UPPER(pais_destino) LIKE UPPER($1) ORDER BY id', [`%${req.query.pais || req.query.texto || ''}%`])))
filterRoutes(router, 'border_crossings', {
  '/ultimos': { order: 'fecha_cruce DESC', limit: 10 },
  '/patente/:patente': { where: 'patente = UPPER($1)' },
  '/patente/:patente/ordenados': { where: 'patente = UPPER($1)', order: 'fecha_cruce DESC' },
  '/patente/:patente/estado/:estado': { where: 'patente = UPPER($1) AND estado = $2' },
  '/conductor/:rut': { where: 'rut_conductor = $1' },
  '/estado/:estado': { where: 'estado = $1' },
  '/paso/:pasoFronterizo': { where: 'paso_fronterizo = $1' },
  '/fiscalizador/:rut': { where: 'rut_fiscalizador = $1' },
})
countRoutes(router, 'border_crossings', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/paso/:pasoFronterizo': 'paso_fronterizo',
})
router.get('/:id', h((req) => findById('border_crossings', req.params.id, 'Cruce')))

router.post('/', h(async (req) => {
  required(req.body, ['patente', 'rutConductor', 'paisDestino', 'pasoFronterizo', 'fechaCruce'])
  const { patente, rutConductor, paisDestino, pasoFronterizo, observaciones } = req.body
  const vehiculo = await obtenerVehiculoPorPatente(patente)
  if (vehiculo.estado !== 'EN_TERRITORIO_NACIONAL') {
    throw badRequest(`El vehículo ${patente} no está en territorio nacional. Estado actual: ${vehiculo.estado}`)
  }
  assertNotFuture(req.body.fechaCruce, 'La fecha del cruce no puede ser futura')
  return transaction(async (q) => {
    const nuevo = await insert('border_crossings', {
      patente: patente.toUpperCase(), rutConductor, paisDestino, pasoFronterizo,
      fechaCruce: toTimestamp(req.body.fechaCruce), estado: 'PENDIENTE', observaciones: observaciones || null,
    }, q)
    await cambiarEstadoVehiculo(patente, 'FUERA_DEL_PAIS', q)
    return nuevo
  })
}, 201))

router.put('/:id', h(async (req) => {
  const cruce = await findById('border_crossings', req.params.id, 'Cruce')
  const b = req.body
  return update('border_crossings', cruce.id, {
    patente: b.patente ? b.patente.toUpperCase() : undefined,
    rutConductor: b.rutConductor,
    paisDestino: b.paisDestino,
    pasoFronterizo: b.pasoFronterizo,
    fechaCruce: b.fechaCruce ? toTimestamp(b.fechaCruce) : undefined,
    estado: b.estado || undefined,
    observaciones: b.observaciones,
  })
}))

async function resolver(req, estado) {
  const cruce = await findById('border_crossings', req.params.id, 'Cruce')
  const accion = estado === 'AUTORIZADO' ? 'autorizar' : 'rechazar'
  if (cruce.estado !== 'PENDIENTE') {
    throw badRequest(`Solo se pueden ${accion} cruces en estado PENDIENTE. Estado actual: ${cruce.estado}`)
  }
  return transaction(async (q) => {
    // Si se rechaza, el vehículo vuelve a territorio nacional
    if (estado === 'RECHAZADO') await cambiarEstadoVehiculo(cruce.patente, 'EN_TERRITORIO_NACIONAL', q)
    return update('border_crossings', cruce.id, {
      estado,
      rutFiscalizador: req.query.rutFiscalizador || null,
      observaciones: req.query.observaciones || null,
    }, q)
  })
}

router.patch('/:id/autorizar', h((req) => resolver(req, 'AUTORIZADO')))
router.patch('/:id/rechazar', h((req) => resolver(req, 'RECHAZADO')))
router.delete('/:id', h((req) => remove('border_crossings', req.params.id, 'Cruce')))

export default router
