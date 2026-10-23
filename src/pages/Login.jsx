import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import Icon from '../components/Icons'

const testUsers = [
  { label: 'Administrador', email: 'admin@aduana.cl', pass: 'admin123', hue: '#4f8cff' },
  { label: 'Fiscalizador', email: 'fiscal@aduana.cl', pass: 'fiscal123', hue: '#818cf8' },
  { label: 'Viajero', email: 'viajero@aduana.cl', pass: 'viajero123', hue: '#34d399' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeField, setActiveField] = useState(null)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    if (!result.success) setError(result.message)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=2070&auto=format&fit=crop')` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#0a1628]/90 to-[#0a1628]/98" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(79,140,255,0.04)_0%,_transparent_50%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4f8cff]/20 to-transparent" />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-sm animate-fadeInUp">
          <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-white/30 hover:text-[#4f8cff] transition-colors group text-sm">
            <Icon name="ArrowLeft" className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver
          </button>

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/10 via-white/5 to-[#4f8cff]/10 rounded-2xl blur-xl" />
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              <div className="p-8 pb-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#4f8cff]/10 blur-xl rounded-full" />
                    <Logo size={52} className="relative" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Acceso al Sistema</h2>
                <p className="text-xs text-white/30">SMCFT - Control Fronterizo</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
                {error && (
                  <div className="relative px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/80 text-xs text-center animate-shake">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Correo Electrónico</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${activeField === 'email' ? 'ring-1 ring-[#4f8cff]/30 shadow-[0_0_20px_rgba(79,140,255,0.06)]' : ''}`}>
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                      <Icon name="Mail" className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField(null)}
                      placeholder="usuario@aduana.cl"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/80 placeholder-white/15 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Contraseña</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${activeField === 'pass' ? 'ring-1 ring-[#4f8cff]/30 shadow-[0_0_20px_rgba(79,140,255,0.06)]' : ''}`}>
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                      <Icon name="Lock" className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setActiveField('pass')}
                      onBlur={() => setActiveField(null)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/80 placeholder-white/15 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-2.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#3a6fd8] text-white text-sm font-medium overflow-hidden transition-all duration-300 hover:from-[#5d9aff] hover:to-[#4f8cff] hover:shadow-[0_0_30px_rgba(79,140,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Ingresando...
                      </>
                    ) : (
                      <>
                        Iniciar Sesión
                        <Icon name="ArrowRight" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <div className="px-8 pb-8">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.04]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-[10px] text-white/20 bg-[#0a1628]/80 rounded-full py-0.5">Acceso rápido</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {testUsers.map((u) => (
                    <button
                      key={u.label}
                      type="button"
                      onClick={() => { setEmail(u.email); setPassword(u.pass); setError('') }}
                      className="relative px-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-[11px] font-medium transition-all duration-300 hover:bg-white/[0.06] hover:border-[#4f8cff]/20 hover:text-white/70 hover:shadow-[0_0_20px_rgba(79,140,255,0.05)]"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: u.hue, boxShadow: `0 0 6px ${u.hue}40` }} />
                        {u.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
