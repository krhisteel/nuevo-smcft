// /api/v1/notificaciones — NOTIFICACION y NOTIFICACION_DESTINATARIO.
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { personaPorRut } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']

const SELECT = `
  SELECT n.ID_NOTIFICACION AS id, n.TITULO, n.MENSAJE, n.TIPO, n.ID_ALERTA, n.ESTADO, n.FECHA_CREACION, n.FECHA_ENVIO,
         (SELECT LISTAGG(p.RUT, ', ') WITHIN GROUP (ORDER BY p.RUT)
            FROM NOTIFICACION_DESTINATARIO d JOIN PERSONA p ON p.ID_PERSONA = d.ID_PERSONA
           WHERE d.ID_NOTIFICACION = n.ID_NOTIFICACION) AS destinatarios,
         (SELECT COUNT(*) FROM NOTIFICACION_DESTINATARIO d WHERE d.ID_NOTIFICACION = n.ID_NOTIFICACION AND d.LEIDA = 'S') AS leidas
  FROM NOTIFICACION n`

// ---- Bandeja del usuario conectado ----
const SELECT_MIAS = `
  SELECT d.ID_NOTIF_DEST AS id, d.LEIDA, d.FECHA_LECTURA, n.ID_NOTIFICACION, n.TITULO, n.MENSAJE, n.TIPO, n.FECHA_CREACION
  FROM NOTIFICACION_DESTINATARIO d JOIN NOTIFICACION n ON n.ID_NOTIFICACION = d.ID_NOTIFICACION
  WHERE d.ID_PERSONA = :p`

router.get('/mias', h((req) => query(
  `${SELECT_MIAS} ${req.query.noLeidas ? `AND d.LEIDA = 'N'` : ''} ORDER BY n.FECHA_CREACION DESC, d.ID_NOTIF_DEST DESC
   FETCH FIRST 50 ROWS ONLY`, { p: req.user.idPersona })))

router.get('/mias/no-leidas/total', h(async (req) => queryOne(
  `SELECT COUNT(*) AS total FROM NOTIFICACION_DESTINATARIO WHERE ID_PERSONA = :p AND LEIDA = 'N'`, { p: req.user.idPersona })))

router.patch('/mias/:id/leida', h(async (req) => {
  const r = await transaction((db) => db.execute(
    `UPDATE NOTIFICACION_DESTINATARIO SET LEIDA = 'S', FECHA_LECTURA = SYSTIMESTAMP
     WHERE ID_NOTIF_DEST = :id AND ID_PERSONA = :p`, { id: toId(req.params.id), p: req.user.idPersona }))
  if (!r.rowsAffected) throw notFound('Notificación no encontrada')
  return { mensaje: 'Marcada como leída' }
}))

// ---- Gestión (funcionarios) ----
router.get('/', permitir(...STAFF), h(() => query(`${SELECT} ORDER BY n.FECHA_CREACION DESC, n.ID_NOTIFICACION DESC FETCH FIRST 500 ROWS ONLY`)))

const ruts = (v) => String(v || '').split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean)

async function agregarDestinatarios(db, idNotif, lista) {
  for (const rut of lista) {
    const p = await personaPorRut(rut, db)
    const ya = await db.queryOne('SELECT 1 AS x FROM NOTIFICACION_DESTINATARIO WHERE ID_NOTIFICACION = :n AND ID_PERSONA = :p', { n: idNotif, p: p.id })
    if (ya) continue
    const id = await db.nextId('NOTIFICACION_DESTINATARIO', 'ID_NOTIF_DEST')
    await db.execute(
      `INSERT INTO NOTIFICACION_DESTINATARIO (ID_NOTIF_DEST, ID_NOTIFICACION, ID_PERSONA, LEIDA) VALUES (:id, :n, :p, 'N')`,
      { id, n: idNotif, p: p.id })
  }
}

router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['titulo', 'mensaje', 'tipo'])
  const id = await transaction(async (db) => {
    const nuevo = await db.nextId('NOTIFICACION', 'ID_NOTIFICACION')
    await db.execute(
      `INSERT INTO NOTIFICACION (ID_NOTIFICACION, TITULO, MENSAJE, TIPO, ESTADO, FECHA_CREACION)
       VALUES (:id, :t, :m, :tipo, 'PENDIENTE', SYSTIMESTAMP)`,
      { id: nuevo, t: texto(req.body.titulo), m: texto(req.body.mensaje), tipo: String(req.body.tipo).toUpperCase() })
    await agregarDestinatarios(db, nuevo, ruts(req.body.destinatarios))
    return nuevo
  })
  return queryOne(`${SELECT} WHERE n.ID_NOTIFICACION = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['titulo', 'mensaje', 'tipo'])
  const id = toId(req.params.id)
  await transaction(async (db) => {
    const r = await db.execute(
      'UPDATE NOTIFICACION SET TITULO = :t, MENSAJE = :m, TIPO = :tipo WHERE ID_NOTIFICACION = :id',
      { id, t: texto(req.body.titulo), m: texto(req.body.mensaje), tipo: String(req.body.tipo).toUpperCase() })
    if (!r.rowsAffected) throw notFound('Notificación no encontrada')
    await agregarDestinatarios(db, id, ruts(req.body.destinatarios))
  })
  return queryOne(`${SELECT} WHERE n.ID_NOTIFICACION = :id`, { id })
}))

router.patch('/:id/enviar', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const n = await queryOne('SELECT ESTADO FROM NOTIFICACION WHERE ID_NOTIFICACION = :id', { id })
  if (!n) throw notFound('Notificación no encontrada')
  if (n.estado === 'ENVIADA') throw badRequest('La notificación ya fue enviada')
  await transaction((db) => db.execute(
    `UPDATE NOTIFICACION SET ESTADO = 'ENVIADA', FECHA_ENVIO = SYSTIMESTAMP WHERE ID_NOTIFICACION = :id`, { id }))
  return queryOne(`${SELECT} WHERE n.ID_NOTIFICACION = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  await transaction(async (db) => {
    await db.execute('DELETE FROM NOTIFICACION_DESTINATARIO WHERE ID_NOTIFICACION = :id', { id })
    const r = await db.execute('DELETE FROM NOTIFICACION WHERE ID_NOTIFICACION = :id', { id })
    if (!r.rowsAffected) throw notFound('Notificación no encontrada')
  })
}))

export default router
