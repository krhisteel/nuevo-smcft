import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { LinkButton } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import { fmtFecha, hoyISO, mensajeError } from '../lib/format'

const permisos = ['NOTARIAL', 'JUDICIAL'].map((t) => ({ value: t, label: t }))

export default function AutorizacionesPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')

  const cambiar = async (row, estado, reload) => {
    try {
      await api.patch(`/autorizaciones/${row.id}/estado`, { estado })
      reload()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <CrudPage
      title="Autorización de menores"
      subtitle="sp_registrar_cruce exige una autorización VIGENTE a los viajeros menores de 18 años"
      icon="Shield"
      endpoint="autorizaciones"
      canCreate={editor}
      canDelete={editor}
      createLabel="Nueva autorización"
      columns={[
        { key: 'menor', label: 'Menor', render: (v, r) => <span>{v} <span className="text-white/25">({r.rutMenor}, {r.edadMenor} años)</span></span> },
        { key: 'representante', label: 'Representante', render: (v, r) => <span>{v} <span className="text-white/25">({r.rutRepresentante})</span></span> },
        { key: 'tipoPermiso', label: 'Permiso' },
        { key: 'numeroDocumento', label: 'Documento' },
        { key: 'fechaEmision', label: 'Emisión', render: fmtFecha },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      rowActions={editor ? (row, reload) => row.estado === 'VIGENTE'
        ? <LinkButton tone="danger" icon="X" onClick={() => cambiar(row, 'REVOCADA', reload)}>Revocar</LinkButton>
        : <LinkButton tone="success" icon="Check" onClick={() => cambiar(row, 'VIGENTE', reload)}>Reactivar</LinkButton> : undefined}
      formFields={[
        { key: 'rutMenor', label: 'RUT del menor', placeholder: '12345678-9', required: true },
        { key: 'rutRepresentante', label: 'RUT del representante', placeholder: '12345678-9', required: true },
        { key: 'numeroDocumento', label: 'N° del documento', required: true, help: 'Debe estar registrado en Documentos (ej: autorización notarial)' },
        { key: 'tipoPermiso', label: 'Tipo de permiso', type: 'select', options: permisos, required: true },
        { key: 'fechaEmision', label: 'Fecha de emisión', type: 'date' },
      ]}
      emptyData={{ rutMenor: '', rutRepresentante: '', numeroDocumento: '', tipoPermiso: 'NOTARIAL', fechaEmision: hoyISO() }}
    />
  )
}
