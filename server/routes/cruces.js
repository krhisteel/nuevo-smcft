// /api/v1/cruces — CRUCE_FRONTERIZO, DETALLE_CRUCE_PERSONA, CRUCE_DOCUMENTO y CONTROL.
// El registro usa el procedimiento público PKG_GESTION_FRONTERA.sp_registrar_cruce,
// que valida vehículo, viajeros y autorización de menores. Si el cruce es una
// SALIDA con vehículo, el trigger TRG_CRUCE_PLAZO_AI crea el plazo de admisión.
import { Router } from 'express'
import { query, queryOne, transaction, OUT_NUMBER } from '../db.js'
import { h, badRequest, notFound, required, permitir, esViajero, texto, toId } from '../http.js'
import { normalizarRut, funcionarioDe } from '../lookup.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']
const ESTADOS = ['AUTORIZADO', 'RECHAZADO', 'ANULADO', 'PENDIENTE']

// FN_VALOR_DECLARADO es la función almacenada con parámetros del informe
const SELECT = `
  SELECT c.ID_CRUCE AS id, c.ID_PASO, pf.NOMBRE AS paso, c.TIPO_MOVIMIENTO, c.FECHA_HORA, c.ESTADO,
         c.ID_VEHICULO, v.PATENTE, v.TIPO_VEHICULO,
         (SELECT COUNT(*) FROM DETALLE_CRUCE_PERSONA d WHERE d.ID_CRUCE = c.ID_CRUCE) AS viajeros,
         (SELECT p.RUT FROM DETALLE_CRUCE_PERSONA d JOIN PERSONA p ON p.ID_PERSONA = d.ID_PERSONA
           WHERE d.ID_CRUCE = c.ID_CRUCE AND d.ROL_VIAJERO = 'CONDUCTOR' FETCH FIRST 1 ROWS ONLY) AS rut_conductor,
         FN_VALOR_DECLARADO(c.ID_CRUCE) AS valor_declarado
  FROM CRUCE_FRONTERIZO c
  JOIN PASO_FRONTERIZO pf ON pf.ID_PASO = c.ID_PASO
  LEFT JOIN VEHICULO v ON v.ID_VEHICULO = c.ID_VEHICULO`

// El viajero solo ve los cruces en que participó o de sus vehículos
const FILTRO_VIAJERO = `(EXISTS (SELECT 1 FROM DETALLE_CRUCE_PERSONA d WHERE d.ID_CRUCE = c.ID_CRUCE AND d.ID_PERSONA = :persona)
  OR v.ID_PERSONA_PROPIETARIO = :persona)`

