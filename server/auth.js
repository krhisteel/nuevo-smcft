// Autenticación JWT (antes AuthService + JwtFilter de cada microservicio).
import jwt from 'jsonwebtoken'
import { queryOne } from './db.js'
import { HttpError } from './http.js'

const DEV_SECRET = 'smcft_clave_super_secreta_2025_sistema_fronterizo'

function secret() {
  if (!process.env.JWT_SECRET && process.env.VERCEL_ENV === 'production') {
    console.warn('[SMCFT] JWT_SECRET no configurado: usando clave de desarrollo.')
  }
  return process.env.JWT_SECRET || DEV_SECRET
}

const expirationMs = () => Number(process.env.JWT_EXPIRATION_MS || 86400000)

export function generarToken(email, rol) {
  return jwt.sign({ rol }, secret(), {
    subject: email,
    algorithm: 'HS256',
    expiresIn: Math.floor(expirationMs() / 1000),
  })
}

// Devuelve los claims si la firma es válida y no expiró; si no, null.
export function decodificar(token) {
  try {
    return jwt.verify(token, secret(), { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

export function extraerToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

export async function enBlacklist(token) {
  return !!(await queryOne('SELECT id FROM token_blacklist WHERE token = $1 FETCH FIRST 1 ROWS ONLY', [token]))
}

// Rutas accesibles sin token (igual que los permitAll de los SecurityConfig).
const publicas = [
  ['POST', /^\/auth\/login$/],
  ['GET', /^\/auth\/validar$/],
  ['GET', /^\/auth\/rol$/],
  ['POST', /^\/users$/],
  ['GET', /^\/health$/],
]

export async function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next()
  if (publicas.some(([m, re]) => m === req.method && re.test(req.path))) return next()
  try {
    const token = extraerToken(req)
    const claims = token && decodificar(token)
    if (!claims || (await enBlacklist(token))) {
      throw new HttpError(401, 'Token inválido, expirado o ausente')
    }
    req.user = { email: claims.sub, rol: claims.rol }
    req.token = token
    next()
  } catch (err) {
    next(err)
  }
}
