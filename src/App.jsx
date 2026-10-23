import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import VehiclesPage from './pages/VehiclesPage'
import EntriesPage from './pages/EntriesPage'
import CrossingsPage from './pages/CrossingsPage'
import TransactionsPage from './pages/TransactionsPage'
import AuditsPage from './pages/AuditsPage'
import ReportsPage from './pages/ReportsPage'
import SanitaryPage from './pages/SanitaryPage'
import NotificationsPage from './pages/NotificationsPage'

const sectionRoutes = [
  { path: 'usuarios', element: <UsersPage /> },
  { path: 'vehiculos', element: <VehiclesPage /> },
  { path: 'ingresos', element: <EntriesPage /> },
  { path: 'cruces', element: <CrossingsPage /> },
  { path: 'transacciones', element: <TransactionsPage /> },
  { path: 'auditoria', element: <AuditsPage /> },
  { path: 'reportes', element: <ReportsPage /> },
  { path: 'sanidad', element: <SanitaryPage /> },
  { path: 'notificaciones', element: <NotificationsPage /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          {sectionRoutes.map(({ path, element }) => (
            <Route key={path} path={`/${path}`} element={<ProtectedRoute><Layout>{element}</Layout></ProtectedRoute>} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
