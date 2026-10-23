// Autenticación con JWT. Los usuarios y roles salen de las tablas
// USUARIO, PERSONA, USUARIO_ROL y ROL del esquema SMCFT.
import jwt from 'jsonwebtoken'
import { HttpError } from './http.js'

const DEV_SECRET = 'smcft_clave_super_secreta_2025_sistema_fronterizo'

const secret = () => process.env.JWT_SECRET || DEV_SECRET
const expirationSec = () => Math.floor(Number(process.env.JWT_EXPIRATION_MS || 86400000) / 1000)

export function generarToken(usuario) {
  return jwt.sign(
    { rol: usuario.rol, idUsuario: usuario.idUsuario, idPersona: usuario.idPersona, rut: usuario.rut },
    secret(),
    { subject: usuario.email, algorithm: 'HS256', expiresIn: expirationSec() },
  )
}

export function decodificar(token) {
  try {
    return jwt.verify(token, secret(), { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

// Rutas accesibles sin token
const publicas = [
  ['POST', /^\/auth\/login$/],
  ['GET', /^\/health$/],
]

export function requireAuth(req, res, next) {
  if (publicas.some(([m, re]) => m === req.method && re.test(req.path))) return next()
  const header = req.headers.authorization || ''
  const claims = header.startsWith('Bearer ') && decodificar(header.slice(7))
  if (!claims) return next(new HttpError(401, 'Sesión inválida o expirada'))
  req.user = {
    email: claims.sub, rol: claims.rol, idUsuario: claims.idUsuario, idPersona: claims.idPersona, rut: claims.rut,
  }
  next()
}
