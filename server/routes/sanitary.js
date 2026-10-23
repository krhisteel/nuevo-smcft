// /api/v1/sanitary y /api/v1/sanitary/items (antes SanitaryService).
import { Router } from 'express'
import { query, queryOne } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required, toTimestamp, assertNotFuture,
  filterRoutes, countRoutes, dateRangeRoute,
} from '../http.js'
import { obtenerVehiculoPorPatente } from './vehicles.js'

const RESULTADOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO']

// ---------------- Ítems inspeccionados ----------------
export const sanitaryItemsRouter = Router()

sanitaryItemsRouter.get('/', h(() => query('SELECT * FROM sanitary_items ORDER BY id ASC')))
sanitaryItemsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM sanitary_items WHERE UPPER(descripcion) LIKE UPPER($1) ORDER BY id', [`%${req.query.descripcion || req.query.texto || ''}%`])))
filterRoutes(sanitaryItemsRouter, 'sanitary_items', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/inspeccion/:sanitaryId': { where: 'inspection_id = $1' },
  '/inspeccion/:sanitaryId/ordenados': { where: 'inspection_id = $1', order: 'descripcion ASC' },
  '/inspeccion/:sanitaryId/resultado/:resultado': { where: 'inspection_id = $1 AND resultado_item = $2' },
  '/resultado/:resultado': { where: 'resultado_item = $1' },
})
sanitaryItemsRouter.get('/estadisticas/rechazados/:sanitaryId', h(async (req) => {
  const row = await queryOne(
    `SELECT COUNT(*) AS total FROM sanitary_items WHERE inspection_id = $1 AND resultado_item = 'RECHAZADO'`,
    [req.params.sanitaryId])
  return { inspectionId: Number(req.params.sanitaryId), total: row.total }
}))
sanitaryItemsRouter.get('/:id', h((req) => findById('sanitary_items', req.params.id, 'Item')))

sanitaryItemsRouter.post('/', h(async (req) => {
  required(req.body, ['inspectionId', 'descripcion'])
  const insp = await findById('sanitary_inspections', req.body.inspectionId, 'Inspección')
  if (insp.resultado !== 'PENDIENTE') throw badRequest('Solo se pueden agregar items a inspecciones PENDIENTES')
  return insert('sanitary_items', {
    inspectionId: insp.id,
    descripcion: req.body.descripcion,
    resultadoItem: req.body.resultadoItem || 'PENDIENTE',
    observaciones: req.body.observaciones || null,
  })
}, 201))

sanitaryItemsRouter.put('/:id', h(async (req) => {
  const item = await findById('sanitary_items', req.params.id, 'Item')
  const { descripcion, resultadoItem, observaciones } = req.body
  return update('sanitary_items', item.id, { descripcion, resultadoItem, observaciones })
}))
sanitaryItemsRouter.delete('/:id', h((req) => remove('sanitary_items', req.params.id, 'Item')))

// ---------------- Inspecciones ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM sanitary_inspections ORDER BY id ASC')))
dateRangeRoute(router, 'sanitary_inspections', 'fecha_inspeccion')
filterRoutes(router, 'sanitary_inspections', {
  '/ultimas': { order: 'fecha_inspeccion DESC', limit: 10 },
  '/pendientes/ordenadas': { where: `resultado = 'PENDIENTE'`, order: 'fecha_inspeccion ASC' },
  '/patente/:patente': { where: 'patente = UPPER($1)' },
  '/patente/:patente/ordenadas': { where: 'patente = UPPER($1)', order: 'fecha_inspeccion DESC' },
  '/patente/:patente/resultado/:resultado': { where: 'patente = UPPER($1) AND resultado = $2' },
  '/conductor/:rut': { where: 'rut_conductor = $1' },
  '/inspector/:rut': { where: 'rut_inspector = $1' },
  '/resultado/:resultado': { where: 'resultado = $1' },
  '/paso/:pasoFronterizo': { where: 'paso_fronterizo = $1' },
})
countRoutes(router, 'sanitary_inspections', { '/estadisticas/resultado/:resultado': 'resultado' })
router.get('/:id', h((req) => findById('sanitary_inspections', req.params.id, 'Inspección')))

router.post('/', h(async (req) => {
  required(req.body, ['patente', 'rutConductor', 'rutInspector', 'pasoFronterizo', 'fechaInspeccion'])
  const { patente, rutConductor, rutInspector, pasoFronterizo, observaciones } = req.body
  await obtenerVehiculoPorPatente(patente)
  assertNotFuture(req.body.fechaInspeccion, 'La fecha de inspección no puede ser futura')
  return insert('sanitary_inspections', {
    patente: patente.toUpperCase(), rutConductor, rutInspector, pasoFronterizo,
    fechaInspeccion: toTimestamp(req.body.fechaInspeccion), resultado: 'PENDIENTE',
    observaciones: observaciones || null,
  })
}, 201))

router.put('/:id', h(async (req) => {
  const insp = await findById('sanitary_inspections', req.params.id, 'Inspección')
  const b = req.body
  if (b.resultado && !RESULTADOS.includes(b.resultado)) throw badRequest(`Resultado inválido. Debe ser: ${RESULTADOS.join(', ')}`)
  return update('sanitary_inspections', insp.id, {
    patente: b.patente ? b.patente.toUpperCase() : undefined,
    rutConductor: b.rutConductor,
    rutInspector: b.rutInspector,
    pasoFronterizo: b.pasoFronterizo,
    resultado: b.resultado || undefined,
    observaciones: b.observaciones,
  })
}))

async function resolver(req, resultado) {
  const insp = await findById('sanitary_inspections', req.params.id, 'Inspección')
  const accion = resultado === 'APROBADO' ? 'aprobar' : 'rechazar'
  if (insp.resultado !== 'PENDIENTE') {
    throw badRequest(`Solo se pueden ${accion} inspecciones PENDIENTES. Resultado actual: ${insp.resultado}`)
  }
  return update('sanitary_inspections', insp.id, { resultado, observaciones: req.query.observaciones || null })
}

router.patch('/:id/aprobar', h((req) => resolver(req, 'APROBADO')))
router.patch('/:id/rechazar', h((req) => resolver(req, 'RECHAZADO')))
router.delete('/:id', h((req) => remove('sanitary_inspections', req.params.id, 'Inspección')))

export default router
