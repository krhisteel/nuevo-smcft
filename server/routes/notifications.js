// /api/v1/notifications y /api/v1/notification-recipients (antes NotificationService).
import { Router } from 'express'
import { query, queryOne, transaction, nowLocal } from '../db.js'
import { h, badRequest, findById, insert, update, remove, required, countRoutes } from '../http.js'

// Adjunta la lista de destinatarios a cada notificación
async function conDestinatarios(notificaciones) {
  if (!notificaciones.length) return notificaciones
  const ids = notificaciones.map((n) => n.id)
  const recipients = await query(
    'SELECT * FROM notification_recipients WHERE notification_id = ANY($1::int[]) ORDER BY id', [ids])
  return notificaciones.map((n) => ({ ...n, destinatarios: recipients.filter((r) => r.notificationId === n.id) }))
}

// Adjunta la notificación a cada destinatario (la usa el panel de alertas)
async function conNotificacion(recipients) {
  if (!recipients.length) return recipients
  const ids = [...new Set(recipients.map((r) => r.notificationId))]
  const notifs = await query('SELECT * FROM notifications WHERE id = ANY($1::int[])', [ids])
  return recipients.map((r) => ({ ...r, notification: notifs.find((n) => n.id === r.notificationId) || null }))
}

const listar = (where = '', params = [], order = 'id ASC') =>
  query(`SELECT * FROM notifications ${where ? `WHERE ${where}` : ''} ORDER BY ${order}`, params).then(conDestinatarios)

// Crea el destinatario a partir de un RUT de usuario (si existe)
async function agregarDestinatarioPorRut(notificationId, rut, q) {
  if (!rut || !String(rut).trim()) return
  const [usuario] = await q('SELECT rut, email, nombre FROM users WHERE rut = $1', [rut])
  if (!usuario) throw badRequest(`El usuario con RUT ${rut} no existe en el sistema`)
  await insert('notification_recipients', {
    notificationId, rutDestinatario: usuario.rut, email: usuario.email, nombre: usuario.nombre, leida: false,
  }, q)
}

// ---------------- Destinatarios ----------------
export const recipientsRouter = Router()

const listarRecipients = (where = '', params = [], extra = 'ORDER BY id ASC') =>
  query(`SELECT * FROM notification_recipients ${where ? `WHERE ${where}` : ''} ${extra}`, params).then(conNotificacion)

recipientsRouter.get('/', h(() => listarRecipients()))
recipientsRouter.get('/no-leidas', h(() => listarRecipients('leida = FALSE')))
recipientsRouter.get('/ultimos', h(() => listarRecipients('', [], 'ORDER BY id DESC LIMIT 10')))
recipientsRouter.get('/notificacion/:notificationId', h((req) =>
  listarRecipients('notification_id = $1', [req.params.notificationId])))
recipientsRouter.get('/notificacion/:notificationId/no-leidos', h((req) =>
  listarRecipients('notification_id = $1 AND leida = FALSE', [req.params.notificationId])))
recipientsRouter.get('/destinatario/:rut', h((req) =>
  listarRecipients('rut_destinatario = $1', [req.params.rut], 'ORDER BY id DESC')))
recipientsRouter.get('/destinatario/:rut/no-leidas', h((req) =>
  listarRecipients('rut_destinatario = $1 AND leida = FALSE', [req.params.rut], 'ORDER BY id DESC')))
recipientsRouter.get('/estadisticas/destinatario/:rut', h(async (req) => {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS total FROM notification_recipients WHERE rut_destinatario = $1 AND leida = FALSE',
    [req.params.rut])
  return { rut: req.params.rut, total: row.total }
}))
recipientsRouter.get('/:id', h(async (req) =>
  (await conNotificacion([await findById('notification_recipients', req.params.id, 'Destinatario')]))[0]))

recipientsRouter.post('/', h(async (req) => {
  required(req.body, ['notificationId', 'rutDestinatario', 'email', 'nombre'])
  const n = await findById('notifications', req.body.notificationId, 'Notificación')
  if (n.estado !== 'PENDIENTE') throw badRequest('Solo se pueden agregar destinatarios a notificaciones PENDIENTES')
  return insert('notification_recipients', {
    notificationId: n.id, rutDestinatario: req.body.rutDestinatario,
    email: req.body.email, nombre: req.body.nombre, leida: false,
  })
}, 201))

