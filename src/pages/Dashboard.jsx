import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Icon from '../components/Icons'
import { notificationRecipientService } from '../api/services'

const roleBadge = {
  ADMINISTRADOR: { label: 'Administrador', class: 'bg-[#4f8cff]/10 text-[#4f8cff] border-[#4f8cff]/20 shadow-[0_0_10px_rgba(79,140,255,0.1)]' },
  FISCALIZADOR: { label: 'Fiscalizador', class: 'bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20 shadow-[0_0_10px_rgba(129,140,248,0.1)]' },
  VIAJERO: { label: 'Viajero', class: 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]' },
}

const cardIcons = {
  entries: 'Entry',
  crossings: 'Exit',
  vehicles: 'Car',
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Buenos días')
    else if (h < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      const [e, c, v] = await Promise.allSettled([
        api.get('/entries/estadisticas/estado/PENDIENTE'),
        api.get('/border-crossings/estadisticas/estado/PENDIENTE'),
        api.get('/vehicles'),
      ])
      setStats({
        entriesPending: e.status === 'fulfilled' ? (e.value.data.total ?? e.value.data) : 0,
        crossingsPending: c.status === 'fulfilled' ? (c.value.data.total ?? c.value.data) : 0,
        vehicles: v.status === 'fulfilled' ? v.value.data.length : 0,
      })
    }
    fetchStats()
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user?.rut) return
    try {
      const data = await notificationRecipientService.getUnreadByRut(user.rut)
      setNotifications(Array.isArray(data) ? data : [])
    } catch { setNotifications([]) }
  }, [user?.rut])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markAsRead = async (id) => {
    try {
      await notificationRecipientService.markAsRead(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  const cards = [
    { label: 'Ingresos Pendientes', value: stats?.entriesPending, key: 'entries' },
    { label: 'Cruces Pendientes', value: stats?.crossingsPending, key: 'crossings' },
    { label: 'Vehículos Registrados', value: stats?.vehicles, key: 'vehicles' },
  ]

  const shortcuts = [
    { icon: 'Car', label: 'Vehículos', path: '/vehiculos' },
    { icon: 'Entry', label: 'Ingresos', path: '/ingresos' },
    { icon: 'Exit', label: 'Cruces', path: '/cruces' },
    { icon: 'Dollar', label: 'Pagos', path: '/transacciones' },
  ]

  const badge = roleBadge[user?.rol] || roleBadge.VIAJERO

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/5 via-white/[0.03] to-[#4f8cff]/5 rounded-2xl blur-lg" />
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white/90">
                {greeting}, {user?.email?.split('@')[0] || 'Usuario'}
              </h1>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.class}`}>
                {badge.label}
              </span>
            </div>
            <div className="hidden md:block text-5xl opacity-[0.25] select-none font-serif text-white/80">SMCFT</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <div key={i} className="group relative animate-fadeInUp" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/[0.03] to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/35 text-xs">{card.label}</p>
                  <p className="text-2xl font-semibold text-white/80 mt-1">
                    {card.value !== undefined && card.value !== null ? card.value : (
                      <span className="inline-block w-6 h-6 bg-white/[0.04] rounded animate-pulse" />
                    )}
                  </p>
                </div>
                <Icon name={cardIcons[card.key]} className="w-5 h-5 text-[#4f8cff]/20 group-hover:text-[#4f8cff]/30 transition-colors duration-300" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative animate-fadeInUp" style={{ animationDelay: '250ms' }}>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4f8cff]/5 to-white/[0.02] rounded-2xl blur" />
        <div className="relative bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] p-5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <h2 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
            <span className="w-0.5 h-4 bg-[#4f8cff]/40 rounded-full inline-block shadow-[0_0_6px_rgba(79,140,255,0.2)]" />
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {shortcuts.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] hover:border-[#4f8cff]/15 hover:shadow-[0_0_20px_rgba(79,140,255,0.05)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <Icon name={item.icon} className="w-5 h-5 text-white/30 group-hover:text-[#4f8cff]/60 transition-colors" />
                <span className="text-xs text-white/40">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="relative animate-fadeInUp" style={{ animationDelay: '350ms' }}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f59e0b]/5 to-white/[0.02] rounded-2xl blur" />
          <div className="relative bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] p-5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <h2 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
              <Icon name="Bell" className="w-4 h-4 text-[#f59e0b]/60" />
              Notificaciones
              <span className="text-[10px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded-full">{notifications.length}</span>
            </h2>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/70">{n.notification?.titulo || n.titulo}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#4f8cff]/10 text-[#4f8cff]/70">{n.notification?.tipo || n.tipo}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{n.notification?.mensaje || n.mensaje}</p>
                    <p className="text-[10px] text-white/20 mt-1">{n.notification?.createdAt ? new Date(n.notification.createdAt).toLocaleDateString() : ''}</p>
                  </div>
                  <button onClick={() => markAsRead(n.id)} className="shrink-0 p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-[#34d399] hover:bg-[#34d399]/10 hover:border-[#34d399]/20 transition-all" title="Marcar como leída">
                    <Icon name="Check" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
