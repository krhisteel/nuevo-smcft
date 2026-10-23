// Página genérica de listado + formulario para un recurso de la API.
import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import Icon from './Icons'
import { PageHeader, Card, Button, LinkButton, Modal, Field } from './ui'
import { mensajeError } from '../lib/format'

export default function CrudPage({
  title, subtitle, icon, endpoint, params,
  columns, formFields = [], emptyData = {},
  transformRow, transformSubmit,
  canCreate = false, canEdit = false, canDelete = false,
  createLabel = 'Nuevo', deleteConfirm,
  rowActions, headerActions, onRowClick, reloadKey,
}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null = cerrado, {} = nuevo, fila = edición
  const [form, setForm] = useState(emptyData)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/${endpoint}`, { params })
      setData(Array.isArray(res.data) ? res.data : [])
      setError('')
    } catch (err) {
      setData([])
      setError(mensajeError(err, 'No se pudieron cargar los datos'))
    }
    setLoading(false)
  }, [endpoint, params])

  useEffect(() => { fetchData() }, [fetchData, reloadKey])

  const openCreate = () => {
    setEditing({})
    setForm(emptyData)
    setFormError('')
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(transformRow ? transformRow(row) : { ...row })
    setFormError('')
  }

  const isEdit = editing && editing.id !== undefined

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const payload = transformSubmit ? transformSubmit(form, isEdit) : form
      if (isEdit) await api.put(`/${endpoint}/${editing.id}`, payload)
      else await api.post(`/${endpoint}`, payload)
      setEditing(null)
      fetchData()
    } catch (err) {
      setFormError(mensajeError(err, 'Error al guardar'))
    }
    setSubmitting(false)
  }

  const handleDelete = async (row) => {
    if (!confirm(deleteConfirm ? deleteConfirm(row) : `¿Eliminar este registro de ${title}?`)) return
    try {
      await api.delete(`/${endpoint}/${row.id}`)
      fetchData()
    } catch (err) {
      alert(mensajeError(err, 'Error al eliminar'))
    }
  }

  const q = search.toLowerCase()
  const filtered = data.filter((r) => !q || columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)))
  const visibleFields = formFields.filter((f) => !(isEdit ? f.createOnly : f.editOnly))
  const hasActions = canEdit || canDelete || rowActions

  return (
    <div className="space-y-4 animate-fadeIn">
      <PageHeader icon={icon} title={title} subtitle={subtitle} count={filtered.length}>
        {headerActions?.(fetchData)}
        {canCreate && <Button icon="Plus" onClick={openCreate}>{createLabel}</Button>}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-xs text-white/60 placeholder-white/15 outline-none focus:border-[#4f8cff]/20 transition-all"
            />
          </div>
          <LinkButton icon="Refresh" onClick={fetchData}>Actualizar</LinkButton>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/20 text-sm">Cargando...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-400/70 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-white/20 text-sm">Sin registros</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {columns.map((c) => (
                    <th key={c.key} className="text-left px-4 py-3 text-[11px] text-white/30 font-medium uppercase tracking-wider whitespace-nowrap">{c.label}</th>
                  ))}
                  {hasActions && <th className="text-right px-4 py-3 text-[11px] text-white/30 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-white/60 text-xs">
                        {c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          {rowActions?.(row, fetchData)}
                          {canEdit && <LinkButton icon="Edit" onClick={() => openEdit(row)}>Editar</LinkButton>}
                          {canDelete && <LinkButton tone="danger" icon="Trash" onClick={() => handleDelete(row)}>Eliminar</LinkButton>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal title={`${isEdit ? 'Editar' : createLabel} · ${title}`} onClose={() => setEditing(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/80 text-xs">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleFields.map((f) => (
                <Field key={f.key} field={f} value={form[f.key]} onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))} />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" tone="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
