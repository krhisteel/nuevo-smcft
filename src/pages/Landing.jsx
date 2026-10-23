import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icons'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 animate-[slowZoom_20s_ease-in-out_infinite]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=2070&auto=format&fit=crop')` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/90 via-[#0a1628]/80 to-[#0a1628]/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,140,255,0.06)_0%,_transparent_60%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4f8cff]/30 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="animate-fadeInDown">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#4f8cff]/10 blur-2xl rounded-full" />
              <Logo size={80} className="relative" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-[#4f8cff] to-[#06b6d4] bg-clip-text text-transparent">
              SMCFT
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 mb-2 font-light">
            Sistema de Modernización y Control Fronterizo Terrestre
          </p>
          <p className="text-base text-white/30 mb-12 max-w-xl mx-auto leading-relaxed">
            Fiscalización y facilitación del comercio exterior para contribuir al desarrollo económico y competitividad del país.
          </p>
        </div>

        <div className="animate-fadeInUp">
          <button
            onClick={() => navigate('/login')}
            className="group relative px-10 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-white text-lg font-medium overflow-hidden transition-all duration-500 hover:bg-white/[0.08] hover:border-[#4f8cff]/30 hover:shadow-[0_0_60px_rgba(79,140,255,0.15)]"
          >
            <span className="relative z-10 flex items-center gap-3">
              Ingresar al Sistema
              <Icon name="ArrowRight" className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4f8cff]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        </div>

        <div className="absolute bottom-10 left-0 right-0 animate-fadeIn">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-white/25 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#4f8cff] shadow-[0_0_6px_rgba(79,140,255,0.6)]" />
              Control Aduanero
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#4f8cff] shadow-[0_0_6px_rgba(79,140,255,0.6)]" />
              Gestión Vehicular
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#4f8cff] shadow-[0_0_6px_rgba(79,140,255,0.6)]" />
              Reportes Inteligentes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#4f8cff] shadow-[0_0_6px_rgba(79,140,255,0.6)]" />
              Integración SAG-PDI
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a1628] to-transparent" />
    </div>
  )
}
