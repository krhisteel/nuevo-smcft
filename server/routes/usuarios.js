// /api/v1/usuarios — USUARIO + USUARIO_ROL + ROL (+ FUNCIONARIO para el personal).
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne, transaction, sn } from '../db.js'
import { h, badRequest, notFound, required, permitir, texto, toId } from '../http.js'
import { normalizarRut } from '../lookup.js'
import { ROL_ACTIVO_SQL } from './auth.js'

const router = Router()
router.use(permitir('ADMINISTRADOR'))

const SELECT = `
  SELECT u.ID_USUARIO AS id, u.ID_PERSONA, p.RUT, p.NOMBRES, p.APELLIDOS,
         p.NOMBRES || ' ' || p.APELLIDOS AS nombre, u.EMAIL, u.ACTIVO, u.FECHA_CREACION,
         ${ROL_ACTIVO_SQL} AS rol,
         f.INSTITUCION, f.CARGO,
         CASE WHEN u.PASSWORD_HASH LIKE '$2%' THEN 'S' ELSE 'N' END AS acceso_web
  FROM USUARIO u
  JOIN PERSONA p ON p.ID_PERSONA = u.ID_PERSONA
  LEFT JOIN FUNCIONARIO f ON f.ID_PERSONA = u.ID_PERSONA`

const CARGOS = {
  ADMINISTRADOR: ['ADUANAS', 'ADMINISTRADOR'],
  FISCALIZADOR: ['ADUANAS', 'FISCALIZADOR'],
  INSPECTOR_SAG: ['SAG', 'INSPECTOR SANITARIO'],
  AUDITOR: ['ADUANAS', 'AUDITOR'],
}

async function idRol(db, nombre) {
  const r = await db.queryOne('SELECT ID_ROL AS id FROM ROL WHERE NOMBRE_ROL = :n', { n: nombre })
  if (!r) throw badRequest(`Rol inválido: ${nombre}`)
  return r.id
}

// Deja un único rol activo y registra al personal como FUNCIONARIO
async function asignarRol(db, idUsuario, idPersona, rol) {
  const id = await idRol(db, rol)
  const actual = await db.queryOne(
    `SELECT ID_USUARIO_ROL AS id FROM USUARIO_ROL WHERE ID_USUARIO = :u AND ID_ROL = :r AND ACTIVO = 'S'`,
    { u: idUsuario, r: id })
  if (!actual) {
    await db.execute(`UPDATE USUARIO_ROL SET ACTIVO = 'N' WHERE ID_USUARIO = :u AND ACTIVO = 'S'`, { u: idUsuario })
    const nuevo = await db.nextId('USUARIO_ROL', 'ID_USUARIO_ROL')
    await db.execute(
      `INSERT INTO USUARIO_ROL (ID_USUARIO_ROL, ID_USUARIO, ID_ROL, FECHA_ASIGNACION, ACTIVO)
       VALUES (:id, :u, :r, SYSTIMESTAMP, 'S')`, { id: nuevo, u: idUsuario, r: id })
  }
  if (CARGOS[rol]) {
    const f = await db.queryOne('SELECT ID_FUNCIONARIO AS id FROM FUNCIONARIO WHERE ID_PERSONA = :p', { p: idPersona })
    if (f) {
      await db.execute('UPDATE FUNCIONARIO SET INSTITUCION = :i, CARGO = :c WHERE ID_FUNCIONARIO = :id',
        { id: f.id, i: CARGOS[rol][0], c: CARGOS[rol][1] })
    } else {
      const nuevo = await db.nextId('FUNCIONARIO', 'ID_FUNCIONARIO')
      await db.execute(
        'INSERT INTO FUNCIONARIO (ID_FUNCIONARIO, ID_PERSONA, INSTITUCION, CARGO) VALUES (:id, :p, :i, :c)',
        { id: nuevo, p: idPersona, i: CARGOS[rol][0], c: CARGOS[rol][1] })
    }
  }
}

router.get('/', h(() => query(`${SELECT} ORDER BY u.ID_USUARIO`)))
router.get('/roles', h(() => query('SELECT ID_ROL AS id, NOMBRE_ROL AS nombre FROM ROL ORDER BY ID_ROL')))

router.get('/:id', h(async (req) => {
  const u = await queryOne(`${SELECT} WHERE u.ID_USUARIO = :id`, { id: toId(req.params.id) })
  if (!u) throw notFound('Usuario no encontrado')
  return u
}))

