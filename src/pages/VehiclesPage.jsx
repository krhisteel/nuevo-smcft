import { useMemo } from 'react'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { useAuth } from '../context/AuthContext'

const tipos = [
  { value: 'PARTICULAR', label: 'Particular' },
  { value: 'DIPLOMATICO', label: 'Diplomático' },
  { value: 'COMERCIAL', label: 'Comercial' },
]

const estados = [
  { value: 'EN_TERRITORIO_NACIONAL', label: 'En territorio nacional' },
  { value: 'FUERA_DEL_PAIS', label: 'Fuera del país' },
  { value: 'ADMISION_TEMPORAL', label: 'Admisión temporal' },
]

const estadoMap = {
  EN_TERRITORIO_NACIONAL: { color: '#10b981', label: 'En Chile' },
  FUERA_DEL_PAIS: { color: '#f59e0b', label: 'Fuera del país' },
  ADMISION_TEMPORAL: { color: '#4f8cff', label: 'Admisión temporal' },
}

export default function VehiclesPage() {
  const { user } = useAuth()
  const isViajero = user?.rol === 'VIAJERO'
  const rut = user?.rut
  const fetchParams = useMemo(() => isViajero && rut ? { rutPropietario: rut } : {}, [isViajero, rut])
  const emptyData = useMemo(() => ({
    patente: '', marca: '', modelo: '',
    anio: new Date().getFullYear(),
    tipoVehiculo: 'PARTICULAR',
    rutPropietario: rut || '',
    estado: 'EN_TERRITORIO_NACIONAL'
  }), [rut])
  return (
    <CrudPage
      fetchParams={fetchParams}
      title="Vehículos"
      icon="Car"
      endpoint="vehicles"
      columns={[
        { key: 'patente', label: 'Patente' },
        { key: 'marca', label: 'Marca' },
        { key: 'modelo', label: 'Modelo' },
        { key: 'anio', label: 'Año' },
        { key: 'tipoVehiculo', label: 'Tipo' },
        { key: 'rutPropietario', label: 'Propietario' },
        { key: 'estado', label: 'Estado', render: (v) => {
          const e = estadoMap[v] || { color: '#6b7280', label: v }
          return <StatusDot status={v} />
        }},
      ]}
      formFields={[
        { key: 'patente', label: 'Patente', placeholder: 'ABCD-12', required: true },
        { key: 'marca', label: 'Marca', placeholder: 'Toyota', required: true },
        { key: 'modelo', label: 'Modelo', placeholder: 'Corolla', required: true },
        { key: 'anio', label: 'Año', placeholder: '2024', required: true },
        { key: 'tipoVehiculo', label: 'Tipo', type: 'select', options: tipos, required: true },
        { key: 'rutPropietario', label: 'RUT Propietario', placeholder: '12.345.678-9', required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: estados, required: true },
      ]}
      emptyData={emptyData}
    />
  )
}
