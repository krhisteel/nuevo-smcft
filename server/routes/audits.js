// /api/v1/audits y /api/v1/audit-details (antes AuditService).
import { Router } from 'express'
import { query, queryOne, nowLocal } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required, toTimestamp, assertNotFuture,
  filterRoutes, countRoutes, dateRangeRoute,
} from '../http.js'
import { verificarUsuarioActivo } from './users.js'

// ---------------- Detalles ----------------
export const auditDetailsRouter = Router()

auditDetailsRouter.get('/', h(() => query('SELECT * FROM audit_details ORDER BY id ASC')))
dateRangeRoute(auditDetailsRouter, 'audit_details', 'fecha_accion')
auditDetailsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM audit_details WHERE accion ILIKE $1 ORDER BY id', [`%${req.query.accion || req.query.texto || ''}%`])))
filterRoutes(auditDetailsRouter, 'audit_details', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/auditoria/:auditId': { where: 'audit_id = $1' },
  '/auditoria/:auditId/ordenados': { where: 'audit_id = $1', order: 'fecha_accion DESC' },
  '/auditoria/:auditId/resultado/:resultado': { where: 'audit_id = $1 AND resultado = $2' },
  '/resultado/:resultado': { where: 'resultado = $1' },
  '/usuario/:rut': { where: 'rut_usuario = $1' },
  '/usuario/:rut/sospechosos': { where: `rut_usuario = $1 AND resultado = 'SOSPECHOSO'` },
})
auditDetailsRouter.get('/estadisticas/sospechosos/:rut', h(async (req) => {
  const row = await queryOne(
    `SELECT COUNT(*)::int AS total FROM audit_details WHERE rut_usuario = $1 AND resultado = 'SOSPECHOSO'`,
    [req.params.rut])
  return { rut: req.params.rut, total: row.total }
}))
auditDetailsRouter.get('/:id', h((req) => findById('audit_details', req.params.id, 'Detalle')))

auditDetailsRouter.post('/', h(async (req) => {
  required(req.body, ['auditId', 'accion', 'descripcion', 'rutUsuario'])
  const a = await findById('audits', req.body.auditId, 'Auditoría')
  if (a.estado !== 'EN_PROCESO') throw badRequest('Solo se pueden registrar detalles en auditorías EN_PROCESO')
  return insert('audit_details', {
    auditId: a.id,
    accion: req.body.accion,
    descripcion: req.body.descripcion,
    rutUsuario: req.body.rutUsuario,
    resultado: req.body.resultado || 'EXITOSO',
    ipAddress: req.body.ipAddress || null,
    fechaAccion: toTimestamp(req.body.fechaAccion) || nowLocal(),
  })
}, 201))
auditDetailsRouter.delete('/:id', h((req) => remove('audit_details', req.params.id, 'Detalle')))

// ---------------- Auditorías ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM audits ORDER BY id ASC')))
dateRangeRoute(router, 'audits', 'fecha_inicio')
filterRoutes(router, 'audits', {
  '/ultimas': { order: 'id DESC', limit: 10 },
  '/en-proceso/ordenadas': { where: `estado = 'EN_PROCESO'`, order: 'fecha_inicio ASC' },
  '/auditor/:rut': { where: 'rut_auditor = $1' },
  '/auditor/:rut/ordenadas': { where: 'rut_auditor = $1', order: 'fecha_inicio DESC' },
  '/tipo/:tipo': { where: 'tipo_auditoria = $1' },
  '/estado/:estado': { where: 'estado = $1' },
  '/entidad/:entidad': { where: 'entidad = $1' },
  '/entidad/:entidad/:entidadId': { where: 'entidad = $1 AND entidad_id = $2' },
})
countRoutes(router, 'audits', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/tipo/:tipo': 'tipo_auditoria',
})
router.get('/:id', h((req) => findById('audits', req.params.id, 'Auditoría')))

router.post('/', h(async (req) => {
  required(req.body, ['rutAuditor', 'tipoAuditoria', 'entidad', 'descripcion', 'fechaInicio'])
  const b = req.body
  await verificarUsuarioActivo(b.rutAuditor, 'auditor')
  assertNotFuture(b.fechaInicio, 'La fecha de inicio no puede ser futura')
  return insert('audits', {
    rutAuditor: b.rutAuditor, tipoAuditoria: b.tipoAuditoria, entidad: b.entidad,
    entidadId: b.entidadId ? Number(b.entidadId) : null, descripcion: b.descripcion,
    estado: 'EN_PROCESO', fechaInicio: toTimestamp(b.fechaInicio),
  })
}, 201))

router.put('/:id', h(async (req) => {
  const a = await findById('audits', req.params.id, 'Auditoría')
  const b = req.body
  if (b.rutAuditor && b.rutAuditor !== a.rutAuditor) await verificarUsuarioActivo(b.rutAuditor, 'auditor')
  return update('audits', a.id, {
    rutAuditor: b.rutAuditor,
    tipoAuditoria: b.tipoAuditoria,
    entidad: b.entidad,
    descripcion: b.descripcion,
    estado: b.estado || undefined,
  })
}))

async function cerrar(req, estado, accion) {
  const a = await findById('audits', req.params.id, 'Auditoría')
  if (a.estado !== 'EN_PROCESO') {
    throw badRequest(`Solo se pueden ${accion} auditorías EN_PROCESO. Estado actual: ${a.estado}`)
  }
  return update('audits', a.id, { estado, fechaCierre: nowLocal() })
}

router.patch('/:id/completar', h((req) => cerrar(req, 'COMPLETADA', 'completar')))
router.patch('/:id/observacion', h((req) => cerrar(req, 'OBSERVACION', 'marcar')))
router.delete('/:id', h((req) => remove('audits', req.params.id, 'Auditoría')))

export default router
