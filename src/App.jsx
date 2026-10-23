import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CrucesPage from './pages/CrucesPage'
import PersonasPage from './pages/PersonasPage'
import VehiculosPage from './pages/VehiculosPage'
import DocumentosPage from './pages/DocumentosPage'
import AutorizacionesPage from './pages/AutorizacionesPage'
import DeclaracionesPage from './pages/DeclaracionesPage'
import SanidadPage from './pages/SanidadPage'
import PlazosPage from './pages/PlazosPage'
import NotificacionesPage from './pages/NotificacionesPage'
import ReportesPage from './pages/ReportesPage'
import AuditoriaPage from './pages/AuditoriaPage'
import UsuariosPage from './pages/UsuariosPage'
import PasosPage from './pages/PasosPage'
import CategoriasPage from './pages/CategoriasPage'
import { STAFF } from './lib/roles'

const TODOS = [...STAFF, 'VIAJERO']

// path, componente y roles que pueden verlo (igual que el menú lateral)
const secciones = [
  ['dashboard', Dashboard, TODOS],
  ['cruces', CrucesPage, TODOS],
  ['vehiculos', VehiculosPage, ['ADMINISTRADOR', 'FISCALIZADOR', 'VIAJERO']],
  ['plazos', PlazosPage, ['ADMINISTRADOR', 'FISCALIZADOR', 'AUDITOR', 'VIAJERO']],
  ['personas', PersonasPage, ['ADMINISTRADOR', 'FISCALIZADOR']],
  ['documentos', DocumentosPage, ['ADMINISTRADOR', 'FISCALIZADOR']],
  ['autorizaciones', AutorizacionesPage, ['ADMINISTRADOR', 'FISCALIZADOR']],
  ['declaraciones', DeclaracionesPage, ['ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG']],
  ['sanidad', SanidadPage, ['ADMINISTRADOR', 'INSPECTOR_SAG']],
  ['notificaciones', NotificacionesPage, ['ADMINISTRADOR', 'FISCALIZADOR', 'INSPECTOR_SAG']],
  ['reportes', ReportesPage, ['ADMINISTRADOR', 'AUDITOR']],
  ['auditoria', AuditoriaPage, ['ADMINISTRADOR', 'AUDITOR']],
  ['usuarios', UsuariosPage, ['ADMINISTRADOR']],
  ['pasos', PasosPage, ['ADMINISTRADOR']],
  ['categorias', CategoriasPage, ['ADMINISTRADOR']],
]

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          {secciones.map(([path, Page, roles]) => (
            <Route key={path} path={`/${path}`} element={<ProtectedRoute roles={roles}><Layout><Page /></Layout></ProtectedRoute>} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
