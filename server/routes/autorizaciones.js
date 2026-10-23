// /api/v1/autorizaciones — AUTORIZACION_MENOR.
// sp_registrar_cruce exige una autorización VIGENTE para viajeros menores de 18 años.
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { personaPorRut } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']
const ESTADOS = ['VIGENTE', 'REVOCADA', 'VENCIDA']
router.use(permitir(...STAFF))

const SELECT = `
  SELECT a.ID_AUTORIZACION AS id, a.TIPO_PERMISO, a.FECHA_EMISION, a.ESTADO,
         m.RUT AS rut_menor, m.NOMBRES || ' ' || m.APELLIDOS AS menor,
         TRUNC(MONTHS_BETWEEN(SYSDATE, m.FECHA_NACIMIENTO) / 12) AS edad_menor,
         r.RUT AS rut_representante, r.NOMBRES || ' ' || r.APELLIDOS AS representante,
         d.NUMERO AS numero_documento, d.TIPO_DOCUMENTO
  FROM AUTORIZACION_MENOR a
  JOIN PERSONA m ON m.ID_PERSONA = a.ID_MENOR
  JOIN PERSONA r ON r.ID_PERSONA = a.ID_REPRESENTANTE
  JOIN DOCUMENTO d ON d.ID_DOCUMENTO = a.ID_DOCUMENTO`

router.get('/', h(() => query(`${SELECT} ORDER BY a.FECHA_EMISION DESC, a.ID_AUTORIZACION DESC`)))

router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['rutMenor', 'rutRepresentante', 'numeroDocumento', 'tipoPermiso'])
  const id = await transaction(async (db) => {
    const menor = await personaPorRut(req.body.rutMenor, db)
    const edad = await db.queryOne('SELECT TRUNC(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO) / 12) AS edad FROM PERSONA WHERE ID_PERSONA = :p', { p: menor.id })
    if (edad.edad >= 18) throw badRequest('La persona indicada no es menor de edad')
    const rep = await personaPorRut(req.body.rutRepresentante, db)
    if (rep.id === menor.id) throw badRequest('El representante debe ser otra persona')
    const doc = await db.queryOne('SELECT ID_DOCUMENTO AS id FROM DOCUMENTO WHERE NUMERO = :n', { n: String(req.body.numeroDocumento).trim() })
    if (!doc) throw badRequest(`No existe el documento número ${req.body.numeroDocumento}. Regístrelo primero en Documentos.`)
    const nuevo = await db.nextId('AUTORIZACION_MENOR', 'ID_AUTORIZACION', 'SEQ_AUTORIZACION')
    await db.execute(
      `INSERT INTO AUTORIZACION_MENOR (ID_AUTORIZACION, ID_MENOR, ID_REPRESENTANTE, ID_DOCUMENTO, TIPO_PERMISO, FECHA_EMISION, ESTADO)
       VALUES (:id, :m, :r, :d, :t, NVL(TO_DATE(:f, 'YYYY-MM-DD'), TRUNC(SYSDATE)), 'VIGENTE')`,
      { id: nuevo, m: menor.id, r: rep.id, d: doc.id, t: String(req.body.tipoPermiso).toUpperCase(), f: texto(req.body.fechaEmision) })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE a.ID_AUTORIZACION = :id`, { id })
}, 201))

router.patch('/:id/estado', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const estado = String(req.body?.estado || '').toUpperCase()
  if (!ESTADOS.includes(estado)) throw badRequest(`Estado inválido. Debe ser: ${ESTADOS.join(', ')}`)
  const r = await transaction((db) => db.execute('UPDATE AUTORIZACION_MENOR SET ESTADO = :e WHERE ID_AUTORIZACION = :id', { e: estado, id }))
  if (!r.rowsAffected) throw notFound('Autorización no encontrada')
  return queryOne(`${SELECT} WHERE a.ID_AUTORIZACION = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM AUTORIZACION_MENOR WHERE ID_AUTORIZACION = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Autorización no encontrada')
}))

export default router
