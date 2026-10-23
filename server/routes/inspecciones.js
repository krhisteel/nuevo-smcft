// /api/v1/inspecciones — INSPECCION_SANITARIA e INSPECCION_ITEM (SAG).
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { existe, funcionarioDe } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'INSPECTOR_SAG']
const RESULTADOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'OBSERVADO']
router.use(permitir(...STAFF))

const SELECT = `
  SELECT i.ID_INSPECCION AS id, i.ID_CRUCE, i.FECHA_INSPECCION, i.RESULTADO, i.OBSERVACIONES,
         i.ID_FUNCIONARIO_INSPECTOR, p.NOMBRES || ' ' || p.APELLIDOS AS inspector,
         pf.NOMBRE AS paso, v.PATENTE, c.TIPO_MOVIMIENTO,
         (SELECT COUNT(*) FROM INSPECCION_ITEM it WHERE it.ID_INSPECCION = i.ID_INSPECCION) AS items
  FROM INSPECCION_SANITARIA i
  JOIN FUNCIONARIO f ON f.ID_FUNCIONARIO = i.ID_FUNCIONARIO_INSPECTOR
  JOIN PERSONA p ON p.ID_PERSONA = f.ID_PERSONA
  JOIN CRUCE_FRONTERIZO c ON c.ID_CRUCE = i.ID_CRUCE
  JOIN PASO_FRONTERIZO pf ON pf.ID_PASO = c.ID_PASO
  LEFT JOIN VEHICULO v ON v.ID_VEHICULO = c.ID_VEHICULO`

const SELECT_ITEM = `
  SELECT it.ID_ITEM_INSP AS id, it.ID_INSPECCION, it.DESCRIPCION, it.RESULTADO_ITEM, it.OBSERVACIONES
  FROM INSPECCION_ITEM it`

const resultado = (v) => {
  const r = (texto(v) || 'PENDIENTE').toUpperCase()
  if (!RESULTADOS.includes(r)) throw badRequest(`Resultado inválido. Debe ser: ${RESULTADOS.join(', ')}`)
  return r
}

router.get('/', h(() => query(`${SELECT} ORDER BY i.FECHA_INSPECCION DESC, i.ID_INSPECCION DESC FETCH FIRST 500 ROWS ONLY`)))

router.get('/:id', h(async (req) => {
  const id = toId(req.params.id)
  const insp = await queryOne(`${SELECT} WHERE i.ID_INSPECCION = :id`, { id })
  if (!insp) throw notFound('Inspección no encontrada')
  return { ...insp, detalleItems: await query(`${SELECT_ITEM} WHERE it.ID_INSPECCION = :id ORDER BY it.ID_ITEM_INSP`, { id }) }
}))

router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['idCruce'])
  const id = await transaction(async (db) => {
    const cruce = await existe('CRUCE_FRONTERIZO', 'ID_CRUCE', req.body.idCruce, 'Cruce', db)
    // Por defecto el inspector es el funcionario conectado
    let inspector = texto(req.body.idFuncionarioInspector) ? toId(req.body.idFuncionarioInspector) : (await funcionarioDe(req, db))?.id
    if (!inspector) throw badRequest('Indique el funcionario inspector')
    const nuevo = await db.nextId('INSPECCION_SANITARIA', 'ID_INSPECCION')
    await db.execute(
      `INSERT INTO INSPECCION_SANITARIA (ID_INSPECCION, ID_CRUCE, ID_FUNCIONARIO_INSPECTOR, FECHA_INSPECCION, RESULTADO, OBSERVACIONES)
       VALUES (:id, :c, :f, SYSTIMESTAMP, :r, :o)`,
      { id: nuevo, c: cruce, f: inspector, r: resultado(req.body.resultado), o: texto(req.body.observaciones) })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE i.ID_INSPECCION = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    'UPDATE INSPECCION_SANITARIA SET RESULTADO = :r, OBSERVACIONES = :o WHERE ID_INSPECCION = :id',
    { id, r: resultado(req.body.resultado), o: texto(req.body.observaciones) }))
  if (!r.rowsAffected) throw notFound('Inspección no encontrada')
  return queryOne(`${SELECT} WHERE i.ID_INSPECCION = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  await transaction(async (db) => {
    await db.execute('DELETE FROM INSPECCION_ITEM WHERE ID_INSPECCION = :id', { id })
    const r = await db.execute('DELETE FROM INSPECCION_SANITARIA WHERE ID_INSPECCION = :id', { id })
    if (!r.rowsAffected) throw notFound('Inspección no encontrada')
  })
}))

// ---- Ítems revisados ----
router.post('/:id/items', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['descripcion'])
  const idItem = await transaction(async (db) => {
    const insp = await existe('INSPECCION_SANITARIA', 'ID_INSPECCION', req.params.id, 'Inspección', db)
    const nuevo = await db.nextId('INSPECCION_ITEM', 'ID_ITEM_INSP')
    await db.execute(
      `INSERT INTO INSPECCION_ITEM (ID_ITEM_INSP, ID_INSPECCION, DESCRIPCION, RESULTADO_ITEM, OBSERVACIONES)
       VALUES (:id, :i, :d, :r, :o)`,
      { id: nuevo, i: insp, d: texto(req.body.descripcion), r: resultado(req.body.resultadoItem), o: texto(req.body.observaciones) })
    return nuevo
  })
  return queryOne(`${SELECT_ITEM} WHERE it.ID_ITEM_INSP = :id`, { id: idItem })
}, 201))

router.delete('/items/:itemId', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM INSPECCION_ITEM WHERE ID_ITEM_INSP = :id', { id: toId(req.params.itemId) }))
  if (!r.rowsAffected) throw notFound('Ítem no encontrado')
}))

export default router
