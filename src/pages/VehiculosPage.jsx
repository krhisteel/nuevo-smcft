import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { Badge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'

const tipos = [
  { value: 'PARTICULAR', label: 'Particular (plazo 180 días)' },
  { value: 'DIPLOMATICO', label: 'Diplomático (plazo 90 días)' },
  { value: 'COMERCIAL', label: 'Comercial (plazo 180 días)' },
]
const estados = [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]

export default function VehiculosPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')
  return (
    <CrudPage
      title={user?.rol === 'VIAJERO' ? 'Mis vehículos' : 'Vehículos'}
      subtitle="Parque vehicular (tabla VEHICULO)"
      icon="Car"
      endpoint="vehiculos"
      canCreate={editor}
      canEdit={editor}
      canDelete={editor}
      columns={[
        { key: 'patente', label: 'Patente', render: (v) => <span className="font-mono text-white/80">{v}</span> },
        { key: 'marca', label: 'Marca' },
        { key: 'modelo', label: 'Modelo' },
        { key: 'anio', label: 'Año' },
        { key: 'tipoVehiculo', label: 'Tipo', render: (v) => <Badge color={v === 'DIPLOMATICO' ? '#f59e0b' : '#4f8cff'}>{v}</Badge> },
        { key: 'propietario', label: 'Propietario', render: (v, r) => <span>{v} <span className="text-white/25">({r.rutPropietario})</span></span> },
        { key: 'estadoPlazo', label: 'Último plazo', render: (v) => v ? <StatusDot status={v} /> : <span className="text-white/20">—</span> },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'patente', label: 'Patente', placeholder: 'ABCD12', required: true },
        { key: 'rutPropietario', label: 'RUT propietario', placeholder: '12345678-9', required: true },
        { key: 'marca', label: 'Marca', required: true },
        { key: 'modelo', label: 'Modelo', required: true },
        { key: 'anio', label: 'Año', type: 'number', required: true },
        { key: 'tipoVehiculo', label: 'Tipo', type: 'select', options: tipos, required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: estados, required: true },
      ]}
      emptyData={{ patente: '', rutPropietario: '', marca: '', modelo: '', anio: new Date().getFullYear(), tipoVehiculo: 'PARTICULAR', estado: 'ACTIVO' }}
      deleteConfirm={(r) => `¿Eliminar el vehículo ${r.patente}? Solo es posible si no tiene cruces ni documentos.`}
    />
  )
}
