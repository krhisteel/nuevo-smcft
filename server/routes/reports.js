// /api/v1/reports y /api/v1/report-details (antes ReportService).
import { Router } from 'express'
import { query, transaction } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required, toTimestamp,
  filterRoutes, countRoutes,
} from '../http.js'

// ---------------- Detalles ----------------
export const reportDetailsRouter = Router()

reportDetailsRouter.get('/', h(() => query('SELECT * FROM report_details ORDER BY id ASC')))
reportDetailsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM report_details WHERE descripcion ILIKE $1 ORDER BY id', [`%${req.query.descripcion || req.query.texto || ''}%`])))
filterRoutes(reportDetailsRouter, 'report_details', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/reporte/:reportId': { where: 'report_id = $1' },
  '/reporte/:reportId/ordenados': { where: 'report_id = $1', order: 'valor DESC' },
  '/reporte/:reportId/categoria/:categoria': { where: 'report_id = $1 AND categoria = $2' },
  '/categoria/:categoria': { where: 'categoria = $1' },
})
reportDetailsRouter.get('/:id', h((req) => findById('report_details', req.params.id, 'Detalle')))

reportDetailsRouter.post('/', h(async (req) => {
  required(req.body, ['reportId', 'descripcion', 'categoria'])
  const r = await findById('reports', req.body.reportId, 'Reporte')
  if (r.estado === 'ERROR') throw badRequest('No se pueden agregar detalles a reportes en estado ERROR')
  return insert('report_details', {
    reportId: r.id,
    descripcion: req.body.descripcion,
    valor: Number(req.body.valor ?? 0),
    unidad: req.body.unidad || 'unidad',
    categoria: req.body.categoria,
  })
}, 201))

reportDetailsRouter.put('/:id', h(async (req) => {
  const d = await findById('report_details', req.params.id, 'Detalle')
  const { descripcion, valor, unidad, categoria } = req.body
  return update('report_details', d.id, {
    descripcion, unidad, categoria, valor: valor !== undefined ? Number(valor) : undefined,
  })
}))
reportDetailsRouter.delete('/:id', h((req) => remove('report_details', req.params.id, 'Detalle')))

// ---------------- Reportes ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM reports ORDER BY id ASC')))
router.get('/buscar', h((req) =>
  query('SELECT * FROM reports WHERE titulo ILIKE $1 ORDER BY id', [`%${req.query.texto || ''}%`])))
filterRoutes(router, 'reports', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/tipo/:tipoReporte': { where: 'tipo_reporte = $1' },
  '/tipo/:tipoReporte/completados': { where: `tipo_reporte = $1 AND estado = 'COMPLETADO'` },
  '/generador/:rut': { where: 'generado_por = $1' },
  '/estado/:estado': { where: 'estado = $1' },
})
countRoutes(router, 'reports', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/tipo/:tipo': 'tipo_reporte',
})
router.get('/:id', h((req) => findById('reports', req.params.id, 'Reporte')))

// Genera el reporte. Para CRUCE_FRONTERIZO calcula automáticamente
// el total de cruces autorizados, rechazados y pendientes.
router.post('/', h(async (req) => {
  required(req.body, ['titulo', 'tipoReporte', 'fechaInicio', 'fechaFin', 'generadoPor'])
  const b = req.body
  if (!(Date.parse(b.fechaFin) > Date.parse(b.fechaInicio))) {
    throw badRequest('La fecha de fin debe ser posterior a la fecha de inicio')
  }
  return transaction(async (q) => {
    const reporte = await insert('reports', {
      titulo: b.titulo, tipoReporte: b.tipoReporte,
      fechaInicio: toTimestamp(b.fechaInicio), fechaFin: toTimestamp(b.fechaFin),
      generadoPor: b.generadoPor, estado: 'GENERANDO', observaciones: b.observaciones || null,
    }, q)
    if (b.tipoReporte === 'CRUCE_FRONTERIZO') {
      const categorias = [['AUTORIZADO', 'AUTORIZADOS', 'autorizados'], ['RECHAZADO', 'RECHAZADOS', 'rechazados'], ['PENDIENTE', 'PENDIENTES', 'pendientes']]
      for (const [estado, categoria, texto] of categorias) {
        const [{ total }] = await q('SELECT COUNT(*)::int AS total FROM border_crossings WHERE estado = $1', [estado])
        await insert('report_details', {
          reportId: reporte.id, descripcion: `Total de cruces ${texto}`, valor: total, unidad: 'cruces', categoria,
        }, q)
      }
    }
    return update('reports', reporte.id, { estado: 'COMPLETADO' }, q)
  })
}, 201))

router.put('/:id', h(async (req) => {
  const r = await findById('reports', req.params.id, 'Reporte')
  const b = req.body
  return update('reports', r.id, {
    titulo: b.titulo,
    tipoReporte: b.tipoReporte,
    generadoPor: b.generadoPor,
    estado: b.estado || undefined,
    observaciones: b.observaciones,
  })
}))

router.patch('/:id/completar', h(async (req) => {
  const r = await findById('reports', req.params.id, 'Reporte')
  if (r.estado !== 'GENERANDO') {
    throw badRequest(`Solo se pueden completar reportes en estado GENERANDO. Estado actual: ${r.estado}`)
  }
  return update('reports', r.id, { estado: 'COMPLETADO' })
}))

router.patch('/:id/error', h(async (req) => {
  const r = await findById('reports', req.params.id, 'Reporte')
  return update('reports', r.id, { estado: 'ERROR', observaciones: req.query.observaciones || null })
}))

router.delete('/:id', h((req) => remove('reports', req.params.id, 'Reporte')))

// Incluye los detalles al consultar un reporte individual
router.get('/:id/detalles', h(async (req) => {
  const r = await findById('reports', req.params.id, 'Reporte')
  return { ...r, detalles: await query('SELECT * FROM report_details WHERE report_id = $1 ORDER BY id', [r.id]) }
}))

export default router
