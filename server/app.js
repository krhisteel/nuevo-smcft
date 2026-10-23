// Aplicación Express única: reemplaza al API Gateway, Eureka y los microservicios.
// Trabaja sobre el esquema SMCFT de Oracle Cloud y sus objetos PL/SQL.
import express from 'express'
import { requireAuth } from './auth.js'
import { traducirErrorOracle } from './http.js'
import { queryOne } from './db.js'
import authRouter from './routes/auth.js'
import dashboardRouter from './routes/dashboard.js'
import personasRouter from './routes/personas.js'
import usuariosRouter from './routes/usuarios.js'
import vehiculosRouter from './routes/vehiculos.js'
import documentosRouter from './routes/documentos.js'
import { pasosRouter, categoriasRouter } from './routes/catalogos.js'
import crucesRouter from './routes/cruces.js'
import declaracionesRouter from './routes/declaraciones.js'
import inspeccionesRouter from './routes/inspecciones.js'
import autorizacionesRouter from './routes/autorizaciones.js'
import plazosRouter from './routes/plazos.js'
import notificacionesRouter from './routes/notificaciones.js'
import reportesRouter from './routes/reportes.js'
import auditoriasRouter from './routes/auditorias.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

const api = express.Router()

// Comprueba la conexión con Oracle y que el package del informe esté compilado
api.get('/health', async (req, res, next) => {
  try {
    const db = await queryOne(
      `SELECT (SELECT COUNT(*) FROM USER_OBJECTS WHERE STATUS = 'INVALID') AS objetos_invalidos,
              (SELECT COUNT(*) FROM PERSONA) AS personas
       FROM DUAL`)
    res.json({ status: 'UP', app: 'SMCFT', baseDatos: 'Oracle', ...db })
  } catch (err) {
    next(err)
  }
})

api.use(requireAuth)
api.use('/auth', authRouter)
api.use('/', dashboardRouter)
api.use('/personas', personasRouter)
api.use('/usuarios', usuariosRouter)
api.use('/vehiculos', vehiculosRouter)
api.use('/documentos', documentosRouter)
api.use('/pasos', pasosRouter)
api.use('/categorias', categoriasRouter)
api.use('/cruces', crucesRouter)
api.use('/declaraciones', declaracionesRouter)
api.use('/inspecciones', inspeccionesRouter)
api.use('/autorizaciones', autorizacionesRouter)
api.use('/plazos', plazosRouter)
api.use('/notificaciones', notificacionesRouter)
api.use('/reportes', reportesRouter)
api.use('/auditorias', auditoriasRouter)

api.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` }))

app.use('/api/v1', api)

// Manejo centralizado de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500
  let message = err.message || 'Error interno del servidor'
  const oracle = traducirErrorOracle(err)
  if (oracle) {
    ({ status, message } = oracle)
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'JSON inválido en el cuerpo de la petición'
  } else if (status >= 500 && /NJS-|ORA-|DPI-/.test(message)) {
    message = `Error de base de datos: ${message.split('\n')[0]}`
  }
  if (status >= 500) console.error('[SMCFT]', err)
  res.status(status).json({ error: message, message })
})

export default app