// Crea el usuario. Si la persona (RUT) no existe se crea con los datos enviados.
router.post('/', h(async (req) => {
  required(req.body, ['rut', 'email', 'password', 'rol'])
  const rut = normalizarRut(req.body.rut)
  const email = String(req.body.email).trim().toLowerCase()
  const hash = await bcrypt.hash(String(req.body.password), 10)

  const id = await transaction(async (db) => {
    let persona = await db.queryOne('SELECT ID_PERSONA AS id FROM PERSONA WHERE RUT = :r', { r: rut })
    if (!persona) {
      required(req.body, ['nombres', 'apellidos', 'fechaNacimiento'])
      const idPersona = await db.nextId('PERSONA', 'ID_PERSONA', 'SEQ_PERSONA')
      await db.execute(
        `INSERT INTO PERSONA (ID_PERSONA, RUT, NOMBRES, APELLIDOS, NACIONALIDAD, FECHA_NACIMIENTO)
         VALUES (:id, :rut, :n, :a, :nac, TO_DATE(:f, 'YYYY-MM-DD'))`,
        { id: idPersona, rut, n: texto(req.body.nombres), a: texto(req.body.apellidos),
          nac: (texto(req.body.nacionalidad) || 'CHILENA').toUpperCase(), f: texto(req.body.fechaNacimiento) })
      persona = { id: idPersona }
    } else if (await db.queryOne('SELECT ID_USUARIO FROM USUARIO WHERE ID_PERSONA = :p', { p: persona.id })) {
      throw badRequest(`La persona con RUT ${rut} ya tiene un usuario`)
    }
    if (await db.queryOne('SELECT ID_USUARIO FROM USUARIO WHERE LOWER(EMAIL) = :e', { e: email })) {
      throw badRequest(`Ya existe un usuario con el email ${email}`)
    }
    const idUsuario = await db.nextId('USUARIO', 'ID_USUARIO', 'SEQ_USUARIO')
    await db.execute(
      `INSERT INTO USUARIO (ID_USUARIO, ID_PERSONA, EMAIL, PASSWORD_HASH, ACTIVO, FECHA_CREACION)
       VALUES (:id, :p, :e, :h, 'S', SYSTIMESTAMP)`, { id: idUsuario, p: persona.id, e: email, h: hash })
    await asignarRol(db, idUsuario, persona.id, req.body.rol)
    return idUsuario
  })
  return queryOne(`${SELECT} WHERE u.ID_USUARIO = :id`, { id })
}, 201))

router.put('/:id', h(async (req) => {
  const id = toId(req.params.id)
  await transaction(async (db) => {
    const u = await db.queryOne('SELECT ID_USUARIO AS id, ID_PERSONA FROM USUARIO WHERE ID_USUARIO = :id', { id })
    if (!u) throw notFound('Usuario no encontrado')
    const b = req.body
    if (texto(b.email)) {
      const email = b.email.trim().toLowerCase()
      if (await db.queryOne('SELECT 1 FROM USUARIO WHERE LOWER(EMAIL) = :e AND ID_USUARIO <> :id', { e: email, id })) {
        throw badRequest(`Ya existe un usuario con el email ${email}`)
      }
      await db.execute('UPDATE USUARIO SET EMAIL = :e WHERE ID_USUARIO = :id', { e: email, id })
    }
    if (texto(b.password)) {
      await db.execute('UPDATE USUARIO SET PASSWORD_HASH = :h WHERE ID_USUARIO = :id',
        { h: await bcrypt.hash(String(b.password), 10), id })
    }
    if (b.activo !== undefined) {
      await db.execute('UPDATE USUARIO SET ACTIVO = :a WHERE ID_USUARIO = :id', { a: sn(b.activo), id })
    }
    if (texto(b.nombres) && texto(b.apellidos)) {
      await db.execute('UPDATE PERSONA SET NOMBRES = :n, APELLIDOS = :a WHERE ID_PERSONA = :p',
        { n: texto(b.nombres), a: texto(b.apellidos), p: u.idPersona })
    }
    if (texto(b.rol)) await asignarRol(db, id, u.idPersona, b.rol)
  })
  return queryOne(`${SELECT} WHERE u.ID_USUARIO = :id`, { id })
}))

// Eliminación lógica: el usuario queda inactivo (se conserva su historial)
router.delete('/:id', h(async (req) => {
  const id = toId(req.params.id)
  if (id === req.user.idUsuario) throw badRequest('No puede desactivar su propio usuario')
  const r = await transaction((db) => db.execute(`UPDATE USUARIO SET ACTIVO = 'N' WHERE ID_USUARIO = :id`, { id }))
  if (!r.rowsAffected) throw notFound('Usuario no encontrado')
}))

export default router
