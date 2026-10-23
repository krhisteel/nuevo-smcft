// /api/v1/reportes — REPORTE y REPORTE_DETALLE.
// Los reportes se generan con el procedimiento con parámetros SP_REPORTE_CRUCES,
// que calcula cruces, viajeros y valor declarado (USD) por paso fronterizo.
import { Router } from 'express'
import { query, queryOne, transaction, OUT_NUMBER } from '../db.js'
import { h, badRequest, notFound, required, permitir, toId } from '../http.js'

const router = Router()
router.use(permitir('ADMINISTRADOR', 'AUDITOR'))

const SELECT = `
  SELECT r.ID_REPORTE AS id, r.TITULO, r.TIPO_REPORTE, r.FECHA_INICIO, r.FECHA_FIN, r.ESTADO, r.OBSERVACIONES,
         u.EMAIL AS generado_por,
         (SELECT COUNT(*) FROM REPORTE_DETALLE d WHERE d.ID_REPORTE = r.ID_REPORTE) AS detalles
  FROM REPORTE r JOIN USUARIO u ON u.ID_USUARIO = r.ID_USUARIO_GENERADOR`

router.get('/', h(() => query(`${SELECT} ORDER BY r.ID_REPORTE DESC`)))

router.get('/:id', h(async (req) => {
  const id = toId(req.params.id)
  const r = await queryOne(`${SELECT} WHERE r.ID_REPORTE = :id`, { id })
  if (!r) throw notFound('Reporte no encontrado')
  const detalle = await query(
    `SELECT ID_DETALLE AS id, DESCRIPCION, VALOR, UNIDAD, CATEGORIA FROM REPORTE_DETALLE
     WHERE ID_REPORTE = :id ORDER BY ID_DETALLE`, { id })
  return { ...r, detalle }
}))

const FECHA = /^\d{4}-\d{2}-\d{2}$/

router.post('/', h(async (req) => {
  required(req.body, ['desde', 'hasta'])
  const { desde, hasta } = req.body
  if (!FECHA.test(desde) || !FECHA.test(hasta)) throw badRequest('Fechas inválidas (formato AAAA-MM-DD)')
  // "hasta" incluye el día completo; el package valida el rango (error -20020)
  const id = await transaction(async (db) => {
    const res = await db.execute(
      `BEGIN
         SP_REPORTE_CRUCES(TO_DATE(:d, 'YYYY-MM-DD'), TO_DATE(:h, 'YYYY-MM-DD') + 86399/86400, :u, :id);
       END;`,
      { d: desde, h: hasta, u: req.user.idUsuario, id: OUT_NUMBER })
    return res.outBinds.id
  })
  return queryOne(`${SELECT} WHERE r.ID_REPORTE = :id`, { id })
}, 201))

router.delete('/:id', h(async (req) => {
  const id = toId(req.params.id)
  await transaction(async (db) => {
    await db.execute('DELETE FROM REPORTE_DETALLE WHERE ID_REPORTE = :id', { id })
    const r = await db.execute('DELETE FROM REPORTE WHERE ID_REPORTE = :id', { id })
    if (!r.rowsAffected) throw notFound('Reporte no encontrado')
  })
}))

export default router
