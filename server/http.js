// Utilidades compartidas por los módulos de la API.

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const badRequest = (msg) => new HttpError(400, msg)
export const notFound = (msg) => new HttpError(404, msg)
export const forbidden = (msg = 'No tiene permisos para esta acción') => new HttpError(403, msg)

// Envuelve un handler async: lo que retorne se envía como JSON.
// Si retorna undefined se responde 204 (sin contenido).
export const h = (fn, status = 200) => async (req, res, next) => {
  try {
    const result = await fn(req, res)
    if (res.headersSent) return
    if (result === undefined) res.status(204).end()
    else res.status(status).json(result)
  } catch (err) {
    next(err)
  }
}

// Valida que los campos obligatorios vengan con valor.
export function required(body, fields) {
  const faltantes = fields.filter((f) => body?.[f] === undefined || body[f] === null || String(body[f]).trim() === '')
  if (faltantes.length) throw badRequest(`Campos obligatorios: ${faltantes.join(', ')}`)
}

export const toId = (v) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`Identificador inválido: ${v}`)
  return n
}

export const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
export const numero = (v) => (v === undefined || v === null || v === '' ? null : Number(v))

// Middleware: solo deja pasar a los roles indicados
export const permitir = (...roles) => (req, res, next) =>
  next(roles.includes(req.user?.rol) ? undefined : forbidden())

// Roles de funcionarios (todos menos el viajero)
export const STAFF = ['ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG', 'AUDITOR']
export const esViajero = (req) => req.user?.rol === 'VIAJERO'

// Traduce errores de Oracle a mensajes entendibles para el usuario.
export function traducirErrorOracle(err) {
  const msg = err.message || ''
  const code = (msg.match(/ORA-(\d{5})/) || [])[1]
  if (!code) return null
  // Errores de negocio lanzados por el package / triggers (RAISE_APPLICATION_ERROR)
  if (/^20\d{3}$/.test(code)) {
    return { status: 400, message: msg.split('\n')[0].replace(/^ORA-\d{5}:\s*/, '') }
  }
  const mapa = {
    '00001': 'Ya existe un registro con esos datos (valor duplicado).',
    '02291': 'Uno de los datos relacionados no existe.',
    '02292': 'No se puede eliminar: el registro tiene información asociada.',
    '01400': 'Falta un campo obligatorio.',
    '12899': 'Uno de los valores es demasiado largo.',
    '01722': 'Uno de los valores numéricos no es válido.',
    '01830': 'Formato de fecha inválido.',
    '01841': 'Formato de fecha inválido.',
    '01843': 'Formato de fecha inválido.',
    '01847': 'Formato de fecha inválido.',
    '01861': 'Formato de fecha inválido.',
    '02290': 'Los datos no cumplen una regla de la base de datos.',
  }
  return mapa[code] ? { status: 400, message: mapa[code] } : null
}