recipientsRouter.patch('/:id/leida', h(async (req) => {
  const r = await findById('notification_recipients', req.params.id, 'Destinatario')
  return update('notification_recipients', r.id, { leida: true, leidaAt: nowLocal() })
}))
recipientsRouter.delete('/:id', h((req) => remove('notification_recipients', req.params.id, 'Destinatario')))

// ---------------- Notificaciones ----------------
const router = Router()

router.get('/', h(() => listar()))
router.get('/pendientes', h(() => listar(`estado = 'PENDIENTE'`, [], 'id DESC')))
router.get('/enviadas', h(() => listar(`estado = 'ENVIADA'`, [], 'id DESC')))
router.get('/ultimas', h(() =>
  query('SELECT * FROM notifications ORDER BY id DESC LIMIT 10').then(conDestinatarios)))
router.get('/buscar', h((req) => listar('titulo ILIKE $1', [`%${req.query.texto || ''}%`])))
router.get('/tipo/:tipo', h((req) => listar('tipo = $1', [req.params.tipo])))
router.get('/estado/:estado', h((req) => listar('estado = $1', [req.params.estado])))
countRoutes(router, 'notifications', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/tipo/:tipo': 'tipo',
})
router.get('/:id', h(async (req) =>
  (await conDestinatarios([await findById('notifications', req.params.id, 'Notificación')]))[0]))

router.post('/', h(async (req) => {
  required(req.body, ['titulo', 'mensaje', 'tipo'])
  const b = req.body
  const id = await transaction(async (q) => {
    const nueva = await insert('notifications', {
      titulo: b.titulo, mensaje: b.mensaje, tipo: b.tipo,
      deadlineAlertId: b.deadlineAlertId || null, estado: 'PENDIENTE', createdAt: nowLocal(),
    }, q)
    await agregarDestinatarioPorRut(nueva.id, b.destinatarioRut, q)
    return nueva.id
  })
  return (await conDestinatarios([await findById('notifications', id, 'Notificación')]))[0]
}, 201))

router.put('/:id', h(async (req) => {
  const n = await findById('notifications', req.params.id, 'Notificación')
  const b = req.body
  await transaction(async (q) => {
    await update('notifications', n.id, {
      titulo: b.titulo, mensaje: b.mensaje, tipo: b.tipo, estado: b.estado || undefined,
    }, q)
    // Reemplaza el destinatario por el indicado en el formulario
    if (b.destinatarioRut !== undefined) {
      await q('DELETE FROM notification_recipients WHERE notification_id = $1', [n.id])
      await agregarDestinatarioPorRut(n.id, b.destinatarioRut, q)
    }
  })
  return (await conDestinatarios([await findById('notifications', n.id, 'Notificación')]))[0]
}))

router.patch('/:id/enviada', h(async (req) => {
  const n = await findById('notifications', req.params.id, 'Notificación')
  if (n.estado !== 'PENDIENTE') throw badRequest(`Solo se pueden enviar notificaciones PENDIENTES. Estado actual: ${n.estado}`)
  return update('notifications', n.id, { estado: 'ENVIADA', enviadaAt: nowLocal() })
}))

router.patch('/:id/error', h(async (req) => {
  const n = await findById('notifications', req.params.id, 'Notificación')
  return update('notifications', n.id, { estado: 'ERROR' })
}))

// Convierte las alertas de plazos no enviadas en notificaciones
router.post('/generar-desde-alertas', h(async () => {
  await transaction(async (q) => {
    const alertas = await q('SELECT * FROM deadline_alerts WHERE enviada = FALSE ORDER BY id')
    for (const a of alertas) {
      await insert('notifications', {
        titulo: `Alerta de Deadline: ${a.tipoAlerta}`, mensaje: a.mensaje, tipo: `ALERTA_${a.tipoAlerta}`,
        deadlineAlertId: a.id, estado: 'PENDIENTE', createdAt: nowLocal(),
      }, q)
      await q('UPDATE deadline_alerts SET enviada = TRUE WHERE id = $1', [a.id])
    }
  })
  return listar(`estado = 'PENDIENTE'`, [], 'id DESC')
}))

router.delete('/:id', h((req) => remove('notifications', req.params.id, 'Notificación')))

export default router
