// /api/v1/auth — inicio de sesión contra USUARIO / USUARIO_ROL / ROL.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, transaction } from '../db.js'
import { h, HttpError, required, permitir } from '../http.js'
import { generarToken } from '../auth.js'

const router = Router()

const ip = (req) => (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 45)

// Rol activo más reciente del usuario
export const ROL_ACTIVO_SQL = `(
  SELECT r.NOMBRE_ROL FROM USUARIO_ROL ur JOIN ROL r ON r.ID_ROL = ur.ID_ROL
  WHERE ur.ID_USUARIO = u.ID_USUARIO AND ur.ACTIVO = 'S'
  ORDER BY ur.FECHA_ASIGNACION DESC, ur.ID_USUARIO_ROL DESC
  FETCH FIRST 1 ROWS ONLY)`

router.post('/login', h(async (req) => {
  required(req.body, ['email', 'password'])
  const email = String(req.body.email).trim().toLowerCase()

  return transaction(async (db) => {
    const usuario = await db.queryOne(
      `SELECT u.ID_USUARIO, u.ID_PERSONA, u.EMAIL, u.PASSWORD_HASH, u.ACTIVO, p.RUT,
              p.NOMBRES || ' ' || p.APELLIDOS AS nombre, ${ROL_ACTIVO_SQL} AS rol
       FROM USUARIO u JOIN PERSONA p ON p.ID_PERSONA = u.ID_PERSONA
       WHERE LOWER(u.EMAIL) = :email`,
      { email },
    )

    const registrar = async (exitoso) => {
      const id = await db.nextId('LOGIN_ATTEMPT', 'ID_INTENTO')
      await db.execute(
        `INSERT INTO LOGIN_ATTEMPT (ID_INTENTO, ID_USUARIO, EXITOSO, IP_ADDRESS, FECHA_INTENTO)
         VALUES (:id, :u, :e, :ip, SYSTIMESTAMP)`,
        { id, u: usuario?.idUsuario ?? null, e: exitoso ? 'S' : 'N', ip: ip(req) || null },
      )
    }

    let error = null
    if (!usuario) error = 'Credenciales incorrectas'
    else if (!usuario.activo) error = 'El usuario está inactivo'
    else if (!String(usuario.passwordHash).startsWith('$2')) error = 'Este usuario no tiene acceso web habilitado'
    else if (!(await bcrypt.compare(String(req.body.password), usuario.passwordHash))) error = 'Credenciales incorrectas'
    else if (!usuario.rol) error = 'El usuario no tiene un rol asignado'

    await registrar(!error)
    if (error) {
      // Se confirma el intento fallido antes de responder con error
      await db.execute('COMMIT')
      throw new HttpError(401, error)
    }

    return {
      token: generarToken(usuario),
      rol: usuario.rol,
      email: usuario.email,
      rut: usuario.rut,
      nombre: usuario.nombre,
      idPersona: usuario.idPersona,
    }
  })
}))

// El token es autocontenido: cerrar sesión solo lo descarta en el navegador
router.post('/logout', h(() => ({ mensaje: 'Sesión cerrada' })))

router.get('/me', h((req) => req.user))

// Historial de intentos de inicio de sesión (tabla LOGIN_ATTEMPT)
router.get('/intentos', permitir('ADMINISTRADOR', 'AUDITOR'), h(() => query(
  `SELECT l.ID_INTENTO AS id, l.EXITOSO, l.IP_ADDRESS, l.FECHA_INTENTO, u.EMAIL
   FROM LOGIN_ATTEMPT l LEFT JOIN USUARIO u ON u.ID_USUARIO = l.ID_USUARIO
   ORDER BY l.FECHA_INTENTO DESC, l.ID_INTENTO DESC
   FETCH FIRST 200 ROWS ONLY`)))

export default router
