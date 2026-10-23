import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
          <span className="text-xs text-white/20">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />

  return children
}
