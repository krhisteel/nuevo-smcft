import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchUserRut = async (token, email) => {
    try {
      const res = await api.get(`/users/email/${email}`)
      return res.data?.rut || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const rol = localStorage.getItem('rol')
    const email = localStorage.getItem('email')
    const rut = localStorage.getItem('rut')
    if (token && rol) {
      setUser({ token, rol, email, rut })
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, rol } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('rol', rol)
      localStorage.setItem('email', email)
      const rut = await fetchUserRut(token, email)
      if (rut) localStorage.setItem('rut', rut)
      setUser({ token, rol, email, rut })
      return { success: true }
    } catch (error) {
      const message =
        error.response?.data?.mensaje ||
        error.response?.data?.message ||
        'Error al iniciar sesión'
      return { success: false, message }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    localStorage.removeItem('email')
    localStorage.removeItem('rut')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
