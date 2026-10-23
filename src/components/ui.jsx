// Componentes visuales reutilizables (mismo estilo "glass" del diseño original).
import { useEffect } from 'react'
import Icon from './Icons'

export const inputClass = "w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white/80 placeholder-white/15 outline-none focus:border-[#4f8cff]/30 focus:ring-1 focus:ring-[#4f8cff]/20 transition-all"
export const labelClass = "block text-xs font-medium text-white/40 mb-1"

export function Card({ children, className = '' }) {
  return (
    <div className={`relative bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      {children}
    </div>
  )
}

export function PageHeader({ icon, title, subtitle, count, children }) {
  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/5 via-white/[0.02] to-[#4f8cff]/5 rounded-2xl blur-lg" />
      <Card className="backdrop-blur-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Icon name={icon} className="w-5 h-5 text-[#4f8cff]/60 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white/80">{title}</h1>
                {count !== undefined && <span className="text-[11px] text-white/20 bg-white/[0.03] px-2 py-0.5 rounded-full">{count}</span>}
              </div>
              {subtitle && <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
      </Card>
    </div>
  )
}

const tonos = {
  primary: 'bg-[#4f8cff]/10 border-[#4f8cff]/20 text-[#4f8cff] hover:bg-[#4f8cff]/20',
  success: 'bg-[#10b981]/10 border-[#10b981]/20 text-[#34d399] hover:bg-[#10b981]/20',
  danger: 'bg-red-500/10 border-red-400/20 text-red-400 hover:bg-red-500/20',
  ghost: 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06]',
}

export function Button({ tone = 'primary', icon, children, className = '', ...props }) {
  return (
    <button {...props} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tonos[tone]} ${className}`}>
      <span className="flex items-center gap-1.5">
        {icon && <Icon name={icon} className="w-3 h-3" />}
        {children}
      </span>
    </button>
  )
}

export function LinkButton({ tone = 'primary', icon, children, ...props }) {
  const color = { primary: 'hover:text-[#4f8cff]', danger: 'hover:text-red-400', success: 'hover:text-[#34d399]' }[tone]
  return (
    <button {...props} className={`text-white/30 ${color} text-[11px] transition-colors disabled:opacity-30`}>
      <span className="flex items-center gap-1">
        {icon && <Icon name={icon} className="w-3 h-3" />}
        {children}
      </span>
    </button>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/10 via-white/[0.03] to-[#4f8cff]/10 rounded-2xl blur-xl" />
        <div className="relative bg-[#0a1628]/95 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/70">{title}</h2>
            <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
              <Icon name="Close" className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Campo de formulario según su tipo
export function Field({ field, value, onChange }) {
  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value), className: inputClass, required: field.required, disabled: field.disabled }
  return (
    <div className={field.full ? 'sm:col-span-2' : ''}>
      <label className={labelClass}>{field.label}{field.required && <span className="text-[#4f8cff]/60"> *</span>}</label>
      {field.type === 'select' ? (
        <select {...common}>
          {!field.required && <option value="" className="bg-[#0f1a2e]">—</option>}
          {field.options.map((o) => <option key={o.value} value={o.value} className="bg-[#0f1a2e] text-white/80">{o.label}</option>)}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...common} rows={3} placeholder={field.placeholder} />
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-xs text-white/50 py-2">
          <input type="checkbox" checked={value === true || value === 'true'} onChange={(e) => onChange(e.target.checked)} />
          {field.checkLabel || 'Sí'}
        </label>
      ) : (
        <input {...common} type={field.type || 'text'} placeholder={field.placeholder} step={field.step} min={field.min} />
      )}
      {field.help && <p className="text-[10px] text-white/25 mt-1">{field.help}</p>}
    </div>
  )
}

export function Badge({ children, color = '#4f8cff' }) {
  return (
    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color, borderColor: `${color}33`, backgroundColor: `${color}14` }}>
      {children}
    </span>
  )
}

// Tabla simple para detalles dentro de modales
export function MiniTable({ columns, rows, empty = 'Sin registros' }) {
  if (!rows?.length) return <p className="text-xs text-white/25 py-3">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.04]">
            {columns.map((c) => <th key={c.key} className="text-left px-3 py-2 text-[10px] text-white/30 font-medium uppercase tracking-wider">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b border-white/[0.02]">
              {columns.map((c) => <td key={c.key} className="px-3 py-2 text-white/60">{c.render ? c.render(r[c.key], r) : r[c.key] ?? '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Stat({ label, value, icon, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/35 text-xs">{label}</p>
          <p className="text-2xl font-semibold text-white/80 mt-1">
            {value ?? <span className="inline-block w-6 h-6 bg-white/[0.04] rounded animate-pulse" />}
          </p>
          {hint && <p className="text-[10px] text-white/25 mt-1">{hint}</p>}
        </div>
        {icon && <Icon name={icon} className="w-5 h-5 text-[#4f8cff]/25" />}
      </div>
    </Card>
  )
}
