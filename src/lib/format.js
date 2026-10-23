// Formato de fechas y montos para mostrar en pantalla (es-CL).

// "2026-10-23" (solo día) se muestra tal cual, sin pasar por Date para no correr el día por la zona horaria
export function fmtFecha(v) {
  if (!v) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('es-CL')
}

export function fmtFechaHora(v) {
  if (!v) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtFecha(v)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export const fmtUSD = (v) => `US$ ${Number(v || 0).toLocaleString('es-CL', { maximumFractionDigits: 2 })}`

export const fmtNumero = (v) => Number(v || 0).toLocaleString('es-CL')

// Mensaje de error legible desde una respuesta de la API
export const mensajeError = (err, porDefecto = 'Ocurrió un error') =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || porDefecto

export const hoyISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
