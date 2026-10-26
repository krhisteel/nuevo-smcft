// /api/v1/triggers — ver y modificar los triggers del esquema SMCFT (solo Administrador).
// El código se lee del diccionario de datos (ALL_SOURCE) y al compilar se ejecuta
// CREATE OR REPLACE TRIGGER directamente en Oracle: la página no guarda copias,
// el cambio queda solo en la base de datos.
import { Router } from 'express'
import { query, queryOne, execute } from '../db.js'
import { h, badRequest, notFound, required, permitir } from '../http.js'

const router = Router()
router.use(permitir('ADMINISTRADOR'))

const schema = () => (process.env.ORACLE_SCHEMA || 'SMCFT').toUpperCase().replace(/[^\w$#]/g, '')

const SELECT = `
  SELECT t.TRIGGER_NAME AS nombre, t.TABLE_NAME AS tabla, t.TRIGGER_TYPE AS tipo,
         t.TRIGGERING_EVENT AS evento, t.STATUS AS habilitado, t.WHEN_CLAUSE AS condicion,
         o.STATUS AS compilacion, o.LAST_DDL_TIME AS modificado
  FROM ALL_TRIGGERS t
  JOIN ALL_OBJECTS o ON o.OWNER = t.OWNER AND o.OBJECT_NAME = t.TRIGGER_NAME AND o.OBJECT_TYPE = 'TRIGGER'
  WHERE t.OWNER = :owner`

const errores = (nombre) => query(
  `SELECT LINE AS linea, POSITION AS posicion, TEXT AS mensaje, ATTRIBUTE AS tipo
   FROM ALL_ERRORS WHERE OWNER = :owner AND NAME = :n AND TYPE = 'TRIGGER' ORDER BY SEQUENCE`,
  { owner: schema(), n: nombre })

function nombreValido(v) {
  const n = String(v || '').toUpperCase()
  if (!/^[A-Z][A-Z0-9_$#]{0,127}$/.test(n)) throw badRequest('Nombre de trigger inválido')
  return n
}

async function detalle(nombre) {
  const t = await queryOne(`${SELECT} AND t.TRIGGER_NAME = :n`, { owner: schema(), n: nombre })
  if (!t) throw notFound(`No existe el trigger ${nombre} en el esquema ${schema()}`)
  const lineas = await query(
    `SELECT TEXT AS texto FROM ALL_SOURCE WHERE OWNER = :owner AND NAME = :n AND TYPE = 'TRIGGER' ORDER BY LINE`,
    { owner: schema(), n: nombre })
  const fuente = lineas.map((l) => l.texto).join('').replace(/\s+$/, '')
  return { ...t, codigo: `CREATE OR REPLACE ${fuente}`, errores: await errores(nombre) }
}

router.get('/', h(() => query(`${SELECT} ORDER BY t.TABLE_NAME, t.TRIGGER_NAME`, { owner: schema() })))

router.get('/:nombre', h((req) => detalle(nombreValido(req.params.nombre))))

// Compila el nuevo código del trigger. Solo se aceptan CREATE OR REPLACE TRIGGER
// del mismo trigger que se está editando (no permite crear ni modificar otros objetos).
router.put('/:nombre', h(async (req) => {
  const nombre = nombreValido(req.params.nombre)
  required(req.body, ['codigo'])
  await detalle(nombre) // verifica que exista

  // Se quita la barra "/" final que usa SQL Developer para terminar el bloque
  const codigo = String(req.body.codigo).replace(/\r/g, '').replace(/\n\s*\/\s*$/, '').trim()
  const cabecera = new RegExp(
    `^CREATE\\s+OR\\s+REPLACE\\s+(?:(?:NON)?EDITIONABLE\\s+)?TRIGGER\\s+(?:"?${schema()}"?\\s*\\.\\s*)?"?${nombre}"?\\s`, 'i')
  if (!cabecera.test(codigo)) {
    throw badRequest(`El código debe comenzar con: CREATE OR REPLACE TRIGGER ${schema()}.${nombre}`)
  }
  if (codigo.length > 32000) throw badRequest('El código es demasiado largo')

  try {
    await execute(codigo)
  } catch (err) {
    // Un trigger con errores de compilación queda guardado pero INVALID
    if (!/ORA-24344|NJS-700/.test(err.message || '')) throw err
  }
  const t = await detalle(nombre)
  return { ...t, compilado: t.compilacion === 'VALID' }
}))

export default router
