import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const pasos = [
  { value: 'LOS_LIBERTADORES', label: 'Los Libertadores' },
  { value: 'CHACALLUTA', label: 'Chacalluta' },
  { value: 'PIINO_HACHADO', label: 'Pino Hachado' },
  { value: 'CARDENAL_SAMORE', label: 'Cardenal Samoré' },
  { value: 'IGUEQUE', label: 'Iquique' },
]

const tiposIngreso = [
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'ADMISION_TEMPORAL', label: 'Admisión Temporal' },
]

const estados = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'AUTORIZADO', label: 'Autorizado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]

export default function EntriesPage() {
  return (
    <CrudPage
      title="Ingresos"
      icon="Entry"
      endpoint="entries"
      columns={[
        { key: 'patente', label: 'Patente' },
        { key: 'rutConductor', label: 'Conductor' },
        { key: 'paisOrigen', label: 'Origen' },
        { key: 'pasoFronterizo', label: 'Paso' },
        { key: 'fechaIngreso', label: 'Fecha', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'patente', label: 'Patente', placeholder: 'ABCD-12' },
        { key: 'rutConductor', label: 'RUT Conductor', placeholder: '12.345.678-9' },
        { key: 'paisOrigen', label: 'País de origen', placeholder: 'Argentina' },
        { key: 'pasoFronterizo', label: 'Paso fronterizo', type: 'select', options: pasos },
        { key: 'tipoIngreso', label: 'Tipo de ingreso', type: 'select', options: tiposIngreso },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
      ]}
      transformSubmit={(form, isEdit) => {
        if (isEdit) return form
        const d = new Date()
        d.setSeconds(d.getSeconds() - 1)
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        return { ...form, fechaIngreso: local.toISOString().replace('Z', '') }
      }}
      emptyData={{ patente: '', rutConductor: '', paisOrigen: '', pasoFronterizo: 'LOS_LIBERTADORES', tipoIngreso: 'RETORNO', estado: 'PENDIENTE', observaciones: '' }}
    />
  )
}
