import CrudPage from '../components/CrudPage'
import { StatusDot, CheckIcon } from '../components/Icons'

const roles = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'FISCALIZADOR', label: 'Fiscalizador' },
  { value: 'VIAJERO', label: 'Viajero' },
]

export default function UsersPage() {
  return (
    <CrudPage
      title="Usuarios"
      icon="Users"
      endpoint="users"
      columns={[
        { key: 'rut', label: 'RUT' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rol', label: 'Rol', render: (v) => {
          const c = { ADMINISTRADOR: 'text-[#4f8cff]', FISCALIZADOR: 'text-[#818cf8]', VIAJERO: 'text-[#34d399]' }
          return <span className={`text-[11px] ${c[v] || 'text-white/40'}`}>{v}</span>
        }},
        { key: 'activo', label: 'Estado', render: (v) => <CheckIcon active={v} /> },
      ]}
      formFields={[
        { key: 'rut', label: 'RUT', placeholder: '12.345.678-9', required: true },
        { key: 'nombre', label: 'Nombre completo', placeholder: 'Nombre Apellido', required: true },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'usuario@aduana.cl', required: true },
        { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••', required: true },
        { key: 'rol', label: 'Rol', type: 'select', options: roles, required: true },
      ]}
      emptyData={{ rut: '', nombre: '', email: '', password: '', rol: 'VIAJERO' }}
    />
  )
}
