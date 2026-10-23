import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import Icon from './Icons'
import api from '../api/axios'
import { ROLES } from '../lib/roles'
import { menuItems } from '../lib/menu'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = menuItems[user?.rol] || menuItems.VIAJERO
  const notifCount = notifications.length

  // Bandeja personal: NOTIFICACION_DESTINATARIO de la persona conectada
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notificaciones/mias', { params: { noLeidas: 1 } })
        setNotifications(Array.isArray(data) ? data : [])
      } catch {
        // sin notificaciones
      }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notificaciones/mias/${id}/leida`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // se reintenta en la próxima actualización
    }
  }

  return (
    <div className="flex h-screen bg-[#0a1628]">
      <aside className={`fixed inset-y-0 left-0 z-30 w-60 transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>
        <div className="relative h-full bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <div>
                <h1 className="text-sm font-semibold text-white/80">SMCFT</h1>
                <p className="text-[9px] text-white/20">Control Fronterizo</p>
              </div>
            </div>
            <button className="lg:hidden text-white/30 hover:text-white/60 transition-colors" onClick={() => setSidebarOpen(false)}>
              <Icon name="Close" className="w-4 h-4" />
            </button>
          </div>

          <nav className="mt-2 px-2 space-y-0.5">
            {items.map((item) => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-[#4f8cff]/10 text-[#4f8cff] border border-[#4f8cff]/20 shadow-[0_0_20px_rgba(79,140,255,0.08)]'
                      : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon name={item.icon} className={`w-4 h-4 flex-shrink-0 ${active ? '' : 'opacity-60'}`} />
                  <span>{item.label}</span>
                  {active && <span className="ml-auto w-1 h-1 rounded-full bg-[#4f8cff] shadow-[0_0_6px_rgba(79,140,255,0.6)]" />}
                </button>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a1628]/40 to-transparent pointer-events-none" />
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-10 h-14 flex items-center justify-between px-4 lg:px-5 bg-white/[0.02] backdrop-blur-md border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <button className="lg:hidden text-white/30 hover:text-white/60 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                <Icon name="Bell" className="w-4 h-4 text-white/40" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500/80 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.5)]">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f1a2e]/95 backdrop-blur-xl rounded-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                  <div className="p-3 border-b border-white/[0.04]">
                    <p className="text-xs font-medium text-white/60">Notificaciones</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-white/20 text-xs">Sin notificaciones</div>
                  ) : (
                    <div className="max-h-72 overflow-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-2 p-3 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white/70 truncate">{n.titulo}</p>
                            <p className="text-[11px] text-white/40 truncate mt-0.5">{n.mensaje}</p>
                          </div>
                          <button onClick={() => markAsRead(n.id)} className="shrink-0 p-1 rounded hover:bg-white/[0.04] text-white/20 hover:text-[#34d399] transition-colors">
                            <Icon name="Check" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">{user?.nombre || user?.email}</p>
              <p className="text-[10px] text-white/20">{ROLES[user?.rol]?.label || user?.rol}</p>
            </div>
            <button
              onClick={logout}
              className="relative px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/30 transition-all duration-300 hover:bg-red-500/10 hover:border-red-400/15 hover:text-red-400/60"
            >
              <span className="flex items-center gap-1.5">
                <Icon name="Logout" className="w-3.5 h-3.5" />
                Salir
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-5 bg-gradient-to-b from-[#0f2040]/20 to-[#0a1628]">
          {children}
        </main>
      </div>
    </div>
  )
}
