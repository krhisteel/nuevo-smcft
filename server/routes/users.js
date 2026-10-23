// /api/v1/users y /api/v1/users/roles (antes UserService).
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, findById, insert, update, remove, required, toId, filterRoutes } from '../http.js'

const ROLES = ['ADMINISTRADOR', 'FISCALIZADOR', 'VIAJERO']

// Nunca se expone el hash de la contraseña
// eslint-disable-next-line no-unused-vars
const publico = ({ password, ...u }) => u
const publicos = (rows) => rows.map(publico)

// Usado por otros módulos para validar RUTs (propietarios, auditores, etc.)
export async function verificarUsuarioActivo(rut, etiqueta = 'usuario') {
  const usuario = await queryOne('SELECT * FROM users WHERE rut = $1', [rut])
  if (!usuario) throw badRequest(`El ${etiqueta} con RUT ${rut} no existe en el sistema`)
  if (!usuario.activo) throw badRequest(`El ${etiqueta} con RUT ${rut} está inactivo en el sistema`)
  return usuario
}

// ---------------- Roles ----------------
export const rolesRouter = Router()

rolesRouter.get('/', h(() => query('SELECT * FROM user_roles ORDER BY id ASC')))
filterRoutes(rolesRouter, 'user_roles', {
  '/ultimos': { order: 'id DESC', limit: 10 },
  '/usuario/:userId': { where: 'user_id = $1' },
  '/usuario/:userId/activos': { where: 'user_id = $1 AND activo = TRUE' },
  '/tipo/:rol': { where: 'rol = $1' },
  '/tipo/:rol/activos': { where: 'rol = $1 AND activo = TRUE' },
})
rolesRouter.get('/:id', h((req) => findById('user_roles', req.params.id, 'Rol')))

// Asigna un rol: desactiva los roles activos anteriores del usuario
rolesRouter.post('/', h(async (req) => {
  required(req.body, ['userId', 'rol'])
  if (!ROLES.includes(req.body.rol)) throw badRequest(`Rol inválido. Debe ser: ${ROLES.join(', ')}`)
  const userId = toId(req.body.userId)
  await findById('users', userId, 'Usuario')
  return transaction(async (q) => {
    await q('UPDATE user_roles SET activo = FALSE WHERE user_id = $1 AND activo = TRUE', [userId])
    await q('UPDATE users SET rol = $1 WHERE id = $2', [req.body.rol, userId])
    return insert('user_roles', { userId, rol: req.body.rol, activo: true }, q)
  })
}, 201))
rolesRouter.delete('/:id', h((req) => remove('user_roles', req.params.id, 'Rol')))

// ---------------- Usuarios ----------------
const router = Router()

router.get('/', h(async (req) => {
  if (req.query.buscar) {
    return publicos(await query('SELECT * FROM users WHERE nombre ILIKE $1 ORDER BY id', [`%${req.query.buscar}%`]))
  }
  return publicos(await query('SELECT * FROM users ORDER BY id ASC'))
}))

router.get('/email/:email', h(async (req) => {
  const u = await queryOne('SELECT * FROM users WHERE email = $1', [req.params.email])
  if (!u) throw notFound(`Usuario no encontrado con email: ${req.params.email}`)
  return publico(u)
}))

router.get('/rut/:rut', h(async (req) => {
  const u = await queryOne('SELECT * FROM users WHERE rut = $1', [req.params.rut])
  if (!u) throw notFound(`Usuario no encontrado con RUT: ${req.params.rut}`)
  return publico(u)
}))

const filtros = {
  '/activos': { where: 'activo = TRUE' },
  '/inactivos': { where: 'activo = FALSE' },
  '/activos/ordenados': { where: 'activo = TRUE', order: 'nombre ASC' },
  '/rol/:rol': { where: 'rol = $1' },
  '/rol/:rol/activos': { where: 'rol = $1 AND activo = TRUE' },
}
for (const [path, def] of Object.entries(filtros)) {
  const names = [...path.matchAll(/:(\w+)/g)].map((m) => m[1])
  router.get(path, h(async (req) => publicos(await query(
    `SELECT * FROM users WHERE ${def.where} ORDER BY ${def.order || 'id ASC'}`,
    names.map((n) => req.params[n]),
  ))))
}

router.get('/buscar', h(async (req) =>
  publicos(await query('SELECT * FROM users WHERE nombre ILIKE $1 ORDER BY id', [`%${req.query.nombre || ''}%`]))))

router.get('/:id', h(async (req) => publico(await findById('users', req.params.id, 'Usuario'))))

router.post('/', h(async (req) => {
  required(req.body, ['rut', 'nombre', 'email', 'password', 'rol'])
  const { rut, nombre, email, password, rol } = req.body
  if (!ROLES.includes(rol)) throw badRequest(`Rol inválido. Debe ser: ${ROLES.join(', ')}`)
  if (await queryOne('SELECT id FROM users WHERE rut = $1', [rut])) throw badRequest(`Ya existe un usuario con el RUT: ${rut}`)
  if (await queryOne('SELECT id FROM users WHERE email = $1', [email])) throw badRequest(`Ya existe un usuario con el email: ${email}`)
  const hash = await bcrypt.hash(password, 10)
  const nuevo = await insert('users', { rut, nombre, email, password: hash, rol, activo: true })
  await insert('user_roles', { userId: nuevo.id, rol, activo: true })
  return publico(nuevo)
}, 201))

router.put('/:id', h(async (req) => {
  const existente = await findById('users', req.params.id, 'Usuario')
  const { nombre, email, rol, password, activo } = req.body
  if (rol && !ROLES.includes(rol)) throw badRequest(`Rol inválido. Debe ser: ${ROLES.join(', ')}`)
  if (email && email !== existente.email &&
      await queryOne('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, existente.id])) {
    throw badRequest(`Ya existe un usuario con el email: ${email}`)
  }
  const cambios = { nombre, email, rol, activo: typeof activo === 'boolean' ? activo : undefined }
  if (password) cambios.password = await bcrypt.hash(password, 10)
  return publico(await update('users', existente.id, cambios))
}))

// Eliminación lógica: el usuario queda inactivo
router.delete('/:id', h(async (req) => {
  const existente = await findById('users', req.params.id, 'Usuario')
  await update('users', existente.id, { activo: false })
}))

export default router
