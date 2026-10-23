import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { Badge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import { fmtFecha } from '../lib/format'

const tipos = ['CEDULA', 'PASAPORTE', 'PADRON', 'PERMISO_CIRCULACION', 'SEGURO_OBLIGATORIO', 'AUTORIZACION_NOTARIAL']
  .map((t) => ({ value: t, label: t.replaceAll('_', ' ') }))
const estados = ['VIGENTE', 'REVISADO', 'VENCIDO', 'ANULADO'].map((t) => ({ value: t, label: t }))

export default function DocumentosPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')
  return (
    <CrudPage
      title="Documentos"
      subtitle="Cada cambio queda auditado automáticamente por los triggers TRG_DOCUMENTO_AUDIT y TRG_DOCUMENTO_SENTENCIA"
      icon="FileText"
      endpoint="documentos"
      canCreate={editor}
      canEdit={editor}
      canDelete={editor}
      columns={[
        { key: 'numero', label: 'Número', render: (v) => <span className="font-mono text-white/80">{v}</span> },
        { key: 'tipoDocumento', label: 'Tipo' },
        { key: 'titularTipo', label: 'Titular', render: (v, r) => v === 'PERSONA'
          ? <span>{r.persona} <span className="text-white/25">({r.rutPersona})</span></span>
          : <span>Vehículo <span className="font-mono">{r.patente}</span></span> },
        { key: 'fechaEmision', label: 'Emisión', render: fmtFecha },
        { key: 'fechaVencimiento', label: 'Vencimiento', render: (v, r) => (
          <span className="flex items-center gap-1.5">{fmtFecha(v)}{r.vencido && <Badge color="#ef4444">Vencido</Badge>}</span>
        ) },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'tipoDocumento', label: 'Tipo', type: 'select', options: tipos, required: true },
        { key: 'numero', label: 'Número', required: true },
        { key: 'rutPersona', label: 'RUT de la persona', placeholder: '12345678-9', help: 'Complete el RUT o la patente (solo uno)' },
        { key: 'patente', label: 'Patente del vehículo', placeholder: 'ABCD12' },
        { key: 'fechaEmision', label: 'Fecha de emisión', type: 'date' },
        { key: 'fechaVencimiento', label: 'Fecha de vencimiento', type: 'date' },
        { key: 'estado', label: 'Estado', type: 'select', options: estados, required: true },
      ]}
      emptyData={{ tipoDocumento: 'CEDULA', numero: '', rutPersona: '', patente: '', fechaEmision: '', fechaVencimiento: '', estado: 'VIGENTE' }}
      transformRow={(r) => ({ ...r, rutPersona: r.rutPersona || '', patente: r.patente || '' })}
    />
  )
}
