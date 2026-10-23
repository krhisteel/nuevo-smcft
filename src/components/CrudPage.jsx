import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import Icon from './Icons'

const inputClass = "w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white/80 placeholder-white/15 outline-none focus:border-[#4f8cff]/30 focus:ring-1 focus:ring-[#4f8cff]/20 transition-all"

const labelClass = "block text-xs font-medium text-white/40 mb-1"

export default function CrudPage({ title, icon, endpoint, columns, formFields, emptyData, transformSubmit, transformRow, fetchParams }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyData)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const params = { ...fetchParams, ...(search ? { buscar: search } : {}) }
      const res = await api.get(`/${endpoint}`, { params })
      const body = res.data
      // Soporta HATEOAS (_embedded.{key}) y array directo
      const list = Array.isArray(body)
        ? body
        : body?._embedded
          ? Object.values(body._embedded)[0]
          : []
      setData(Array.isArray(list) ? list : [])
    } catch { setData([]) }
    setLoading(false)
  }, [endpoint, search, fetchParams])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyData)
    setShowForm(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(transformRow ? transformRow(row) : { ...row })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = transformSubmit ? transformSubmit(form, !!editing) : form
      if (editing) {
        await api.put(`/${endpoint}/${editing.id}`, payload)
      } else {
        await api.post(`/${endpoint}`, payload)
      }
      setShowForm(false)
      fetchData()
    } catch (err) {
      const data = err.response?.data
      const msg = data?.message || data?.error || (typeof data === 'object' && Object.values(data).find(v => typeof v === 'string')) || 'Error al guardar'
      alert(msg)
    }
    setSubmitting(false)
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar ${title} seleccionado?`)) return
    try {
      await api.delete(`/${endpoint}/${row.id}`)
      fetchData()
    } catch { alert('Error al eliminar') }
  }

  const filtered = data.filter(r =>
    !search || columns.some(c =>
      String(r[c.key] || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/5 via-white/[0.02] to-[#4f8cff]/5 rounded-2xl blur-lg" />
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name={icon} className="w-5 h-5 text-[#4f8cff]/60" />
              <h1 className="text-lg font-semibold text-white/80">{title}</h1>
              <span className="text-[11px] text-white/20 bg-white/[0.03] px-2 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            <button onClick={openCreate} className="px-3 py-1.5 rounded-lg bg-[#4f8cff]/10 border border-[#4f8cff]/20 text-[#4f8cff] text-xs font-medium hover:bg-[#4f8cff]/20 hover:shadow-[0_0_15px_rgba(79,140,255,0.1)] transition-all">
              <span className="flex items-center gap-1.5">
                <Icon name="Plus" className="w-3 h-3" />
                Nuevo
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="p-4 border-b border-white/[0.04]">
            <div className="relative max-w-xs">
              <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-xs text-white/60 placeholder-white/15 outline-none focus:border-[#4f8cff]/20 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-white/20 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-white/20 text-sm">Sin registros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {columns.map(c => (
                      <th key={c.key} className="text-left px-4 py-3 text-[11px] text-white/30 font-medium uppercase tracking-wider">{c.label}</th>
                    ))}
                    <th className="text-right px-4 py-3 text-[11px] text-white/30 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.id || i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      {columns.map(c => (
                        <td key={c.key} className="px-4 py-3 text-white/60 text-xs">
                          {c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(row)} className="text-white/30 hover:text-[#4f8cff] text-[11px] mr-3 transition-colors">
                          <span className="flex items-center gap-1">
                            <Icon name="Edit" className="w-3 h-3" />
                            Editar
                          </span>
                        </button>
                        <button onClick={() => handleDelete(row)} className="text-white/20 hover:text-red-400 text-[11px] transition-colors">
                          <span className="flex items-center gap-1">
                            <Icon name="Trash" className="w-3 h-3" />
                            Eliminar
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/10 via-white/[0.03] to-[#4f8cff]/10 rounded-2xl blur-xl" />
            <div className="relative bg-[#0a1628]/95 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/70">{editing ? 'Editar' : 'Nuevo'} {title}</h2>
                <button onClick={() => setShowForm(false)} className="text-white/20 hover:text-white/50 transition-colors">
                  <Icon name="Close" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formFields.map(f => (
                  <div key={f.key}>
                    <label className={labelClass}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className={inputClass} required={f.required}>
                        {f.options.map(o => <option key={o.value} value={o.value} className="bg-[#0f1a2e] text-white/80">{o.label}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className={inputClass} rows={3} required={f.required} />
                    ) : (
                      <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className={inputClass} required={f.required} placeholder={f.placeholder} />
                    )}
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-white/[0.06] text-white/40 text-xs hover:bg-white/[0.03] transition-all">Cancelar</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#4f8cff]/10 border border-[#4f8cff]/20 text-[#4f8cff] text-xs font-medium hover:bg-[#4f8cff]/20 hover:shadow-[0_0_15px_rgba(79,140,255,0.1)] transition-all disabled:opacity-40">
                    {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
