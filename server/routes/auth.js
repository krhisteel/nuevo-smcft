// /api/v1/auth — login, logout, validación de tokens, blacklist e intentos.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '../db.js'
import { h, HttpError, badRequest, findById, remove, required, filterRoutes } from '../http.js'
import { generarToken, decodificar, extraerToken, enBlacklist } from '../auth.js'

const router = Router()

const ip = (req) => (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 45)

async function registrarIntento(email, exitoso, req) {
  await query('INSERT INTO login_attempts (email, exitoso, ip_address) VALUES ($1, $2, $3)', [email, exitoso, ip(req)])
}

router.post('/login', h(async (req) => {
  required(req.body, ['email', 'password'])
  const { email, password } = req.body
  const usuario = await queryOne('SELECT * FROM users WHERE email = $1', [email])
  if (!usuario) {
    await registrarIntento(email, false, req)
    throw new HttpError(401, 'Credenciales incorrectas')
  }
  if (!usuario.activo) {
    await registrarIntento(email, false, req)
    throw new HttpError(401, 'El usuario está inactivo')
  }
  if (!(await bcrypt.compare(password, usuario.password))) {
    await registrarIntento(email, false, req)
    throw new HttpError(401, 'Credenciales incorrectas')
  }
  await registrarIntento(email, true, req)
  return { token: generarToken(usuario.email, usuario.rol), rol: usuario.rol, mensaje: 'Login exitoso' }
}))

router.post('/logout', h(async (req) => {
  const token = extraerToken(req)
  if (!token || !decodificar(token)) throw badRequest('El token ya es inválido o ha expirado')
  if (await enBlacklist(token)) throw badRequest('El token ya fue invalidado')
  const email = decodificar(token).sub
  const guardado = await queryOne(
    'INSERT INTO token_blacklist (token, email) VALUES ($1, $2) RETURNING *', [token, email],
  )
  // Vincula el último login exitoso con el token invalidado
  await query(
    `UPDATE login_attempts SET token_blacklist_id = $1
     WHERE id = (SELECT id FROM login_attempts WHERE email = $2 AND exitoso = TRUE ORDER BY id DESC LIMIT 1)`,
    [guardado.id, email],
  )
  return { mensaje: 'Logout exitoso' }
}))

router.get('/validar', h(async (req) => {
  const token = extraerToken(req)
  const valido = !!(token && decodificar(token) && !(await enBlacklist(token)))
  return { valido }
}))

router.get('/rol', h(async (req) => {
  const token = extraerToken(req)
  const claims = token && decodificar(token)
  if (!claims || (await enBlacklist(token))) throw new HttpError(401, 'Token inválido o expirado')
  return { rol: claims.rol }
}))

// ---- Blacklist ----
router.get('/blacklist', h(() => query('SELECT * FROM token_blacklist ORDER BY id ASC')))
router.get('/blacklist/ultimos', h(() => query('SELECT * FROM token_blacklist ORDER BY id DESC LIMIT 10')))
router.get('/blacklist/historial/:email', h((req) =>
  query('SELECT * FROM token_blacklist WHERE email = $1 ORDER BY invalidado_at DESC', [req.params.email])))
router.get('/blacklist/:id', h((req) => findById('token_blacklist', req.params.id, 'Registro')))
router.delete('/blacklist/:id', h((req) => remove('token_blacklist', req.params.id, 'Registro')))

// ---- Intentos de login ----
router.get('/intentos', h(() => query('SELECT * FROM login_attempts ORDER BY id ASC')))
router.get('/intentos/rango', h((req) => {
  required(req.query, ['desde', 'hasta'])
  return query('SELECT * FROM login_attempts WHERE intento_at BETWEEN $1 AND $2 ORDER BY intento_at ASC',
    [req.query.desde, req.query.hasta])
}))
filterRoutes(router, 'login_attempts', {
  '/intentos/ultimos': { order: 'intento_at DESC, id DESC', limit: 10 },
  '/intentos/email/:email': { where: 'email = $1', order: 'intento_at DESC' },
  '/intentos/fallidos/:email': { where: 'email = $1 AND exitoso = FALSE', order: 'id ASC' },
})
router.get('/intentos/:id', h((req) => findById('login_attempts', req.params.id, 'Intento')))
router.delete('/intentos/:id', h((req) => remove('login_attempts', req.params.id, 'Intento')))

export default router
