import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icons'
import { Card, Stat } from '../components/ui'
import { menuItems } from '../lib/menu'
import { ROLES } from '../lib/roles'
import { fmtNumero, fmtUSD } from '../lib/format'

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const viajero = user?.rol === 'VIAJERO'

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(r.data)).catch((err) => setError(err.response?.data?.message || 'No se pudo conectar con la base de datos'))
  }, [])

  const rol = ROLES[user?.rol] || ROLES.VIAJERO
  const accesos = (menuItems[user?.rol] || []).filter((m) => m.path !== '/dashboard').slice(0, 8)
  const maxPaso = Math.max(1, ...(stats?.porPaso || []).map((p) => p.cruces))

  const cards = viajero
    ? [
        { label: 'Mis vehículos', value: stats?.vehiculos, icon: 'Car' },
        { label: 'Mis cruces', value: stats?.cruces, icon: 'Exit' },
        { label: 'Plazos activos', value: stats?.plazosActivos, icon: 'Alert' },
        { label: 'Notificaciones sin leer', value: stats?.notificaciones, icon: 'Bell' },
      ]
    : [
        { label: 'Cruces registrados', value: stats && fmtNumero(stats.cruces), icon: 'Exit', hint: stats && `${stats.crucesSemana} en los últimos 7 días` },
        { label: 'Plazos activos', value: stats?.plazosActivos, icon: 'Car' },
        { label: 'Plazos vencidos', value: stats?.plazosVencidos, icon: 'Alert', hint: 'FN_TOTAL_PLAZOS_VENCIDOS()' },
        { label: 'Valor declarado', value: stats && fmtUSD(stats.valorDeclarado), icon: 'Dollar' },
      ]

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/5 via-white/[0.03] to-[#4f8cff]/5 rounded-2xl blur-lg" />
        <Card className="backdrop-blur-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white/90">{saludo()}, {user?.nombre?.split(' ')[0] || 'Usuario'}</h1>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                style={{ color: rol.color, borderColor: `${rol.color}33`, backgroundColor: `${rol.color}1a` }}>
                {rol.label}
              </span>
            </div>
            <div className="hidden md:block text-5xl opacity-[0.25] select-none font-serif text-white/80">SMCFT</div>
          </div>
        </Card>
      </div>

      {error && <Card className="p-4 text-xs text-red-400/80">{error}</Card>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={c.label} className="animate-fadeInUp" style={{ animationDelay: `${i * 70}ms` }}>
            <Stat {...c} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {!viajero && stats?.porPaso && (
          <Card className="p-5">
            <h2 className="text-sm font-medium text-white/50 mb-4">Cruces por paso fronterizo</h2>
            <div className="space-y-3">
              {stats.porPaso.map((p) => (
                <div key={p.paso}>
                  <div className="flex justify-between text-[11px] text-white/40 mb-1">
                    <span>{p.paso}</span>
                    <span>{p.cruces} ({p.salidas} salidas · {p.entradas} entradas)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden flex">
                    <div className="h-full bg-[#f59e0b]/60" style={{ width: `${(p.salidas / maxPaso) * 100}%` }} />
                    <div className="h-full bg-[#10b981]/60" style={{ width: `${(p.entradas / maxPaso) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]/60" />Salidas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]/60" />Entradas</span>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-sm font-medium text-white/50 mb-3">Acceso rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {accesos.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] hover:border-[#4f8cff]/15 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Icon name={item.icon} className="w-5 h-5 text-white/30" />
                <span className="text-[11px] text-white/40 text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
