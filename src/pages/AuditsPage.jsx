import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const tipos = [
  { value: 'USUARIO', label: 'Usuario' },
  { value: 'CRUCE_FRONTERIZO', label: 'Cruce Fronterizo' },
  { value: 'TRANSACCION', label: 'Transacción' },
  { value: 'SISTEMA', label: 'Sistema' },
]

const estados = [
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'OBSERVADO', label: 'Observado' },
]

export default function AuditsPage() {
  return (
    <CrudPage
      title="Auditoría"
      icon="Clipboard"
      endpoint="audits"
      columns={[
        { key: 'rutAuditor', label: 'Auditor' },
        { key: 'tipoAuditoria', label: 'Tipo' },
        { key: 'entidad', label: 'Entidad' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'rutAuditor', label: 'RUT Auditor', placeholder: '12.345.678-9' },
        { key: 'tipoAuditoria', label: 'Tipo', type: 'select', options: tipos },
        { key: 'entidad', label: 'Entidad', placeholder: 'ej: Vehículos' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
      ]}
      emptyData={{
        rutAuditor: '',
        tipoAuditoria: 'USUARIO',
        entidad: '',
        descripcion: '',
        estado: 'EN_PROCESO',
      }}
      transformSubmit={(form, isEdit) => {
        const d = new Date()
        d.setSeconds(d.getSeconds() - 1)
        const fecha = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString().replace('Z', '')
        return { ...form, fechaInicio: fecha }
      }}
    />
  )
}
