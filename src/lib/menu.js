// Menú lateral según el rol del usuario conectado.
const M = {
  dashboard: { label: 'Dashboard', path: '/dashboard', icon: 'Dashboard' },
  cruces: { label: 'Cruces fronterizos', path: '/cruces', icon: 'Exit' },
  personas: { label: 'Personas', path: '/personas', icon: 'Users' },
  vehiculos: { label: 'Vehículos', path: '/vehiculos', icon: 'Car' },
  documentos: { label: 'Documentos', path: '/documentos', icon: 'FileText' },
  autorizaciones: { label: 'Autorización menores', path: '/autorizaciones', icon: 'Shield' },
  declaraciones: { label: 'Declaraciones', path: '/declaraciones', icon: 'Dollar' },
  sanidad: { label: 'Inspección SAG', path: '/sanidad', icon: 'Flask' },
  plazos: { label: 'Plazos de admisión', path: '/plazos', icon: 'Alert' },
  notificaciones: { label: 'Notificaciones', path: '/notificaciones', icon: 'Bell' },
  reportes: { label: 'Reportes', path: '/reportes', icon: 'Chart' },
  auditoria: { label: 'Auditoría', path: '/auditoria', icon: 'Clipboard' },
  usuarios: { label: 'Usuarios', path: '/usuarios', icon: 'Lock' },
  pasos: { label: 'Pasos fronterizos', path: '/pasos', icon: 'Flag' },
  categorias: { label: 'Categorías', path: '/categorias', icon: 'Building' },
  triggers: { label: 'Triggers', path: '/triggers', icon: 'Refresh' },
}

export const menuItems = {
  ADMINISTRADOR: [M.dashboard, M.cruces, M.personas, M.vehiculos, M.documentos, M.autorizaciones, M.declaraciones,
    M.sanidad, M.plazos, M.notificaciones, M.reportes, M.auditoria, M.usuarios, M.pasos, M.categorias, M.triggers],
  FISCALIZADOR: [M.dashboard, M.cruces, M.personas, M.vehiculos, M.documentos, M.autorizaciones, M.declaraciones,
    M.plazos, M.notificaciones],
  INSPECTOR_SAG: [M.dashboard, M.cruces, M.declaraciones, M.sanidad, M.notificaciones],
  AUDITOR: [M.dashboard, M.cruces, M.plazos, M.reportes, M.auditoria],
  VIAJERO: [M.dashboard, { ...M.vehiculos, label: 'Mis vehículos' }, { ...M.cruces, label: 'Mis cruces' },
    { ...M.plazos, label: 'Mis plazos' }],
}
