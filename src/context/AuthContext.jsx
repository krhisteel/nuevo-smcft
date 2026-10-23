import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const AuthContext = createContext(null)

const CLAVES = ['token', 'rol', 'email', 'rut', 'nombre']

function leerSesion() {
  try {
    const token = localStorage.getItem('token')
    const rol = localStorage.getItem('rol')
    if (!token || !rol) return null
    return Object.fromEntries(CLAVES.map((k) => [k, localStorage.getItem(k)]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(leerSesion)
  const navigate = useNavigate()

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const sesion = { token: data.token, rol: data.rol, email: data.email, rut: data.rut, nombre: data.nombre }
      CLAVES.forEach((k) => localStorage.setItem(k, sesion[k] ?? ''))
      setUser(sesion)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Error al iniciar sesión'
      return { success: false, message }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // el token se descarta igual
    }
    CLAVES.forEach((k) => localStorage.removeItem(k))
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
