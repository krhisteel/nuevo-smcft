import { useState, useMemo, useEffect, useCallback } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { Badge, LinkButton, Modal, MiniTable, Button, inputClass } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import useCatalogos from '../lib/useCatalogos'
import { fmtFecha, fmtFechaHora, fmtUSD, mensajeError } from '../lib/format'

const movimientos = [{ value: 'SALIDA', label: 'Salida del país' }, { value: 'ENTRADA', label: 'Entrada al país' }]

export const MovBadge = ({ v }) => <Badge color={v === 'SALIDA' ? '#f59e0b' : '#10b981'}>{v}</Badge>

function DetalleCruce({ id, editor, onClose }) {
  const [c, setC] = useState(null)
  const [numero, setNumero] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      setC((await api.get(`/cruces/${id}`)).data)
    } catch (err) {
      setError(mensajeError(err))
    }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const vincular = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/cruces/${id}/documentos`, { numero })
      setNumero('')
      cargar()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <Modal title={`Cruce #${id}`} onClose={onClose} wide>
      {error && <p className="text-red-400/70 text-xs">{error}</p>}
      {!c ? <p className="text-white/20 text-xs">Cargando...</p> : (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato label="Paso">{c.paso}</Dato>
            <Dato label="Movimiento"><MovBadge v={c.tipoMovimiento} /></Dato>
            <Dato label="Fecha y hora">{fmtFechaHora(c.fechaHora)}</Dato>
            <Dato label="Estado"><StatusDot status={c.estado} /></Dato>
            <Dato label="Vehículo">{c.patente ? `${c.patente} (${c.tipoVehiculo})` : 'Peatonal'}</Dato>
            <Dato label="Valor declarado">{fmtUSD(c.valorDeclarado)}</Dato>
            <Dato label="Plazo de admisión">
              {c.plazo ? <span>{c.plazo.tipo} · vence {fmtFecha(c.plazo.fechaLimite)} <StatusDot status={c.plazo.estado} /></span> : '—'}
            </Dato>
          </div>
          <Seccion titulo="Viajeros">
            <MiniTable rows={c.detalleViajeros} columns={[
              { key: 'rut', label: 'RUT' }, { key: 'nombre', label: 'Nombre' },
              { key: 'rolViajero', label: 'Rol' }, { key: 'edad', label: 'Edad' },
            ]} />
          </Seccion>
          <Seccion titulo="Documentos presentados">
            <MiniTable rows={c.documentos} empty="Sin documentos vinculados" columns={[
              { key: 'tipoDocumento', label: 'Tipo' }, { key: 'numero', label: 'Número' },
              { key: 'fechaVencimiento', label: 'Vencimiento', render: fmtFecha },
              { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
            ]} />
            {editor && (
              <form onSubmit={vincular} className="flex gap-2 mt-2">
                <input className={inputClass} placeholder="Número de documento (ej: CI-2400-01)" value={numero} onChange={(e) => setNumero(e.target.value)} required />
                <Button type="submit" icon="Plus">Vincular</Button>
              </form>
            )}
          </Seccion>
          <Seccion titulo="Controles realizados">
            <MiniTable rows={c.controles} columns={[
              { key: 'tipoControl', label: 'Control' }, { key: 'resultado', label: 'Resultado' },
              { key: 'funcionario', label: 'Funcionario' }, { key: 'institucion', label: 'Institución' },
              { key: 'fechaHora', label: 'Fecha', render: fmtFechaHora },
            ]} />
          </Seccion>
          <Seccion titulo="Declaraciones">
            <MiniTable rows={c.declaraciones} empty="Sin declaraciones" columns={[
              { key: 'id', label: 'N°' }, { key: 'tipo', label: 'Tipo' }, { key: 'fecha', label: 'Fecha', render: fmtFecha },
              { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
              { key: 'totalUsd', label: 'Total', render: fmtUSD },
            ]} />
          </Seccion>
        </div>
      )}
    </Modal>
  )
}

