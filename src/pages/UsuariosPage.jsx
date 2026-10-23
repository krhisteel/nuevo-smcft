import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'
import { CheckIcon } from '../components/Icons'
import { ROLES } from '../lib/roles'

const roles = Object.entries(ROLES).map(([value, r]) => ({ value, label: r.label }))

export default function UsuariosPage() {
  return (
    <CrudPage
      title="Usuarios"
      subtitle="Cuentas de acceso (USUARIO, USUARIO_ROL, ROL). Eliminar desactiva la cuenta."
      icon="Lock"
      endpoint="usuarios"
      canCreate
      canEdit
      canDelete
      createLabel="Nuevo usuario"
      deleteConfirm={(r) => `¿Desactivar la cuenta de ${r.email}?`}
      columns={[
        { key: 'rut', label: 'RUT' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rol', label: 'Rol', render: (v) => v ? <Badge color={ROLES[v]?.color}>{ROLES[v]?.label || v}</Badge> : <span className="text-white/20">Sin rol</span> },
        { key: 'institucion', label: 'Institución' },
        { key: 'accesoWeb', label: 'Acceso web', render: (v) => <CheckIcon active={v} /> },
        { key: 'activo', label: 'Activo', render: (v) => <CheckIcon active={v} /> },
      ]}
      formFields={[
        { key: 'rut', label: 'RUT de la persona', placeholder: '12345678-9', required: true, createOnly: true,
          help: 'Si la persona no existe se crea con los datos de abajo' },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'nombres', label: 'Nombres' },
        { key: 'apellidos', label: 'Apellidos' },
        { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', createOnly: true },
        { key: 'nacionalidad', label: 'Nacionalidad', createOnly: true },
        { key: 'password', label: 'Contraseña', type: 'password', createOnly: true, required: true },
        { key: 'password', label: 'Nueva contraseña', type: 'password', editOnly: true, help: 'Dejar vacío para no cambiarla' },
        { key: 'rol', label: 'Rol', type: 'select', options: roles, required: true },
        { key: 'activo', label: 'Cuenta activa', type: 'checkbox', editOnly: true },
      ]}
      emptyData={{ rut: '', email: '', nombres: '', apellidos: '', fechaNacimiento: '', nacionalidad: 'CHILENA', password: '', rol: 'VIAJERO' }}
      transformRow={(r) => ({ ...r, password: '' })}
    />
  )
}
