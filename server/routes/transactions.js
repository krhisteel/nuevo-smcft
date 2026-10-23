// /api/v1/transactions y /api/v1/transaction-details (antes TransactionService).
import { Router } from 'express'
import { query, nowLocal } from '../db.js'
import {
  h, badRequest, findById, insert, update, remove, required,
  filterRoutes, countRoutes, dateRangeRoute,
} from '../http.js'
import { verificarUsuarioActivo } from './users.js'

// ---------------- Detalles ----------------
export const detailsRouter = Router()

detailsRouter.get('/', h(() => query('SELECT * FROM transaction_details ORDER BY id ASC')))
detailsRouter.get('/buscar', h((req) =>
  query('SELECT * FROM transaction_details WHERE concepto ILIKE $1 ORDER BY id', [`%${req.query.concepto || req.query.texto || ''}%`])))
filterRoutes(detailsRouter, 'transaction_details', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/transaccion/:transactionId': { where: 'transaction_id = $1' },
  '/transaccion/:transactionId/ordenados': { where: 'transaction_id = $1', order: 'monto DESC' },
  '/transaccion/:transactionId/tipo/:tipoDetalle': { where: 'transaction_id = $1 AND tipo_detalle = $2' },
  '/tipo/:tipoDetalle': { where: 'tipo_detalle = $1' },
})
detailsRouter.get('/:id', h((req) => findById('transaction_details', req.params.id, 'Detalle')))

detailsRouter.post('/', h(async (req) => {
  required(req.body, ['transactionId', 'concepto', 'monto'])
  const t = await findById('transactions', req.body.transactionId, 'Transacción')
  if (t.estado !== 'PENDIENTE') throw badRequest('Solo se pueden agregar detalles a transacciones PENDIENTES')
  return insert('transaction_details', {
    transactionId: t.id,
    concepto: req.body.concepto,
    monto: Number(req.body.monto),
    cantidad: Number(req.body.cantidad ?? 1),
    tipoDetalle: req.body.tipoDetalle || 'COBRO',
  })
}, 201))

detailsRouter.put('/:id', h(async (req) => {
  const d = await findById('transaction_details', req.params.id, 'Detalle')
  const { concepto, monto, cantidad, tipoDetalle } = req.body
  return update('transaction_details', d.id, {
    concepto,
    monto: monto !== undefined ? Number(monto) : undefined,
    cantidad: cantidad !== undefined ? Number(cantidad) : undefined,
    tipoDetalle,
  })
}))
detailsRouter.delete('/:id', h((req) => remove('transaction_details', req.params.id, 'Detalle')))

// ---------------- Transacciones ----------------
const router = Router()

router.get('/', h(() => query('SELECT * FROM transactions ORDER BY id ASC')))
dateRangeRoute(router, 'transactions', 'created_at')
router.get('/monto/mayor', h((req) =>
  query('SELECT * FROM transactions WHERE monto_total > $1 ORDER BY monto_total DESC', [Number(req.query.monto || 0)])))
router.get('/buscar', h((req) =>
  query('SELECT * FROM transactions WHERE descripcion ILIKE $1 ORDER BY id', [`%${req.query.texto || ''}%`])))
filterRoutes(router, 'transactions', {
  '/ultimas': { order: 'created_at DESC, id DESC', limit: 10 },
  '/usuario/:rut': { where: 'rut_usuario = $1' },
  '/usuario/:rut/ordenadas': { where: 'rut_usuario = $1', order: 'created_at DESC' },
  '/usuario/:rut/estado/:estado': { where: 'rut_usuario = $1 AND estado = $2' },
  '/tipo/:tipo': { where: 'tipo = $1' },
  '/estado/:estado': { where: 'estado = $1' },
})
countRoutes(router, 'transactions', {
  '/estadisticas/estado/:estado': 'estado',
  '/estadisticas/tipo/:tipo': 'tipo',
})
router.get('/:id', h((req) => findById('transactions', req.params.id, 'Transacción')))

function validarMonto(monto) {
  const n = Number(monto)
  if (!Number.isFinite(n) || n <= 0) throw badRequest('El monto total debe ser mayor a 0')
  return n
}

router.post('/', h(async (req) => {
  required(req.body, ['rutUsuario', 'tipo', 'montoTotal', 'descripcion'])
  const { rutUsuario, tipo, descripcion, referencia } = req.body
  await verificarUsuarioActivo(rutUsuario)
  return insert('transactions', {
    rutUsuario, tipo, montoTotal: validarMonto(req.body.montoTotal), estado: 'PENDIENTE',
    descripcion, referencia: referencia || null, createdAt: nowLocal(),
  })
}, 201))

router.put('/:id', h(async (req) => {
  const t = await findById('transactions', req.params.id, 'Transacción')
  const b = req.body
  return update('transactions', t.id, {
    rutUsuario: b.rutUsuario,
    tipo: b.tipo,
    montoTotal: b.montoTotal !== undefined ? validarMonto(b.montoTotal) : undefined,
    descripcion: b.descripcion,
    referencia: b.referencia,
    estado: b.estado || undefined,
  })
}))

router.patch('/:id/completar', h(async (req) => {
  const t = await findById('transactions', req.params.id, 'Transacción')
  if (t.estado !== 'PENDIENTE') throw badRequest(`Solo se pueden completar transacciones PENDIENTES. Estado actual: ${t.estado}`)
  return update('transactions', t.id, { estado: 'COMPLETADA', completadaAt: nowLocal() })
}))

router.patch('/:id/rechazar', h(async (req) => {
  const t = await findById('transactions', req.params.id, 'Transacción')
  if (t.estado !== 'PENDIENTE') throw badRequest(`Solo se pueden rechazar transacciones PENDIENTES. Estado actual: ${t.estado}`)
  return update('transactions', t.id, { estado: 'RECHAZADA' })
}))

router.patch('/:id/anular', h(async (req) => {
  const t = await findById('transactions', req.params.id, 'Transacción')
  if (t.estado === 'ANULADA') throw badRequest('La transacción ya está anulada')
  return update('transactions', t.id, { estado: 'ANULADA' })
}))

router.delete('/:id', h((req) => remove('transactions', req.params.id, 'Transacción')))

export default router
