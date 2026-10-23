// /api/v1/documentos — tabla DOCUMENTO.
// Cada INSERT/UPDATE/DELETE dispara TRG_DOCUMENTO_AUDIT (fila) y
// TRG_DOCUMENTO_SENTENCIA (sentencia), que registran la auditoría automáticamente.
import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { h, badRequest, notFound, required, permitir, STAFF, texto, toId } from '../http.js'
import { personaPorRut, vehiculoPorPatente } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']

const SELECT = `
  SELECT d.ID_DOCUMENTO AS id, d.TIPO_DOCUMENTO, d.NUMERO, d.FECHA_EMISION, d.FECHA_VENCIMIENTO, d.ESTADO,
         p.RUT AS rut_persona, p.NOMBRES || ' ' || p.APELLIDOS AS persona, v.PATENTE,
         CASE WHEN d.ID_PERSONA IS NOT NULL THEN 'PERSONA' ELSE 'VEHICULO' END AS titular_tipo,
         CASE WHEN d.FECHA_VENCIMIENTO < TRUNC(SYSDATE) THEN 'S' ELSE 'N' END AS vencido
  FROM DOCUMENTO d
  LEFT JOIN PERSONA p ON p.ID_PERSONA = d.ID_PERSONA
  LEFT JOIN VEHICULO v ON v.ID_VEHICULO = d.ID_VEHICULO`

router.get('/', permitir(...STAFF), h(() => query(`${SELECT} ORDER BY d.ID_DOCUMENTO DESC`)))

router.get('/:id', permitir(...STAFF), h(async (req) => {
  const d = await queryOne(`${SELECT} WHERE d.ID_DOCUMENTO = :id`, { id: toId(req.params.id) })
  if (!d) throw notFound('Documento no encontrado')
  return d
}))

// Un documento pertenece a una persona (RUT) o a un vehículo (patente), nunca a ambos
async function datos(db, b) {
  required(b, ['tipoDocumento', 'numero'])
  const rut = texto(b.rutPersona)
  const patente = texto(b.patente)
  if (!!rut === !!patente) throw badRequest('Indique el RUT de la persona o la patente del vehículo (solo uno)')
  return {
    tipo: String(b.tipoDocumento).toUpperCase(),
    numero: String(b.numero).trim(),
    emision: texto(b.fechaEmision),
    vencimiento: texto(b.fechaVencimiento),
    persona: rut ? (await personaPorRut(rut, db)).id : null,
    vehiculo: patente ? (await vehiculoPorPatente(patente, db)).id : null,
    estado: (texto(b.estado) || 'VIGENTE').toUpperCase(),
  }
}

router.post('/', permitir(...EDITORES), h(async (req) => {
  const id = await transaction(async (db) => {
    const d = await datos(db, req.body)
    const nuevo = await db.nextId('DOCUMENTO', 'ID_DOCUMENTO', 'SEQ_DOCUMENTO')
    await db.execute(
      `INSERT INTO DOCUMENTO (ID_DOCUMENTO, TIPO_DOCUMENTO, NUMERO, FECHA_EMISION, FECHA_VENCIMIENTO, ID_PERSONA, ID_VEHICULO, ESTADO)
       VALUES (:id, :tipo, :numero, TO_DATE(:emision, 'YYYY-MM-DD'), TO_DATE(:vencimiento, 'YYYY-MM-DD'), :persona, :vehiculo, :estado)`,
      { id: nuevo, ...d })
    return nuevo
  })
  return queryOne(`${SELECT} WHERE d.ID_DOCUMENTO = :id`, { id })
}, 201))

router.put('/:id', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const r = await transaction(async (db) => {
    const d = await datos(db, req.body)
    return db.execute(
      `UPDATE DOCUMENTO SET TIPO_DOCUMENTO = :tipo, NUMERO = :numero,
              FECHA_EMISION = TO_DATE(:emision, 'YYYY-MM-DD'), FECHA_VENCIMIENTO = TO_DATE(:vencimiento, 'YYYY-MM-DD'),
              ID_PERSONA = :persona, ID_VEHICULO = :vehiculo, ESTADO = :estado
       WHERE ID_DOCUMENTO = :id`, { id, ...d })
  })
  if (!r.rowsAffected) throw notFound('Documento no encontrado')
  return queryOne(`${SELECT} WHERE d.ID_DOCUMENTO = :id`, { id })
}))

router.delete('/:id', permitir(...EDITORES), h(async (req) => {
  const r = await transaction((db) => db.execute('DELETE FROM DOCUMENTO WHERE ID_DOCUMENTO = :id', { id: toId(req.params.id) }))
  if (!r.rowsAffected) throw notFound('Documento no encontrado')
}))

export default router
