import { useState, useEffect } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { LinkButton, Modal, MiniTable, Badge } from '../components/ui'
import { fmtFechaHora, mensajeError } from '../lib/format'

function DetalleAuditoria({ id, onClose }) {
  const [a, setA] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get(`/auditorias/${id}`).then((res) => setA(res.data)).catch((err) => setError(mensajeError(err)))
  }, [id])
  return (
    <Modal title={`Auditoría #${id}`} onClose={onClose} wide>
      {!a ? <p className="text-white/20 text-xs">{error || 'Cargando...'}</p> : (
        <div className="space-y-4 text-xs">
          <p className="text-white/50">{a.descripcion}</p>
          <MiniTable rows={a.detalle} empty="Sin detalle (las auditorías de sentencia no tienen detalle por fila)" columns={[
            { key: 'fechaAccion', label: 'Fecha', render: fmtFechaHora },
            { key: 'accion', label: 'Acción', render: (v) => <Badge color={v === 'DELETE' ? '#ef4444' : v === 'INSERT' ? '#10b981' : '#4f8cff'}>{v}</Badge> },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'usuario', label: 'Usuario' },
            { key: 'resultado', label: 'Resultado' },
          ]} />
        </div>
      )}
    </Modal>
  )
}

const tipos = ['MANUAL', 'USUARIO', 'CRUCE_FRONTERIZO', 'SISTEMA'].map((t) => ({ value: t, label: t }))

export default function AuditoriaPage() {
  const [detalle, setDetalle] = useState(null)

  const cerrar = async (row, reload) => {
    try {
      await api.patch(`/auditorias/${row.id}/cerrar`)
      reload()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <>
      <CrudPage
        title="Auditoría"
        subtitle="Incluye las auditorías automáticas de los triggers sobre DOCUMENTO (fila y sentencia)"
        icon="Clipboard"
        endpoint="auditorias"
        canCreate
        createLabel="Nueva auditoría"
        onRowClick={(r) => setDetalle(r.id)}
        rowActions={(row, reload) => (
          <>
            <LinkButton icon="Eye" onClick={() => setDetalle(row.id)}>Ver</LinkButton>
            {row.estado !== 'COMPLETADA' && <LinkButton tone="success" icon="Check" onClick={() => cerrar(row, reload)}>Cerrar</LinkButton>}
          </>
        )}
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'fechaInicio', label: 'Inicio', render: fmtFechaHora },
          { key: 'tipoAuditoria', label: 'Tipo', render: (v) => <Badge color={v.startsWith('TRIGGER') || v.startsWith('AUTOMATICA') ? '#06b6d4' : '#818cf8'}>{v}</Badge> },
          { key: 'entidad', label: 'Entidad' },
          { key: 'descripcion', label: 'Descripción' },
          { key: 'detalles', label: 'Detalles' },
          { key: 'auditor', label: 'Auditor' },
          { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        ]}
        formFields={[
          { key: 'tipoAuditoria', label: 'Tipo', type: 'select', options: tipos, required: true },
          { key: 'entidad', label: 'Entidad (tabla)', placeholder: 'CRUCE_FRONTERIZO', required: true },
          { key: 'entidadId', label: 'ID del registro', type: 'number' },
          { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true, full: true },
        ]}
        emptyData={{ tipoAuditoria: 'MANUAL', entidad: '', entidadId: '', descripcion: '' }}
      />
      {detalle && <DetalleAuditoria id={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}
