import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const pasos = [
  { value: 'LOS_LIBERTADORES', label: 'Los Libertadores' },
  { value: 'CHACALLUTA', label: 'Chacalluta' },
  { value: 'PIINO_HACHADO', label: 'Pino Hachado' },
  { value: 'CARDENAL_SAMORE', label: 'Cardenal Samoré' },
]

const resultados = [
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'PENDIENTE', label: 'Pendiente' },
]

export default function SanitaryPage() {
  return (
    <CrudPage
      title="Inspecciones Sanitarias"
      icon="Flask"
      endpoint="sanitary"
      columns={[
        { key: 'patente', label: 'Patente' },
        { key: 'rutConductor', label: 'Conductor' },
        { key: 'rutInspector', label: 'Inspector SAG' },
        { key: 'pasoFronterizo', label: 'Paso' },
        { key: 'fechaInspeccion', label: 'Fecha', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'resultado', label: 'Resultado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'patente', label: 'Patente', placeholder: 'ABCD-12' },
        { key: 'rutConductor', label: 'RUT Conductor', placeholder: '12.345.678-9' },
        { key: 'rutInspector', label: 'RUT Inspector SAG', placeholder: '12.345.678-9' },
        { key: 'pasoFronterizo', label: 'Paso fronterizo', type: 'select', options: pasos },
        { key: 'resultado', label: 'Resultado', type: 'select', options: resultados },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
      ]}
      emptyData={{ patente: '', rutConductor: '', rutInspector: '', pasoFronterizo: 'LOS_LIBERTADORES', resultado: 'PENDIENTE', observaciones: '' }}
      transformSubmit={(form, isEdit) => {
        const d = new Date()
        d.setSeconds(d.getSeconds() - 1)
        const fecha = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString().replace('Z', '')
        return { ...form, fechaInspeccion: fecha }
      }}
    />
  )
}
