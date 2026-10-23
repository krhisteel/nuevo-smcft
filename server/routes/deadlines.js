// /api/v1/deadlines y /api/v1/deadline-alerts (antes DeadlineService).
import { Router } from 'express'
import { query, queryOne, nowLocal } from '../db.js'
import { h, badRequest, findById, insert, update, remove, required, toTimestamp, filterRoutes, countRoutes } from '../http.js'

const DIA = 86400000

// Días completos entre ahora (hora de Chile) y la fecha límite
const diasRestantes = (fechaLimite) => Math.trunc((Date.parse(fechaLimite) - Date.parse(nowLocal())) / DIA)

// ---------------- Alertas ----------------
export const alertsRouter = Router()

alertsRouter.get('/', h(() => query('SELECT * FROM deadline_alerts ORDER BY id ASC')))
filterRoutes(alertsRouter, 'deadline_alerts', {
  '/ultimas': { order: 'id DESC', limit: 10 },
  '/no-enviadas': { where: 'enviada = FALSE' },
  '/enviadas': { where: 'enviada = TRUE' },
  '/urgentes': { where: `tipo_alerta = 'URGENTE' AND enviada = FALSE` },
  '/vencidos': { where: `tipo_alerta = 'VENCIDO' AND enviada = FALSE` },
  '/deadline/:deadlineId': { where: 'deadline_id = $1' },
  '/deadline/:deadlineId/ordenadas': { where: 'deadline_id = $1', order: 'dias_restantes ASC' },
})
alertsRouter.get('/estadisticas/pendientes', h(async () => {
  const row = await queryOne('SELECT COUNT(*) AS total FROM deadline_alerts WHERE enviada = FALSE')
  return { total: row.total }
}))
alertsRouter.get('/:id', h((req) => findById('deadline_alerts', req.params.id, 'Alerta')))

alertsRouter.post('/', h(async (req) => {
  required(req.body, ['deadlineId', 'mensaje', 'diasRestantes', 'tipoAlerta'])
  const d = await findById('deadlines', req.body.deadlineId, 'Deadline')
  if (d.estado !== 'ACTIVO') throw badRequest('Solo se pueden crear alertas para deadlines ACTIVOS')
  return insert('deadline_alerts', {
    deadlineId: d.id, mensaje: req.body.mensaje, diasRestantes: Number(req.body.diasRestantes),
    tipoAlerta: req.body.tipoAlerta, enviada: false,
  })
}, 201))

// Genera una alerta según los días que faltan para la fecha límite
alertsRouter.post('/automatica/:deadlineId', h(async (req) => {
  const d = await findById('deadlines', req.params.deadlineId, 'Deadline')
  const dias = diasRestantes(d.fechaLimite)
  let tipoAlerta, mensaje
  if (dias <= 0) {
    tipoAlerta = 'VENCIDO'
    mensaje = `El deadline del vehículo ${d.patente} ha vencido. Días de retraso: ${Math.abs(dias)}`
  } else {
    tipoAlerta = dias <= 15 ? 'URGENTE' : 'AVISO'
    mensaje = `El deadline del vehículo ${d.patente} vence en ${dias} días. Tipo: ${d.tipo}`
  }
  return insert('deadline_alerts', { deadlineId: d.id, mensaje, diasRestantes: dias, tipoAlerta, enviada: false })
}, 201))

alertsRouter.patch('/:id/enviada', h(async (req) =>
  update('deadline_alerts', (await findById('deadline_alerts', req.params.id, 'Alerta')).id, { enviada: true })))
alertsRouter.delete('/:id', h((req) => remove('deadline_alerts', req.params.id, 'Alerta')))

// ---------------- Plazos ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM deadlines ORDER BY id ASC')))
router.get('/proximos-a-vencer', h(() => query(
  `SELECT * FROM deadlines WHERE estado = 'ACTIVO' AND fecha_limite < $1 ORDER BY fecha_limite ASC`,
  [nowLocal(15 * DIA)])))
filterRoutes(router, 'deadlines', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/activos/ordenados': { where: `estado = 'ACTIVO'`, order: 'fecha_limite ASC' },
  '/patente/:patente': { where: 'patente = UPPER($1)', order: 'fecha_limite ASC' },
  '/conductor/:rut': { where: 'rut_conductor = $1' },
  '/estado/:estado': { where: 'estado = $1' },
  '/tipo/:tipo': { where: 'tipo = $1' },
})
countRoutes(router, 'deadlines', { '/estadisticas/estado/:estado': 'estado' })
router.get('/:id/dias-restantes', h(async (req) => {
  const d = await findById('deadlines', req.params.id, 'Deadline')
  return { id: d.id, diasRestantes: diasRestantes(d.fechaLimite) }
}))
router.get('/:id', h((req) => findById('deadlines', req.params.id, 'Deadline')))

router.post('/', h(async (req) => {
  required(req.body, ['patente', 'rutConductor', 'entryId', 'fechaIngreso', 'fechaLimite', 'tipo'])
  const b = req.body
  await findById('entries', b.entryId, 'Ingreso').catch(() => {
    throw badRequest(`El ingreso con id ${b.entryId} no existe en el sistema`)
  })
  const ingreso = toTimestamp(b.fechaIngreso)
  const limite = toTimestamp(b.fechaLimite)
  if (!(Date.parse(limite) > Date.parse(ingreso))) throw badRequest('La fecha límite debe ser posterior a la fecha de ingreso')
  if (Date.parse(limite) < Date.parse(nowLocal())) throw badRequest('La fecha límite no puede ser una fecha pasada')
  return insert('deadlines', {
    patente: b.patente.toUpperCase(), rutConductor: b.rutConductor, entryId: Number(b.entryId),
    fechaIngreso: ingreso, fechaLimite: limite, tipo: b.tipo, estado: 'ACTIVO',
    observaciones: b.observaciones || null,
  })
}, 201))

async function cambiarEstado(req, estado, accion, observaciones) {
  const d = await findById('deadlines', req.params.id, 'Deadline')
  if (d.estado !== 'ACTIVO') {
    throw badRequest(`Solo se pueden ${accion} deadlines en estado ACTIVO. Estado actual: ${d.estado}`)
  }
  return update('deadlines', d.id, { estado, observaciones })
}

router.patch('/:id/cerrar', h((req) => cambiarEstado(req, 'CERRADO', 'cerrar', req.query.observaciones || null)))
router.patch('/:id/vencer', h((req) => cambiarEstado(req, 'VENCIDO', 'vencer')))
router.delete('/:id', h((req) => remove('deadlines', req.params.id, 'Deadline')))

export default router
