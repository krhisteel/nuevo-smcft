// Roles del esquema SMCFT (tabla ROL) y permisos de la interfaz.
// La API valida los mismos permisos; aquí solo se usan para mostrar u ocultar opciones.
export const ROLES = {
  ADMINISTRADOR: { label: 'Administrador', color: '#4f8cff' },
  FISCALIZADOR: { label: 'Fiscalizador', color: '#818cf8' },
  INSPECTOR_SAG: { label: 'Inspector SAG', color: '#f59e0b' },
  AUDITOR: { label: 'Auditor', color: '#06b6d4' },
  VIAJERO: { label: 'Viajero', color: '#34d399' },
}

export const STAFF = ['ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG', 'AUDITOR']

export const puede = (user, ...roles) => roles.includes(user?.rol)
