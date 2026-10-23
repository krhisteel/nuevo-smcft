import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { LinkButton } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import { fmtFechaHora, mensajeError } from '../lib/format'

const tipos = ['INFORMATIVA', 'ALERTA_PLAZO', 'URGENTE'].map((t) => ({ value: t, label: t }))

export default function NotificacionesPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')

  const enviar = async (row, reload) => {
    try {
      await api.patch(`/notificaciones/${row.id}/enviar`)
      reload()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <CrudPage
      title="Notificaciones"
      subtitle="Mensajes a viajeros y funcionarios (NOTIFICACION y NOTIFICACION_DESTINATARIO)"
      icon="Bell"
      endpoint="notificaciones"
      canCreate={editor}
      canEdit={editor}
      canDelete={editor}
      createLabel="Nueva notificación"
      columns={[
        { key: 'fechaCreacion', label: 'Creada', render: fmtFechaHora },
        { key: 'titulo', label: 'Título' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'destinatarios', label: 'Destinatarios', render: (v) => v || <span className="text-white/20">—</span> },
        { key: 'leidas', label: 'Leídas' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      rowActions={editor ? (row, reload) => row.estado !== 'ENVIADA' && (
        <LinkButton tone="success" icon="Mail" onClick={() => enviar(row, reload)}>Enviar</LinkButton>
      ) : undefined}
      formFields={[
        { key: 'titulo', label: 'Título', required: true },
        { key: 'tipo', label: 'Tipo', type: 'select', options: tipos, required: true },
        { key: 'mensaje', label: 'Mensaje', type: 'textarea', required: true, full: true },
        { key: 'destinatarios', label: 'RUT de destinatarios', full: true, placeholder: '12345678-9, 11222333-4',
          help: 'Separados por coma. Al editar, los RUT nuevos se agregan a los existentes.' },
      ]}
      emptyData={{ titulo: '', tipo: 'INFORMATIVA', mensaje: '', destinatarios: '' }}
      transformRow={(r) => ({ ...r, destinatarios: '' })}
    />
  )
}
