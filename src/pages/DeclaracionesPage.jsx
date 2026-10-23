import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot, CheckIcon } from '../components/Icons'
import { Badge, LinkButton, Modal, MiniTable, Button, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import useCatalogos from '../lib/useCatalogos'
import { fmtFecha, fmtUSD, mensajeError } from '../lib/format'
import { MovBadge, Dato, Seccion } from './CrucesPage'

const tipos = ['EQUIPAJE', 'MERCANCIA', 'DINERO', 'SAG'].map((t) => ({ value: t, label: t }))
const estados = ['REGISTRADA', 'REVISADA', 'OBSERVADA', 'CERRADA'].map((t) => ({ value: t, label: t }))

function DetalleDeclaracion({ id, editor, onClose }) {
  const { categorias } = useCatalogos()
  const [d, setD] = useState(null)
  const [item, setItem] = useState({ idCategoria: '', descripcion: '', cantidad: 1, valorUsd: '' })
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      setD((await api.get(`/declaraciones/${id}`)).data)
    } catch (err) {
      setError(mensajeError(err))
    }
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  const agregar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/declaraciones/${id}/items`, { ...item, idCategoria: item.idCategoria || categorias[0]?.id })
      setItem({ idCategoria: item.idCategoria, descripcion: '', cantidad: 1, valorUsd: '' })
      cargar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  const accion = async (fn) => {
    try {
      await fn()
      cargar()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  const opcionesCat = categorias.map((c) => ({ value: String(c.id), label: `${c.nombre}${c.limiteValorUsd !== null ? ` (límite ${fmtUSD(c.limiteValorUsd)})` : ''}` }))

  return (
    <Modal title={`Declaración #${id}`} onClose={onClose} wide>
      {!d ? <p className="text-white/20 text-xs">{error || 'Cargando...'}</p> : (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato label="Cruce">#{d.idCruce} · {d.paso}</Dato>
            <Dato label="Movimiento"><MovBadge v={d.tipoMovimiento} /></Dato>
            <Dato label="Tipo / fecha">{d.tipo} · {fmtFecha(d.fecha)}</Dato>
            <Dato label="Total declarado">{fmtUSD(d.totalUsd)}</Dato>
          </div>
          <Seccion titulo="Ítems declarados">
            <MiniTable rows={d.detalleItems} empty="Sin ítems" columns={[
              { key: 'categoria', label: 'Categoría' },
              { key: 'descripcion', label: 'Descripción' },
              { key: 'cantidad', label: 'Cant.' },
              { key: 'valorUsd', label: 'Valor', render: (v, r) => <span className="flex items-center gap-1.5">{fmtUSD(v)}{r.excedeLimite && <Badge color="#ef4444">Excede límite</Badge>}</span> },
              { key: 'aprobado', label: 'Aprobado', render: (v) => <CheckIcon active={v} /> },
              ...(editor ? [{ key: 'acciones', label: '', render: (_, r) => (
                <div className="flex gap-2 justify-end">
                  <LinkButton tone={r.aprobado ? 'danger' : 'success'} icon={r.aprobado ? 'X' : 'Check'}
                    onClick={() => accion(() => api.patch(`/declaraciones/items/${r.id}`, { aprobado: !r.aprobado }))}>
                    {r.aprobado ? 'Rechazar' : 'Aprobar'}
                  </LinkButton>
                  <LinkButton tone="danger" icon="Trash" onClick={() => confirm('¿Eliminar ítem?') && accion(() => api.delete(`/declaraciones/items/${r.id}`))} />
                </div>
              ) }] : []),
            ]} />
          </Seccion>
          {editor && (
            <form onSubmit={agregar} className="space-y-3">
              {error && <p className="text-red-400/80">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <Field field={{ label: 'Categoría', type: 'select', options: opcionesCat, required: true }} value={item.idCategoria || opcionesCat[0]?.value} onChange={(v) => setItem({ ...item, idCategoria: v })} />
                <Field field={{ label: 'Descripción', required: true }} value={item.descripcion} onChange={(v) => setItem({ ...item, descripcion: v })} />
                <Field field={{ label: 'Cantidad', type: 'number', min: 1, required: true }} value={item.cantidad} onChange={(v) => setItem({ ...item, cantidad: v })} />
                <Field field={{ label: 'Valor USD', type: 'number', step: '0.01', min: 0, required: true }} value={item.valorUsd} onChange={(v) => setItem({ ...item, valorUsd: v })} />
              </div>
              <div className="flex justify-end"><Button type="submit" icon="Plus">Agregar ítem</Button></div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function DeclaracionesPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG')
  const [detalle, setDetalle] = useState(null)
  return (
    <>
      <CrudPage
        title="Declaraciones"
        subtitle="Declaraciones de Aduana/SAG y sus ítems. El total por cruce lo calcula FN_VALOR_DECLARADO."
        icon="Dollar"
        endpoint="declaraciones"
        canCreate={editor}
        canEdit={editor}
        canDelete={editor}
        createLabel="Nueva declaración"
        onRowClick={(r) => setDetalle(r.id)}
        rowActions={(row) => <LinkButton icon="Eye" onClick={() => setDetalle(row.id)}>Ítems</LinkButton>}
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'idCruce', label: 'Cruce', render: (v, r) => <span>#{v} · {r.paso}</span> },
          { key: 'patente', label: 'Vehículo', render: (v) => v || <span className="text-white/25">Peatonal</span> },
          { key: 'tipo', label: 'Tipo' },
          { key: 'fecha', label: 'Fecha', render: fmtFecha },
          { key: 'items', label: 'Ítems' },
          { key: 'totalUsd', label: 'Total', render: fmtUSD },
          { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        ]}
        formFields={[
          { key: 'idCruce', label: 'N° de cruce', type: 'number', required: true, createOnly: true, help: 'Vea el número en Cruces fronterizos' },
          { key: 'tipo', label: 'Tipo', type: 'select', options: tipos, required: true },
          { key: 'estado', label: 'Estado', type: 'select', options: estados, required: true },
        ]}
        emptyData={{ idCruce: '', tipo: 'EQUIPAJE', estado: 'REGISTRADA' }}
        deleteConfirm={(r) => `¿Eliminar la declaración #${r.id} y sus ítems?`}
      />
      {detalle && <DetalleDeclaracion id={detalle} editor={editor} onClose={() => setDetalle(null)} />}
    </>
  )
}