export const Dato = ({ label, children }) => (
  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
    <p className="text-[10px] text-white/30 mb-1">{label}</p>
    <div className="text-white/70">{children}</div>
  </div>
)

export const Seccion = ({ titulo, children }) => (
  <div>
    <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">{titulo}</h3>
    {children}
  </div>
)

export default function CrucesPage() {
  const { user } = useAuth()
  const { pasos } = useCatalogos()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')
  const [detalle, setDetalle] = useState(null)
  const [tipo, setTipo] = useState('')
  const params = useMemo(() => (tipo ? { tipo } : undefined), [tipo])
  const opcionesPaso = pasos.map((p) => ({ value: String(p.id), label: p.nombre }))

  const cambiarEstado = async (row, estado, reload) => {
    if (!confirm(`¿Marcar el cruce #${row.id} como ${estado}?`)) return
    try {
      await api.patch(`/cruces/${row.id}/estado`, { estado })
      reload()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <>
      <CrudPage
        title={user?.rol === 'VIAJERO' ? 'Mis cruces' : 'Cruces fronterizos'}
        subtitle="El registro usa PKG_GESTION_FRONTERA.sp_registrar_cruce. Una salida con vehículo genera su plazo de admisión (trigger)."
        icon="Exit"
        endpoint="cruces"
        params={params}
        canCreate={editor}
        createLabel="Registrar cruce"
        onRowClick={(r) => setDetalle(r.id)}
        headerActions={() => (
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-xs`}>
            <option value="" className="bg-[#0f1a2e]">Todos los movimientos</option>
            <option value="ENTRADA" className="bg-[#0f1a2e]">Solo entradas</option>
            <option value="SALIDA" className="bg-[#0f1a2e]">Solo salidas</option>
          </select>
        )}
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'fechaHora', label: 'Fecha', render: fmtFechaHora },
          { key: 'paso', label: 'Paso' },
          { key: 'tipoMovimiento', label: 'Movimiento', render: (v) => <MovBadge v={v} /> },
          { key: 'patente', label: 'Vehículo', render: (v) => v ? <span className="font-mono">{v}</span> : <span className="text-white/25">Peatonal</span> },
          { key: 'viajeros', label: 'Viajeros' },
          { key: 'valorDeclarado', label: 'Declarado', render: fmtUSD },
          { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        ]}
        rowActions={(row, reload) => (
          <>
            <LinkButton icon="Eye" onClick={() => setDetalle(row.id)}>Ver</LinkButton>
            {editor && row.estado !== 'AUTORIZADO' && <LinkButton tone="success" icon="Check" onClick={() => cambiarEstado(row, 'AUTORIZADO', reload)}>Autorizar</LinkButton>}
            {editor && row.estado !== 'RECHAZADO' && <LinkButton tone="danger" icon="X" onClick={() => cambiarEstado(row, 'RECHAZADO', reload)}>Rechazar</LinkButton>}
          </>
        )}
        formFields={[
          { key: 'idPaso', label: 'Paso fronterizo', type: 'select', options: opcionesPaso, required: true },
          { key: 'tipoMovimiento', label: 'Movimiento', type: 'select', options: movimientos, required: true },
          { key: 'patente', label: 'Patente del vehículo', placeholder: 'Vacío si es peatonal' },
          { key: 'rutConductor', label: 'RUT del conductor', placeholder: '12345678-9' },
          { key: 'rutsViajeros', label: 'RUT de los viajeros', type: 'textarea', full: true, placeholder: '12345678-9, 11222333-4',
            help: 'Separados por coma (máximo 10). Los menores de 18 años requieren autorización vigente.' },
        ]}
        emptyData={{ idPaso: opcionesPaso[0]?.value || '', tipoMovimiento: 'SALIDA', patente: '', rutConductor: '', rutsViajeros: '' }}
      />
      {detalle && <DetalleCruce id={detalle} editor={editor} onClose={() => setDetalle(null)} />}
    </>
  )
}