router.get('/', h((req) => {
  const where = []
  const binds = {}
  if (esViajero(req)) {
    where.push(FILTRO_VIAJERO)
    binds.persona = req.user.idPersona
  }
  if (texto(req.query.tipo)) {
    where.push('c.TIPO_MOVIMIENTO = :tipo')
    binds.tipo = req.query.tipo.toUpperCase()
  }
  if (texto(req.query.estado)) {
    where.push('c.ESTADO = :estado')
    binds.estado = req.query.estado.toUpperCase()
  }
  return query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY c.FECHA_HORA DESC, c.ID_CRUCE DESC FETCH FIRST 500 ROWS ONLY`, binds)
}))

// Detalle completo del cruce
router.get('/:id', h(async (req) => {
  const id = toId(req.params.id)
  const binds = { id }
  let extra = ''
  if (esViajero(req)) {
    extra = ` AND ${FILTRO_VIAJERO}`
    binds.persona = req.user.idPersona
  }
  const cruce = await queryOne(`${SELECT} WHERE c.ID_CRUCE = :id${extra}`, binds)
  if (!cruce) throw notFound('Cruce no encontrado')

  const [viajeros, documentos, controles, declaraciones, plazo] = await Promise.all([
    query(`SELECT p.ID_PERSONA AS id, p.RUT, p.NOMBRES || ' ' || p.APELLIDOS AS nombre, d.ROL_VIAJERO,
                  TRUNC(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) AS edad
           FROM DETALLE_CRUCE_PERSONA d JOIN PERSONA p ON p.ID_PERSONA = d.ID_PERSONA
           WHERE d.ID_CRUCE = :id ORDER BY d.ROL_VIAJERO DESC, p.APELLIDOS`, { id }),
    query(`SELECT doc.ID_DOCUMENTO AS id, doc.TIPO_DOCUMENTO, doc.NUMERO, doc.ESTADO, doc.FECHA_VENCIMIENTO
           FROM CRUCE_DOCUMENTO cd JOIN DOCUMENTO doc ON doc.ID_DOCUMENTO = cd.ID_DOCUMENTO
           WHERE cd.ID_CRUCE = :id ORDER BY doc.TIPO_DOCUMENTO`, { id }),
    query(`SELECT ct.ID_CONTROL AS id, ct.TIPO_CONTROL, ct.RESULTADO, ct.FECHA_HORA,
                  p.NOMBRES || ' ' || p.APELLIDOS AS funcionario, f.INSTITUCION
           FROM CONTROL ct JOIN FUNCIONARIO f ON f.ID_FUNCIONARIO = ct.ID_FUNCIONARIO
           JOIN PERSONA p ON p.ID_PERSONA = f.ID_PERSONA
           WHERE ct.ID_CRUCE = :id ORDER BY ct.FECHA_HORA`, { id }),
    query(`SELECT d.ID_DECLARACION AS id, d.TIPO, d.FECHA, d.ESTADO,
                  (SELECT NVL(SUM(i.VALOR_USD), 0) FROM ITEM_DECLARADO i WHERE i.ID_DECLARACION = d.ID_DECLARACION) AS total_usd
           FROM DECLARACION d WHERE d.ID_CRUCE = :id ORDER BY d.ID_DECLARACION`, { id }),
    queryOne(`SELECT pa.ID_PLAZO AS id, pa.TIPO, pa.ESTADO, pa.FECHA_LIMITE,
                     TRUNC(CAST(pa.FECHA_LIMITE AS DATE)) - TRUNC(SYSDATE) AS dias_restantes
              FROM PLAZO_ADMISION pa WHERE pa.ID_CRUCE_INGRESO = :id`, { id }),
  ])
  return { ...cruce, detalleViajeros: viajeros, documentos, controles, declaraciones, plazo }
}))

// Registra un cruce llamando al package (los viajeros se pasan en el VARRAY t_ruts_varray)
router.post('/', permitir(...EDITORES), h(async (req) => {
  required(req.body, ['idPaso', 'tipoMovimiento'])
  const tipo = String(req.body.tipoMovimiento).toUpperCase()
  const ruts = (Array.isArray(req.body.rutsViajeros) ? req.body.rutsViajeros : String(req.body.rutsViajeros || '').split(/[,;\s]+/))
    .map((r) => String(r).trim()).filter(Boolean).map(normalizarRut)
  const rutConductor = texto(req.body.rutConductor) ? normalizarRut(req.body.rutConductor) : null
  if (rutConductor && !ruts.includes(rutConductor)) ruts.unshift(rutConductor)
  if (!ruts.length) throw badRequest('Debe informar al menos un viajero (RUT)')
  if (ruts.length > 10) throw badRequest('Máximo 10 viajeros por cruce')
  const patente = texto(req.body.patente) ? String(req.body.patente).replace(/[\s-]/g, '').toUpperCase() : null

  const binds = { paso: toId(req.body.idPaso), patente, tipo, conductor: rutConductor, id: OUT_NUMBER }
  ruts.forEach((r, i) => { binds[`r${i}`] = r })
  const lista = ruts.map((_, i) => `:r${i}`).join(', ')

  const id = await transaction(async (db) => {
    const res = await db.execute(
      `BEGIN
         PKG_GESTION_FRONTERA.sp_registrar_cruce(
           p_id_paso => :paso, p_patente => :patente, p_tipo_movimiento => :tipo,
           p_ruts_viajeros => PKG_GESTION_FRONTERA.t_ruts_varray(${lista}),
           p_rut_conductor => :conductor, p_id_cruce_out => :id);
       END;`, binds)
    const idCruce = res.outBinds.id
    // Deja constancia del funcionario que registró el cruce
    const f = await funcionarioDe(req, db)
    if (f) {
      const idControl = await db.nextId('CONTROL', 'ID_CONTROL')
      await db.execute(
        `INSERT INTO CONTROL (ID_CONTROL, ID_CRUCE, ID_FUNCIONARIO, TIPO_CONTROL, RESULTADO, FECHA_HORA)
         VALUES (:id, :c, :f, 'REGISTRO', 'APROBADO', SYSTIMESTAMP)`, { id: idControl, c: idCruce, f: f.id })
    }
    return idCruce
  })
  return queryOne(`${SELECT} WHERE c.ID_CRUCE = :id`, { id })
}, 201))

// Cambia el estado del cruce y registra el control realizado por el funcionario
router.patch('/:id/estado', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const estado = String(req.body?.estado || '').toUpperCase()
  if (!ESTADOS.includes(estado)) throw badRequest(`Estado inválido. Debe ser: ${ESTADOS.join(', ')}`)
  await transaction(async (db) => {
    const r = await db.execute('UPDATE CRUCE_FRONTERIZO SET ESTADO = :e WHERE ID_CRUCE = :id', { e: estado, id })
    if (!r.rowsAffected) throw notFound('Cruce no encontrado')
    const f = await funcionarioDe(req, db)
    if (f) {
      const idControl = await db.nextId('CONTROL', 'ID_CONTROL')
      await db.execute(
        `INSERT INTO CONTROL (ID_CONTROL, ID_CRUCE, ID_FUNCIONARIO, TIPO_CONTROL, RESULTADO, FECHA_HORA)
         VALUES (:id, :c, :f, 'FISCALIZACION', :r, SYSTIMESTAMP)`, { id: idControl, c: id, f: f.id, r: estado })
    }
  })
  return queryOne(`${SELECT} WHERE c.ID_CRUCE = :id`, { id })
}))

// Vincula un documento existente al cruce (tabla CRUCE_DOCUMENTO)
router.post('/:id/documentos', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  required(req.body, ['numero'])
  await transaction(async (db) => {
    const doc = await db.queryOne('SELECT ID_DOCUMENTO AS id FROM DOCUMENTO WHERE NUMERO = :n', { n: String(req.body.numero).trim() })
    if (!doc) throw badRequest(`No existe el documento número ${req.body.numero}`)
    const ya = await db.queryOne('SELECT 1 AS x FROM CRUCE_DOCUMENTO WHERE ID_CRUCE = :c AND ID_DOCUMENTO = :d', { c: id, d: doc.id })
    if (!ya) await db.execute('INSERT INTO CRUCE_DOCUMENTO (ID_CRUCE, ID_DOCUMENTO) VALUES (:c, :d)', { c: id, d: doc.id })
  })
  return { mensaje: 'Documento vinculado' }
}))

export default router
