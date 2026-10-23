// /api/v1/item-categories y /api/v1/items (antes ItemCategoryService).
import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { h, badRequest, findById, insert, update, remove, required, toId, filterRoutes } from '../http.js'

// ---------------- Categorías ----------------
export const categoriesRouter = Router()

categoriesRouter.get('/', h(() => query('SELECT * FROM item_categories ORDER BY id ASC')))
categoriesRouter.get('/buscar', h((req) =>
  query('SELECT * FROM item_categories WHERE nombre ILIKE $1 ORDER BY id', [`%${req.query.nombre || req.query.texto || ''}%`])))
categoriesRouter.get('/limite', h((req) =>
  query('SELECT * FROM item_categories WHERE limite_valor_usd <= $1 ORDER BY limite_valor_usd', [Number(req.query.limite || 0)])))
filterRoutes(categoriesRouter, 'item_categories', {
  '/activas': { where: 'activo = TRUE' },
  '/inactivas': { where: 'activo = FALSE' },
  '/activas/ordenadas': { where: 'activo = TRUE', order: 'nombre ASC' },
  '/requieren-declaracion': { where: 'requiere_declaracion = TRUE AND activo = TRUE' },
  '/sin-declaracion': { where: 'requiere_declaracion = FALSE AND activo = TRUE' },
})
categoriesRouter.get('/:id', h((req) => findById('item_categories', req.params.id, 'Categoría')))

categoriesRouter.post('/', h(async (req) => {
  required(req.body, ['nombre', 'descripcion'])
  const b = req.body
  if (await queryOne('SELECT id FROM item_categories WHERE nombre = $1', [b.nombre])) {
    throw badRequest(`Ya existe una categoría con el nombre: ${b.nombre}`)
  }
  return insert('item_categories', {
    nombre: b.nombre, descripcion: b.descripcion, requiereDeclaracion: !!b.requiereDeclaracion,
    limiteValorUsd: b.limiteValorUsd != null && b.limiteValorUsd !== '' ? Number(b.limiteValorUsd) : null, activo: true,
  })
}, 201))

categoriesRouter.put('/:id', h(async (req) => {
  const c = await findById('item_categories', req.params.id, 'Categoría')
  const b = req.body
  return update('item_categories', c.id, {
    nombre: b.nombre, descripcion: b.descripcion,
    requiereDeclaracion: b.requiereDeclaracion !== undefined ? !!b.requiereDeclaracion : undefined,
    limiteValorUsd: b.limiteValorUsd !== undefined ? (b.limiteValorUsd === '' || b.limiteValorUsd === null ? null : Number(b.limiteValorUsd)) : undefined,
  })
}))

categoriesRouter.patch('/:id/desactivar', h(async (req) => {
  const c = await findById('item_categories', req.params.id, 'Categoría')
  return update('item_categories', c.id, { activo: false })
}))
categoriesRouter.delete('/:id', h((req) => remove('item_categories', req.params.id, 'Categoría')))

// ---------------- Ítems ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM items ORDER BY id ASC')))
router.get('/buscar', h((req) =>
  query('SELECT * FROM items WHERE nombre ILIKE $1 ORDER BY id', [`%${req.query.nombre || req.query.texto || ''}%`])))
filterRoutes(router, 'items', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/activos': { where: 'activo = TRUE' },
  '/unidad/:unidad': { where: 'unidad = $1' },
  '/categoria/:categoryId': { where: 'categoria_id = $1' },
  '/categoria/:categoryId/activos': { where: 'categoria_id = $1 AND activo = TRUE' },
  '/categoria/:categoryId/ordenados': { where: 'categoria_id = $1', order: 'nombre ASC' },
})
router.get('/:id', h((req) => findById('items', req.params.id, 'Item')))

router.post('/', h(async (req) => {
  required(req.body, ['categoriaId', 'nombre', 'descripcion'])
  const categoria = await findById('item_categories', toId(req.body.categoriaId), 'Categoría')
  if (!categoria.activo) throw badRequest('No se pueden agregar items a una categoría inactiva')
  return insert('items', {
    categoriaId: categoria.id, nombre: req.body.nombre, descripcion: req.body.descripcion,
    unidad: req.body.unidad || 'unidad', activo: true,
  })
}, 201))

router.put('/:id', h(async (req) => {
  const i = await findById('items', req.params.id, 'Item')
  const { nombre, descripcion, unidad } = req.body
  return update('items', i.id, { nombre, descripcion, unidad })
}))

router.patch('/:id/desactivar', h(async (req) =>
  update('items', (await findById('items', req.params.id, 'Item')).id, { activo: false })))
router.delete('/:id', h((req) => remove('items', req.params.id, 'Item')))

export default router
