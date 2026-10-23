// /api/v1/personas — tabla PERSONA (viajeros, propietarios y funcionarios).
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { normalizarRut } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']

const SELECT = `
  SELECT p.ID_PERSONA AS id, p.RUT, p.NOMBRES, p.APELLIDOS, p.NOMBRES || ' ' || p.APELLIDOS AS nombre,
         p.NACIONALIDAD, p.FECHA_NACIMIENTO,
         TRUNC(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) AS edad,
         (SELECT COUNT(*) FROM AUTORIZACION_MENOR a WHERE a.ID_MENOR = p.ID_PERSONA AND a.ESTADO = 'VIGENTE') AS autorizaciones_vigentes,
         (SELECT COUNT(*) FROM USUARIO u WHERE u.ID_PERSONA = p.ID_PERSONA) AS tiene_usuario
  FROM PERSONA p`

router.get('/', permitir(...STAFF), h((req) => {
  const q = texto(req.query.q)
  return q
    ? query(`${SELECT} WHERE UPPER(p.RUT || ' ' || p.NOMBRES || ' ' || p.APELLIDOS) LIKE UPPER(:q) ORDER BY p.APELLIDOS, p.NOMBRES`, { q: `%${q}%` })
    : query(`${SELECT} ORDER BY p.APELLIDOS, p.NOMBRES`)
}))

router.get('/rut/:rut', permitir(...STAFF), h(async (req) => {
  const p = await queryOne(`${SELECT} WHERE p.RUT = :r`, { r: normalizarRut(req.params.rut) })
  if (!p) throw notFound(`No existe una persona con RUT ${req.params.rut}`)
  return p
}))

router.get('/:id', permitir(...STAFF), h(async (req) => {
  const p = await queryOne(`${SELECT} WHERE p.ID_PERSONA = :id`, { id: toId(req.params.id) })
  if (!p) throw notFound('Persona no encontrada')
  return p
}))

function datos(body) {
  return {
    nombres: texto(body.nombres),
    apellidos: texto(body.apellidos),
    nac: (texto(body.nacionalidad) || 'CHILENA').toUpperCase(),
    fnac: texto(body.fechaNacimiento),
  }
}

router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['rut', 'nombres', 'apellidos', 'fechaNacimiento'])
  const rut = normalizarRut(req.body.rut)
  const id = await transaction(async (db) => {
    const nuevo = await db.nextId('PERSONA', 'ID_PERSONA', 'SEQ_PERSONA')
    await db.execute(
      `INSERT INTO PERSONA (ID_PERSONA, RUT, NOMBRES, APELLIDOS, NACIONALIDAD, FECHA_NACIMIENTO)
       VALUES (:id, :rut, :nombres, :apellidos, :nac, TO_DATE(:fnac, 'YYYY-MM-DD'))`,
      { id: nuevo, rut, ...datos(req.body) },
    )
    return nuevo
  })
  return queryOne(`${SELECT} WHERE p.ID_PERSONA = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['rut', 'nombres', 'apellidos', 'fechaNacimiento'])
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    `UPDATE PERSONA SET RUT = :rut, NOMBRES = :nombres, APELLIDOS = :apellidos, NACIONALIDAD = :nac,
            FECHA_NACIMIENTO = TO_DATE(:fnac, 'YYYY-MM-DD')
     WHERE ID_PERSONA = :id`,
    { id, rut: normalizarRut(req.body.rut), ...datos(req.body) },
  ))
  if (!r.rowsAffected) throw notFound('Persona no encontrada')
  return queryOne(`${SELECT} WHERE p.ID_PERSONA = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM PERSONA WHERE ID_PERSONA = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Persona no encontrada')
}))

export default router
