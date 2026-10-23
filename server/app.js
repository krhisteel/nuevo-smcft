// Aplicación Express única: reemplaza al API Gateway, Eureka y los 12 microservicios.
import express from 'express'
import { ensureReady } from './db.js'
import { requireAuth } from './auth.js'
import authRouter from './routes/auth.js'
import usersRouter, { rolesRouter } from './routes/users.js'
import vehiclesRouter, { documentsRouter } from './routes/vehicles.js'
import entriesRouter, { entryItemsRouter } from './routes/entries.js'
import crossingsRouter, { crossingItemsRouter } from './routes/crossings.js'
import sanitaryRouter, { sanitaryItemsRouter } from './routes/sanitary.js'
import deadlinesRouter, { alertsRouter } from './routes/deadlines.js'
import itemsRouter, { categoriesRouter } from './routes/items.js'
import transactionsRouter, { detailsRouter } from './routes/transactions.js'
import reportsRouter, { reportDetailsRouter } from './routes/reports.js'
import notificationsRouter, { recipientsRouter } from './routes/notifications.js'
import auditsRouter, { auditDetailsRouter } from './routes/audits.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

const api = express.Router()

// Inicializa la base (esquema + datos iniciales) antes de atender la primera petición
api.use(async (req, res, next) => {
  try {
    await ensureReady()
    next()
  } catch (err) {
    next(err)
  }
})

api.get('/health', (req, res) => res.json({ status: 'UP', app: 'SMCFT' }))
api.use(requireAuth)

// Los sub-recursos se montan antes que su recurso padre para que
// rutas como /entries/items no sean capturadas por /entries/:id
api.use('/auth', authRouter)
api.use('/users/roles', rolesRouter)
api.use('/users', usersRouter)
api.use('/vehicles/documentos', documentsRouter)
api.use('/vehicles', vehiclesRouter)
api.use('/entries/items', entryItemsRouter)
api.use('/entries', entriesRouter)
api.use('/border-crossings/items', crossingItemsRouter)
api.use('/border-crossings', crossingsRouter)
api.use('/sanitary/items', sanitaryItemsRouter)
api.use('/sanitary', sanitaryRouter)
api.use('/deadline-alerts', alertsRouter)
api.use('/deadlines', deadlinesRouter)
api.use('/item-categories', categoriesRouter)
api.use('/items', itemsRouter)
api.use('/transaction-details', detailsRouter)
api.use('/transactions', transactionsRouter)
api.use('/report-details', reportDetailsRouter)
api.use('/reports', reportsRouter)
api.use('/notification-recipients', recipientsRouter)
api.use('/notifications', notificationsRouter)
api.use('/audit-details', auditDetailsRouter)
api.use('/audits', auditsRouter)

api.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` }))

app.use('/api/v1', api)

// Manejo centralizado de errores (antes GlobalExceptionHandler)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500
  let message = err.message || 'Error interno del servidor'
  if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'JSON inválido en el cuerpo de la petición'
  } else if (err.code === '23505') {
    status = 400
    message = `Registro duplicado: ${err.detail || message}`
  } else if (err.code === '23503') {
    status = 400
    message = `Referencia inválida: ${err.detail || message}`
  } else if (['22P02', '22007', '22008', '23502', '22001'].includes(err.code)) {
    status = 400
  }
  if (status >= 500) console.error('[SMCFT]', err)
  res.status(status).json({ error: message, message })
})

export default app
