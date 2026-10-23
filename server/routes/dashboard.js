// /api/v1/dashboard y /api/v1/catalogos — indicadores y listas para formularios.
import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { h, esViajero } from '../http.js'

const router = Router()

router.get('/dashboard', h(async (req) => {
  if (esViajero(req)) {
    return queryOne(
      `SELECT (SELECT COUNT(*) FROM VEHICULO WHERE ID_PERSONA_PROPIETARIO = :p) AS vehiculos,
              (SELECT COUNT(*) FROM DETALLE_CRUCE_PERSONA WHERE ID_PERSONA = :p) AS cruces,
              (SELECT COUNT(*) FROM PLAZO_ADMISION pa JOIN VEHICULO v ON v.ID_VEHICULO = pa.ID_VEHICULO
                WHERE v.ID_PERSONA_PROPIETARIO = :p AND pa.ESTADO = 'ACTIVO') AS plazos_activos,
              (SELECT COUNT(*) FROM NOTIFICACION_DESTINATARIO WHERE ID_PERSONA = :p AND LEIDA = 'N') AS notificaciones
       FROM DUAL`, { p: req.user.idPersona })
  }
  const [totales, porPaso] = await Promise.all([
    queryOne(
      `SELECT (SELECT COUNT(*) FROM CRUCE_FRONTERIZO) AS cruces,
              (SELECT COUNT(*) FROM CRUCE_FRONTERIZO WHERE FECHA_HORA >= TRUNC(SYSDATE) - 7) AS cruces_semana,
              (SELECT COUNT(*) FROM VEHICULO) AS vehiculos,
              (SELECT COUNT(*) FROM PERSONA) AS personas,
              (SELECT COUNT(*) FROM PLAZO_ADMISION WHERE ESTADO = 'ACTIVO') AS plazos_activos,
              FN_TOTAL_PLAZOS_VENCIDOS() AS plazos_vencidos,
              (SELECT NVL(SUM(VALOR_USD), 0) FROM ITEM_DECLARADO) AS valor_declarado,
              (SELECT COUNT(*) FROM NOTIFICACION WHERE ESTADO = 'PENDIENTE') AS notificaciones_pendientes
       FROM DUAL`),
    query(
      `SELECT pf.NOMBRE AS paso, COUNT(c.ID_CRUCE) AS cruces,
              SUM(CASE WHEN c.TIPO_MOVIMIENTO = 'ENTRADA' THEN 1 ELSE 0 END) AS entradas,
              SUM(CASE WHEN c.TIPO_MOVIMIENTO = 'SALIDA' THEN 1 ELSE 0 END) AS salidas
       FROM PASO_FRONTERIZO pf LEFT JOIN CRUCE_FRONTERIZO c ON c.ID_PASO = pf.ID_PASO
       GROUP BY pf.NOMBRE ORDER BY COUNT(c.ID_CRUCE) DESC`),
  ])
  return { ...totales, porPaso }
}))

// Listas para los selectores de los formularios
router.get('/catalogos', h(async () => {
  const [pasos, categorias, funcionarios, roles] = await Promise.all([
    query(`SELECT ID_PASO AS id, NOMBRE FROM PASO_FRONTERIZO WHERE ESTADO = 'ACTIVO' ORDER BY NOMBRE`),
    query(`SELECT ID_CATEGORIA AS id, NOMBRE, LIMITE_VALOR_USD FROM CATEGORIA_ITEM WHERE ACTIVO = 'S' ORDER BY NOMBRE`),
    query(`SELECT f.ID_FUNCIONARIO AS id, p.NOMBRES || ' ' || p.APELLIDOS AS nombre, f.INSTITUCION, f.CARGO
           FROM FUNCIONARIO f JOIN PERSONA p ON p.ID_PERSONA = f.ID_PERSONA ORDER BY p.APELLIDOS`),
    query('SELECT ID_ROL AS id, NOMBRE_ROL AS nombre FROM ROL ORDER BY ID_ROL'),
  ])
  return { pasos, categorias, funcionarios, roles }
}))

export default router
