import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const tipos = [
  { value: 'CRUCE_FRONTERIZO', label: 'Cruce Fronterizo' },
  { value: 'ADMISION_TEMPORAL', label: 'Admisión Temporal' },
  { value: 'VEHICULOS', label: 'Vehículos' },
  { value: 'USUARIOS', label: 'Usuarios' },
]

const estados = [
  { value: 'GENERANDO', label: 'Generando' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'ERROR', label: 'Error' },
]

export default function ReportsPage() {
  return (
    <CrudPage
      title="Reportes"
      icon="Chart"
      endpoint="reports"
      columns={[
        { key: 'titulo', label: 'Título' },
        { key: 'tipoReporte', label: 'Tipo' },
        { key: 'generadoPor', label: 'Generado por' },
        { key: 'fechaInicio', label: 'Desde', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'titulo', label: 'Título', placeholder: 'Reporte mensual' },
        { key: 'tipoReporte', label: 'Tipo de reporte', type: 'select', options: tipos },
        { key: 'generadoPor', label: 'RUT generador', placeholder: '12.345.678-9' },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
      ]}
      emptyData={{ titulo: '', tipoReporte: 'CRUCE_FRONTERIZO', generadoPor: '', estado: 'GENERANDO' }}
      transformSubmit={(form, isEdit) => {
        const now = new Date()
        now.setSeconds(now.getSeconds() - 1)
        const inicio = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString().replace('Z', '')
        const fin = new Date(now.getTime() + 86400000 - now.getTimezoneOffset() * 60000)
          .toISOString().replace('Z', '')
        return { ...form, fechaInicio: inicio, fechaFin: fin }
      }}
    />
  )
}
