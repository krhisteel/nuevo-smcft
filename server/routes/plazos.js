// /api/v1/plazos — PLAZO_ADMISION y ALERTA_PLAZO.
// Los plazos los crea el trigger TRG_CRUCE_PLAZO_AI (90 días diplomáticos / 180 resto).
// Usa SP_ACTUALIZAR_PLAZOS y FN_TOTAL_PLAZOS_VENCIDOS (objetos sin parámetros del informe).
import { Router } from 'express'
import { query, queryOne, transaction, execute } from '../db.js'
import { h, notFound, permitir, STAFF, esViajero, texto, toId } from '../http.js'

const router = Router()
const EDITORES = ['ADMINISTRADOR', 'FISCALIZADOR']

const SELECT = `
  SELECT pa.ID_PLAZO AS id, pa.ID_VEHICULO, v.PATENTE, v.TIPO_VEHICULO, pa.ID_CRUCE_INGRESO AS id_cruce,
         pa.FECHA_INGRESO, pa.FECHA_LIMITE, pa.TIPO, pa.ESTADO, pa.OBSERVACIONES,
         TRUNC(CAST(pa.FECHA_LIMITE AS DATE)) - TRUNC(SYSDATE) AS dias_restantes,
         p.RUT AS rut_propietario, p.NOMBRES || ' ' || p.APELLIDOS AS propietario
  FROM PLAZO_ADMISION pa
  JOIN VEHICULO v ON v.ID_VEHICULO = pa.ID_VEHICULO
  JOIN PERSONA p ON p.ID_PERSONA = v.ID_PERSONA_PROPIETARIO`

