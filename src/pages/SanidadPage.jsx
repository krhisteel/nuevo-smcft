import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { LinkButton, Modal, MiniTable, Button, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import useCatalogos from '../lib/useCatalogos'
import { fmtFechaHora, mensajeError } from '../lib/format'
import { Dato, Seccion } from './CrucesPage'

const resultados = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'OBSERVADO'].map((t) => ({ value: t, label: t }))

function DetalleInspeccion({ id, editor, onClose }) {
  const [d, setD] = useState(null)
  const [item, setItem] = useState({ descripcion: '', resultadoItem: 'APROBADO', observaciones: '' })
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      setD((await api.get(`/inspecciones/${id}`)).data)
    } catch (err) {
      setError(mensajeError(err))
    }
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  const agregar = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/inspecciones/${id}/items`, item)
      setItem({ descripcion: '', resultadoItem: 'APROBADO', observaciones: '' })
      cargar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  const eliminar = async (itemId) => {
    if (!confirm('¿Eliminar ítem?')) return
    try {
      await api.delete(`/inspecciones/items/${itemId}`)
      cargar()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <Modal title={`Inspección sanitaria #${id}`} onClose={onClose} wide>
      {!d ? <p className="text-white/20 text-xs">{error || 'Cargando...'}</p> : (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato label="Cruce">#{d.idCruce} · {d.paso}</Dato>
            <Dato label="Inspector">{d.inspector}</Dato>
            <Dato label="Fecha">{fmtFechaHora(d.fechaInspeccion)}</Dato>
            <Dato label="Resultado"><StatusDot status={d.resultado} /></Dato>
          </div>
          {d.observaciones && <p className="text-white/40">{d.observaciones}</p>}
          <Seccion titulo="Ítems revisados">
            <MiniTable rows={d.detalleItems} empty="Sin ítems" columns={[
              { key: 'descripcion', label: 'Descripción' },
              { key: 'resultadoItem', label: 'Resultado', render: (v) => <StatusDot status={v} /> },
              { key: 'observaciones', label: 'Observaciones' },
              ...(editor ? [{ key: 'x', label: '', render: (_, r) => <LinkButton tone="danger" icon="Trash" onClick={() => eliminar(r.id)} /> }] : []),
            ]} />
          </Seccion>
          {editor && (
            <form onSubmit={agregar} className="space-y-3">
              {error && <p className="text-red-400/80">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field field={{ label: 'Descripción', required: true }} value={item.descripcion} onChange={(v) => setItem({ ...item, descripcion: v })} />
                <Field field={{ label: 'Resultado', type: 'select', options: resultados, required: true }} value={item.resultadoItem} onChange={(v) => setItem({ ...item, resultadoItem: v })} />
                <Field field={{ label: 'Observaciones' }} value={item.observaciones} onChange={(v) => setItem({ ...item, observaciones: v })} />
              </div>
              <div className="flex justify-end"><Button type="submit" icon="Plus">Agregar ítem</Button></div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function SanidadPage() {
  const { user } = useAuth()
  const { funcionarios } = useCatalogos()
  const editor = puede(user, 'ADMINISTRADOR', 'INSPECTOR_SAG')
  const [detalle, setDetalle] = useState(null)
  const inspectores = funcionarios.map((f) => ({ value: String(f.id), label: `${f.nombre} (${f.institucion})` }))
  return (
    <>
      <CrudPage
        title="Inspección sanitaria (SAG)"
        subtitle="Inspecciones de equipaje y productos por cruce"
        icon="Flask"
        endpoint="inspecciones"
        canCreate={editor}
        canEdit={editor}
        canDelete={editor}
        createLabel="Nueva inspección"
        onRowClick={(r) => setDetalle(r.id)}
        rowActions={(row) => <LinkButton icon="Eye" onClick={() => setDetalle(row.id)}>Ítems</LinkButton>}
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'fechaInspeccion', label: 'Fecha', render: fmtFechaHora },
          { key: 'idCruce', label: 'Cruce', render: (v, r) => <span>#{v} · {r.paso}</span> },
          { key: 'patente', label: 'Vehículo', render: (v) => v || <span className="text-white/25">Peatonal</span> },
          { key: 'inspector', label: 'Inspector' },
          { key: 'items', label: 'Ítems' },
          { key: 'resultado', label: 'Resultado', render: (v) => <StatusDot status={v} /> },
        ]}
        formFields={[
          { key: 'idCruce', label: 'N° de cruce', type: 'number', required: true, createOnly: true },
          { key: 'idFuncionarioInspector', label: 'Inspector', type: 'select', options: inspectores, createOnly: true, help: 'Vacío = usted' },
          { key: 'resultado', label: 'Resultado', type: 'select', options: resultados, required: true },
          { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
        ]}
        emptyData={{ idCruce: '', idFuncionarioInspector: '', resultado: 'PENDIENTE', observaciones: '' }}
        deleteConfirm={(r) => `¿Eliminar la inspección #${r.id} y sus ítems?`}
      />
      {detalle && <DetalleInspeccion id={detalle} editor={editor} onClose={() => setDetalle(null)} />}
    </>
  )
}
