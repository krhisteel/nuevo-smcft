import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/roles'
import { fmtFecha } from '../lib/format'

export default function PersonasPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')
  return (
    <CrudPage
      title="Personas"
      subtitle="Viajeros, propietarios y funcionarios (tabla PERSONA)"
      icon="Users"
      endpoint="personas"
      canCreate={editor}
      canEdit={editor}
      canDelete={editor}
      columns={[
        { key: 'rut', label: 'RUT' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'nacionalidad', label: 'Nacionalidad' },
        { key: 'fechaNacimiento', label: 'Nacimiento', render: fmtFecha },
        { key: 'edad', label: 'Edad', render: (v, r) => (
          <span className="flex items-center gap-1.5">{v}
            {v < 18 && <Badge color={r.autorizacionesVigentes ? '#10b981' : '#ef4444'}>{r.autorizacionesVigentes ? 'Menor autorizado' : 'Menor sin autorización'}</Badge>}
          </span>
        ) },
      ]}
      formFields={[
        { key: 'rut', label: 'RUT', placeholder: '12345678-9', required: true },
        { key: 'nacionalidad', label: 'Nacionalidad', placeholder: 'CHILENA' },
        { key: 'nombres', label: 'Nombres', required: true },
        { key: 'apellidos', label: 'Apellidos', required: true },
        { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
      ]}
      emptyData={{ rut: '', nombres: '', apellidos: '', nacionalidad: 'CHILENA', fechaNacimiento: '' }}
      deleteConfirm={(r) => `¿Eliminar a ${r.nombre}? Solo es posible si no tiene registros asociados.`}
    />
  )
}
