// /api/v1/pasos y /api/v1/categorias — tablas PASO_FRONTERIZO y CATEGORIA_ITEM.
import { Router } from 'express'
import { query, queryOne, transaction, sn } from '../db.js'
import { h, notFound, required, permitir, texto, numero, toId } from '../http.js'

// ---------------- Pasos fronterizos ----------------
export const pasosRouter = Router()

const SELECT_PASO = `
  SELECT pf.ID_PASO AS id, pf.NOMBRE, pf.REGION, pf.PAIS, pf.ESTADO,
         (SELECT COUNT(*) FROM CRUCE_FRONTERIZO c WHERE c.ID_PASO = pf.ID_PASO) AS cruces
  FROM PASO_FRONTERIZO pf`

pasosRouter.get('/', h(() => query(`${SELECT_PASO} ORDER BY pf.NOMBRE`)))

const datosPaso = (b) => {
  required(b, ['nombre', 'region', 'pais'])
  return { nombre: texto(b.nombre), region: texto(b.region), pais: texto(b.pais), estado: (texto(b.estado) || 'ACTIVO').toUpperCase() }
}

pasosRouter.post('/', permitir('ADMINISTRADOR'), h(async (req) => {
  const d = datosPaso(req.body)
  const id = await transaction(async (db) => {
    const nuevo = await db.nextId('PASO_FRONTERIZO', 'ID_PASO', 'SEQ_PASO')
    await db.execute('INSERT INTO PASO_FRONTERIZO (ID_PASO, NOMBRE, REGION, PAIS, ESTADO) VALUES (:id, :nombre, :region, :pais, :estado)',
      { id: nuevo, ...d })
    return nuevo
  })
  return queryOne(`${SELECT_PASO} WHERE pf.ID_PASO = :id`, { id })
}, 201))

pasosRouter.put('/:id', permitir('ADMINISTRADOR'), h(async (req) => {
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    'UPDATE PASO_FRONTERIZO SET NOMBRE = :nombre, REGION = :region, PAIS = :pais, ESTADO = :estado WHERE ID_PASO = :id',
    { id, ...datosPaso(req.body) }))
  if (!r.rowsAffected) throw notFound('Paso fronterizo no encontrado')
  return queryOne(`${SELECT_PASO} WHERE pf.ID_PASO = :id`, { id })
}))

pasosRouter.delete('/:id', permitir('ADMINISTRADOR'), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM PASO_FRONTERIZO WHERE ID_PASO = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Paso fronterizo no encontrado')
}))

// ---------------- Categorías de ítems ----------------
export const categoriasRouter = Router()

const SELECT_CAT = `
  SELECT c.ID_CATEGORIA AS id, c.NOMBRE, c.DESCRIPCION, c.REQUIERE_DECLARACION, c.LIMITE_VALOR_USD, c.ACTIVO
  FROM CATEGORIA_ITEM c`

categoriasRouter.get('/', h(() => query(`${SELECT_CAT} ORDER BY c.NOMBRE`)))

const datosCat = (b) => {
  required(b, ['nombre', 'descripcion'])
  return {
    nombre: String(b.nombre).trim().toUpperCase(), descripcion: texto(b.descripcion),
    requiere: sn(b.requiereDeclaracion), limite: numero(b.limiteValorUsd),
    activo: b.activo === undefined ? 'S' : sn(b.activo),
  }
}

categoriasRouter.post('/', permitir('ADMINISTRADOR'), h(async (req) => {
  const d = datosCat(req.body)
  const id = await transaction(async (db) => {
    const nuevo = await db.nextId('CATEGORIA_ITEM', 'ID_CATEGORIA', 'SEQ_CATEGORIA')
    await db.execute(
      `INSERT INTO CATEGORIA_ITEM (ID_CATEGORIA, NOMBRE, DESCRIPCION, REQUIERE_DECLARACION, LIMITE_VALOR_USD, ACTIVO)
       VALUES (:id, :nombre, :descripcion, :requiere, :limite, :activo)`, { id: nuevo, ...d })
    return nuevo
  })
  return queryOne(`${SELECT_CAT} WHERE c.ID_CATEGORIA = :id`, { id })
}, 201))

categoriasRouter.put('/:id', permitir('ADMINISTRADOR'), h(async (req) => {
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    `UPDATE CATEGORIA_ITEM SET NOMBRE = :nombre, DESCRIPCION = :descripcion, REQUIERE_DECLARACION = :requiere,
            LIMITE_VALOR_USD = :limite, ACTIVO = :activo WHERE ID_CATEGORIA = :id`, { id, ...datosCat(req.body) }))
  if (!r.rowsAffected) throw notFound('Categoría no encontrada')
  return queryOne(`${SELECT_CAT} WHERE c.ID_CATEGORIA = :id`, { id })
}))

categoriasRouter.delete('/:id', permitir('ADMINISTRADOR'), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM CATEGORIA_ITEM WHERE ID_CATEGORIA = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Categoría no encontrada')
}))
