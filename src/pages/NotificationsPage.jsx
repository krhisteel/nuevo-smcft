import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const tipos = [
  { value: 'ALERTA_DEADLINE', label: 'Alerta Deadline' },
  { value: 'ALERTA_URGENTE', label: 'Alerta Urgente' },
  { value: 'ALERTA_VENCIDO', label: 'Alerta Vencido' },
  { value: 'INFORMATIVA', label: 'Informativa' },
]

const estados = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'ERROR', label: 'Error' },
]

export default function NotificationsPage() {
  return (
    <CrudPage
      title="Notificaciones"
      icon="Bell"
      endpoint="notifications"
      columns={[
        { key: 'titulo', label: 'Título' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        { key: 'createdAt', label: 'Creada', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'destinatarios', label: 'Destinatario', render: (v) => {
          if (!v || v.length === 0) return <span className="text-white/20">—</span>
          return v.map(d => d.rutDestinatario || d.nombre).join(', ')
        }},
      ]}
      formFields={[
        { key: 'titulo', label: 'Título', placeholder: 'Notificación' },
        { key: 'mensaje', label: 'Mensaje', type: 'textarea' },
        { key: 'tipo', label: 'Tipo', type: 'select', options: tipos },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
        { key: 'destinatarioRut', label: 'RUT Destinatario', placeholder: '12.345.678-9 (opcional)' },
      ]}
      transformRow={(row) => ({ ...row, destinatarioRut: row.destinatarios?.[0]?.rutDestinatario || '' })}
      emptyData={{ titulo: '', mensaje: '', tipo: 'INFORMATIVA', estado: 'PENDIENTE', destinatarioRut: '' }}
    />
  )
}
