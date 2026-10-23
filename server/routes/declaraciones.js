// /api/v1/declaraciones — DECLARACION e ITEM_DECLARADO (Aduana / SAG).
import { Router } from 'express'
import { query, queryOne, transaction, sn } from '../db.js'
import { h, badRequest, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { existe } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG']
router.use(permitir(...STAFF))

const SELECT = `
  SELECT d.ID_DECLARACION AS id, d.ID_CRUCE, d.TIPO, d.FECHA, d.ESTADO,
         pf.NOMBRE AS paso, v.PATENTE, c.TIPO_MOVIMIENTO,
         (SELECT COUNT(*) FROM ITEM_DECLARADO i WHERE i.ID_DECLARACION = d.ID_DECLARACION) AS items,
         (SELECT NVL(SUM(i.VALOR_USD), 0) FROM ITEM_DECLARADO i WHERE i.ID_DECLARACION = d.ID_DECLARACION) AS total_usd
  FROM DECLARACION d
  JOIN CRUCE_FRONTERIZO c ON c.ID_CRUCE = d.ID_CRUCE
  JOIN PASO_FRONTERIZO pf ON pf.ID_PASO = c.ID_PASO
  LEFT JOIN VEHICULO v ON v.ID_VEHICULO = c.ID_VEHICULO`

const SELECT_ITEM = `
  SELECT i.ID_ITEM AS id, i.ID_DECLARACION, i.ID_CATEGORIA, cat.NOMBRE AS categoria, i.DESCRIPCION,
         i.CANTIDAD, i.VALOR_USD, i.APROBADO, cat.LIMITE_VALOR_USD,
         CASE WHEN cat.LIMITE_VALOR_USD IS NOT NULL AND i.VALOR_USD > cat.LIMITE_VALOR_USD THEN 'S' ELSE 'N' END AS excede_limite
  FROM ITEM_DECLARADO i JOIN CATEGORIA_ITEM cat ON cat.ID_CATEGORIA = i.ID_CATEGORIA`

router.get('/', h((req) => texto(req.query.cruce)
  ? query(`${SELECT} WHERE d.ID_CRUCE = :c ORDER BY d.ID_DECLARACION DESC`, { c: toId(req.query.cruce) })
  : query(`${SELECT} ORDER BY d.ID_DECLARACION DESC FETCH FIRST 500 ROWS ONLY`)))

router.get('/:id', h(async (req) => {
  const id = toId(req.params.id)
  const d = await queryOne(`${SELECT} WHERE d.ID_DECLARACION = :id`, { id })
  if (!d) throw notFound('Declaración no encontrada')
  return { ...d, detalleItems: await query(`${SELECT_ITEM} WHERE i.ID_DECLARACION = :id ORDER BY i.ID_ITEM`, { id }) }
}))

router.get('/:id/items', h((req) =>
  query(`${SELECT_ITEM} WHERE i.ID_DECLARACION = :id ORDER BY i.ID_ITEM`, { id: toId(req.params.id) })))

router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['idCruce', 'tipo'])
  const id = await transaction(async (db) => {
    const cruce = await existe('CRUCE_FRONTERIZO', 'ID_CRUCE', req.body.idCruce, 'Cruce', db)
    const nuevo = await db.nextId('DECLARACION', 'ID_DECLARACION', 'SEQ_DECLARACION')
    await db.execute(
      `INSERT INTO DECLARACION (ID_DECLARACION, ID_CRUCE, TIPO, FECHA, ESTADO)
       VALUES (:id, :c, :t, NVL(TO_DATE(:f, 'YYYY-MM-DD'), TRUNC(SYSDATE)), :e)`,
      { id: nuevo, c: cruce, t: String(req.body.tipo).toUpperCase(), f: texto(req.body.fecha),
        e: (texto(req.body.estado) || 'REGISTRADA').toUpperCase() })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE d.ID_DECLARACION = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['tipo', 'estado'])
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    'UPDATE DECLARACION SET TIPO = :t, ESTADO = :e WHERE ID_DECLARACION = :id',
    { id, t: String(req.body.tipo).toUpperCase(), e: String(req.body.estado).toUpperCase() }))
  if (!r.rowsAffected) throw notFound('Declaración no encontrada')
  return queryOne(`${SELECT} WHERE d.ID_DECLARACION = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  await transaction(async (db) => {
    await db.execute('DELETE FROM ITEM_DECLARADO WHERE ID_DECLARACION = :id', { id })
    const r = await db.execute('DELETE FROM DECLARACION WHERE ID_DECLARACION = :id', { id })
    if (!r.rowsAffected) throw notFound('Declaración no encontrada')
  })
}))

// ---- Ítems declarados ----
router.post('/:id/items', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['idCategoria', 'descripcion', 'cantidad', 'valorUsd'])
  const cantidad = Number(req.body.cantidad)
  const valor = Number(req.body.valorUsd)
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw badRequest('La cantidad debe ser un entero mayor a 0')
  if (!Number.isFinite(valor) || valor < 0) throw badRequest('El valor en USD no es válido')
  const idItem = await transaction(async (db) => {
    const decl = await existe('DECLARACION', 'ID_DECLARACION', req.params.id, 'Declaración', db)
    const cat = await db.queryOne('SELECT ID_CATEGORIA AS id, ACTIVO FROM CATEGORIA_ITEM WHERE ID_CATEGORIA = :c', { c: toId(req.body.idCategoria) })
    if (!cat) throw badRequest('La categoría no existe')
    if (!cat.activo) throw badRequest('La categoría está inactiva')
    const nuevo = await db.nextId('ITEM_DECLARADO', 'ID_ITEM', 'SEQ_ITEM')
    await db.execute(
      `INSERT INTO ITEM_DECLARADO (ID_ITEM, ID_DECLARACION, ID_CATEGORIA, DESCRIPCION, CANTIDAD, VALOR_USD, APROBADO)
       VALUES (:id, :d, :c, :descripcion, :cant, :valor, 'N')`,
      { id: nuevo, d: decl, c: cat.id, descripcion: texto(req.body.descripcion), cant: cantidad, valor })
    return nuevo
  })
  return queryOne(`${SELECT_ITEM} WHERE i.ID_ITEM = :id`, { id: idItem })
}, 201))

router.patch('/items/:itemId', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.itemId)
  const r = await transaction((db) => db.execute('UPDATE ITEM_DECLARADO SET APROBADO = :a WHERE ID_ITEM = :id', { a: sn(req.body?.aprobado), id }))
  if (!r.rowsAffected) throw notFound('Ítem no encontrado')
  return queryOne(`${SELECT_ITEM} WHERE i.ID_ITEM = :id`, { id })
}))

router.delete('/items/:itemId', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM ITEM_DECLARADO WHERE ID_ITEM = :id', { id: toId(req.params.itemId) }))
  if (!r.rowsAffected) throw notFound('Ítem no encontrado')
}))

export default router