router.get('/', h((req) => {
  const where = []
  const binds = {}
  if (esViajero(req)) {
    where.push('v.ID_PERSONA_PROPIETARIO = :persona')
    binds.persona = req.user.idPersona
  }
  if (texto(req.query.estado)) {
    where.push('pa.ESTADO = :estado')
    binds.estado = req.query.estado.toUpperCase()
  }
  return query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pa.FECHA_LIMITE ASC`, binds)
}))

// Indicadores. FN_TOTAL_PLAZOS_VENCIDOS cuenta los no cerrados con fecha límite pasada.
router.get('/resumen', permitir(...STAFF), h(() => queryOne(
  `SELECT FN_TOTAL_PLAZOS_VENCIDOS() AS vencidos_por_fecha,
          (SELECT COUNT(*) FROM PLAZO_ADMISION WHERE ESTADO = 'ACTIVO') AS activos,
          (SELECT COUNT(*) FROM PLAZO_ADMISION WHERE ESTADO = 'VENCIDO') AS marcados_vencidos,
          (SELECT COUNT(*) FROM PLAZO_ADMISION WHERE ESTADO = 'CERRADO') AS cerrados,
          (SELECT COUNT(*) FROM PLAZO_ADMISION WHERE ESTADO = 'ACTIVO'
             AND TRUNC(CAST(FECHA_LIMITE AS DATE)) - TRUNC(SYSDATE) BETWEEN 0 AND 7) AS por_vencer
   FROM DUAL`)))

// Ejecuta el procedimiento sin parámetros SP_ACTUALIZAR_PLAZOS
router.post('/actualizar-vencidos', permitir(...EDITORES), h(async () => {
  const antes = await queryOne(`SELECT COUNT(*) AS n FROM PLAZO_ADMISION WHERE ESTADO = 'VENCIDO'`)
  await execute('BEGIN SP_ACTUALIZAR_PLAZOS; END;')
  const despues = await queryOne(`SELECT COUNT(*) AS n FROM PLAZO_ADMISION WHERE ESTADO = 'VENCIDO'`)
  return { actualizados: despues.n - antes.n, totalVencidos: despues.n }
}))

router.patch('/:id/cerrar', permitir(...EDITORES), h(async (req) => {
  const id = toId(req.params.id)
  const r = await transaction((db) => db.execute(
    `UPDATE PLAZO_ADMISION SET ESTADO = 'CERRADO', OBSERVACIONES = NVL(:o, OBSERVACIONES) WHERE ID_PLAZO = :id`,
    { id, o: texto(req.body?.observaciones) }))
  if (!r.rowsAffected) throw notFound('Plazo no encontrado')
  return queryOne(`${SELECT} WHERE pa.ID_PLAZO = :id`, { id })
}))

// ---- Alertas ----
router.get('/alertas', permitir(...STAFF), h(() => query(
  `SELECT a.ID_ALERTA AS id, a.ID_PLAZO, v.PATENTE, a.MENSAJE, a.DIAS_RESTANTES, a.TIPO_ALERTA, a.ENVIADA
   FROM ALERTA_PLAZO a JOIN PLAZO_ADMISION pa ON pa.ID_PLAZO = a.ID_PLAZO
   JOIN VEHICULO v ON v.ID_VEHICULO = pa.ID_VEHICULO
   ORDER BY a.ID_ALERTA DESC`)))

// Genera alertas (y su notificación al propietario) para los plazos no cerrados
// que vencen en 7 días o menos. No repite una alerta del mismo tipo para el mismo plazo.
router.post('/generar-alertas', permitir(...EDITORES), h(() => transaction(async (db) => {
  const plazos = await db.query(
    `SELECT pa.ID_PLAZO AS id, v.PATENTE, v.ID_PERSONA_PROPIETARIO AS id_persona,
            TRUNC(CAST(pa.FECHA_LIMITE AS DATE)) - TRUNC(SYSDATE) AS dias
     FROM PLAZO_ADMISION pa JOIN VEHICULO v ON v.ID_VEHICULO = pa.ID_VEHICULO
     WHERE pa.ESTADO <> 'CERRADO' AND TRUNC(CAST(pa.FECHA_LIMITE AS DATE)) - TRUNC(SYSDATE) <= 7`)
  let generadas = 0
  for (const p of plazos) {
    const tipo = p.dias < 0 ? 'VENCIDO' : 'URGENTE'
    const ya = await db.queryOne('SELECT 1 AS x FROM ALERTA_PLAZO WHERE ID_PLAZO = :p AND TIPO_ALERTA = :t', { p: p.id, t: tipo })
    if (ya) continue
    const mensaje = p.dias < 0
      ? `El plazo de admisión del vehículo ${p.patente} venció hace ${Math.abs(p.dias)} días`
      : `El plazo de admisión del vehículo ${p.patente} vence en ${p.dias} días`
    const idAlerta = await db.nextId('ALERTA_PLAZO', 'ID_ALERTA')
    await db.execute(
      `INSERT INTO ALERTA_PLAZO (ID_ALERTA, ID_PLAZO, MENSAJE, DIAS_RESTANTES, TIPO_ALERTA, ENVIADA)
       VALUES (:id, :p, :m, :d, :t, 'S')`, { id: idAlerta, p: p.id, m: mensaje, d: p.dias, t: tipo })
    const idNotif = await db.nextId('NOTIFICACION', 'ID_NOTIFICACION')
    await db.execute(
      `INSERT INTO NOTIFICACION (ID_NOTIFICACION, TITULO, MENSAJE, TIPO, ID_ALERTA, ESTADO, FECHA_CREACION, FECHA_ENVIO)
       VALUES (:id, :ti, :m, 'ALERTA_PLAZO', :a, 'ENVIADA', SYSTIMESTAMP, SYSTIMESTAMP)`,
      { id: idNotif, ti: `Aviso de plazo para ${p.patente}`, m: mensaje, a: idAlerta })
    const idDest = await db.nextId('NOTIFICACION_DESTINATARIO', 'ID_NOTIF_DEST')
    await db.execute(
      `INSERT INTO NOTIFICACION_DESTINATARIO (ID_NOTIF_DEST, ID_NOTIFICACION, ID_PERSONA, LEIDA)
       VALUES (:id, :n, :p, 'N')`, { id: idDest, n: idNotif, p: p.idPersona })
    generadas++
  }
  return { revisados: plazos.length, generadas }
})))

export default router
