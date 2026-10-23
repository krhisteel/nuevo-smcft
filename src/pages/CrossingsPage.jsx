import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const pasos = [
  { value: 'LOS_LIBERTADORES', label: 'Los Libertadores' },
  { value: 'CHACALLUTA', label: 'Chacalluta' },
  { value: 'PIINO_HACHADO', label: 'Pino Hachado' },
  { value: 'CARDENAL_SAMORE', label: 'Cardenal Samoré' },
]

const estados = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'AUTORIZADO', label: 'Autorizado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]

export default function CrossingsPage() {
  return (
    <CrudPage
      title="Cruces Fronterizos"
      icon="Exit"
      endpoint="border-crossings"
      columns={[
        { key: 'patente', label: 'Patente' },
        { key: 'rutConductor', label: 'Conductor' },
        { key: 'paisDestino', label: 'Destino' },
        { key: 'pasoFronterizo', label: 'Paso' },
        { key: 'fechaCruce', label: 'Fecha', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'patente', label: 'Patente', placeholder: 'ABCD-12' },
        { key: 'rutConductor', label: 'RUT Conductor', placeholder: '12.345.678-9' },
        { key: 'paisDestino', label: 'País de destino', placeholder: 'Argentina' },
        { key: 'pasoFronterizo', label: 'Paso fronterizo', type: 'select', options: pasos },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
      ]}
      transformSubmit={(form, isEdit) => {
        if (isEdit) return form
        const d = new Date()
        d.setSeconds(d.getSeconds() - 1)
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        return { ...form, fechaCruce: local.toISOString().replace('Z', '') }
      }}
      emptyData={{ patente: '', rutConductor: '', paisDestino: '', pasoFronterizo: 'LOS_LIBERTADORES', estado: 'PENDIENTE', observaciones: '' }}
    />
  )
}
