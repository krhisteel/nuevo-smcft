// /api/v1/auditorias — AUDITORIA y AUDITORIA_DETALLE.
// Los triggers TRG_DOCUMENTO_AUDIT y TRG_DOCUMENTO_SENTENCIA registran aquí
// automáticamente cada cambio sobre la tabla DOCUMENTO.
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, texto, numero, toId } from '../http.js'

const router = Router()
router.use(permitir('ADMINISTRADOR', 'AUDITOR'))

const SELECT = `
  SELECT a.ID_AUDITORIA AS id, a.TIPO_AUDITORIA, a.ENTIDAD, a.ENTIDAD_ID, a.DESCRIPCION, a.ESTADO,
         a.FECHA_INICIO, a.FECHA_CIERRE, u.EMAIL AS auditor,
         (SELECT COUNT(*) FROM AUDITORIA_DETALLE d WHERE d.ID_AUDITORIA = a.ID_AUDITORIA) AS detalles
  FROM AUDITORIA a JOIN USUARIO u ON u.ID_USUARIO = a.ID_USUARIO_AUDITOR`

router.get('/', h((req) => texto(req.query.tipo)
  ? query(`${SELECT} WHERE a.TIPO_AUDITORIA = :t ORDER BY a.ID_AUDITORIA DESC`, { t: req.query.tipo })
  : query(`${SELECT} ORDER BY a.ID_AUDITORIA DESC FETCH FIRST 500 ROWS ONLY`)))

router.get('/:id', h(async (req) => {
  const id = toId(req.params.id)
  const a = await queryOne(`${SELECT} WHERE a.ID_AUDITORIA = :id`, { id })
  if (!a) throw notFound('Auditoría no encontrada')
  const detalle = await query(
    `SELECT d.ID_DETALLE AS id, d.ACCION, d.DESCRIPCION, d.RESULTADO, d.IP_ADDRESS, d.FECHA_ACCION, u.EMAIL AS usuario
     FROM AUDITORIA_DETALLE d JOIN USUARIO u ON u.ID_USUARIO = d.ID_USUARIO
     WHERE d.ID_AUDITORIA = :id ORDER BY d.FECHA_ACCION DESC, d.ID_DETALLE DESC`, { id })
  return { ...a, detalle }
}))

// Auditoría manual abierta por el auditor conectado
router.post('/', h(async (req) => {
  required(req.body, ['tipoAuditoria', 'entidad', 'descripcion'])
  const id = await transaction(async (db) => {
    const nuevo = await db.nextId('AUDITORIA', 'ID_AUDITORIA', 'SEQ_AUDITORIA')
    await db.execute(
      `INSERT INTO AUDITORIA (ID_AUDITORIA, ID_USUARIO_AUDITOR, TIPO_AUDITORIA, ENTIDAD, ENTIDAD_ID, DESCRIPCION, ESTADO, FECHA_INICIO)
       VALUES (:id, :u, :t, :e, :eid, :d, 'ABIERTA', SYSTIMESTAMP)`,
      { id: nuevo, u: req.user.idUsuario, t: String(req.body.tipoAuditoria).toUpperCase(),
        e: String(req.body.entidad).toUpperCase(), eid: numero(req.body.entidadId), d: texto(req.body.descripcion) })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE a.ID_AUDITORIA = :id`, { id })
}, 201))

// Cierra la auditoría (la siguiente modificación de documentos abrirá una nueva)
router.patch('/:id/cerrar', h(async (req) => {
  const id = toId(req.params.id)
  const a = await queryOne('SELECT ESTADO FROM AUDITORIA WHERE ID_AUDITORIA = :id', { id })
  if (!a) throw notFound('Auditoría no encontrada')
  if (a.estado === 'COMPLETADA') throw badRequest('La auditoría ya está completada')
  await transaction((db) => db.execute(
    `UPDATE AUDITORIA SET ESTADO = 'COMPLETADA', FECHA_CIERRE = SYSTIMESTAMP WHERE ID_AUDITORIA = :id`, { id }))
  return queryOne(`${SELECT} WHERE a.ID_AUDITORIA = :id`, { id })
}))

export default router
