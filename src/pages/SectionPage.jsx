import { useParams } from 'react-router-dom'
import Icon from '../components/Icons'

const sectionMeta = {
  usuarios: { icon: 'Users', title: 'Usuarios', desc: 'Gestión de usuarios del sistema' },
  vehiculos: { icon: 'Car', title: 'Vehículos', desc: 'Registro y control vehicular' },
  ingresos: { icon: 'Entry', title: 'Ingresos', desc: 'Registro de ingresos al país' },
  cruces: { icon: 'Exit', title: 'Cruces Fronterizos', desc: 'Control de salidas del país' },
  transacciones: { icon: 'Dollar', title: 'Transacciones', desc: 'Pagos y multas' },
  auditoria: { icon: 'Clipboard', title: 'Auditoría', desc: 'Registro de actividades' },
  reportes: { icon: 'Chart', title: 'Reportes', desc: 'Informes y estadísticas' },
  sanidad: { icon: 'Flask', title: 'Sanidad', desc: 'Inspecciones del SAG' },
  notificaciones: { icon: 'Bell', title: 'Notificaciones', desc: 'Alertas y comunicaciones' },
}

export default function SectionPage() {
  const { section } = useParams()
  const meta = sectionMeta[section] || { icon: 'FileText', title: 'Sección', desc: 'En construcción' }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#4f8cff]/10 via-white/5 to-[#4f8cff]/10 rounded-2xl blur-lg" />
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="flex items-center gap-4">
            <Icon name={meta.icon} className="w-8 h-8 text-[#4f8cff]/60" />
            <div>
              <h1 className="text-2xl font-bold text-white">{meta.title}</h1>
              <p className="text-[#4f8cff]/60 text-sm mt-1">{meta.desc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-12">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#4f8cff]/5 border border-[#4f8cff]/10 flex items-center justify-center mb-4">
              <Icon name="FileText" className="w-8 h-8 text-[#4f8cff]/30" />
            </div>
            <h2 className="text-lg font-medium text-white/40 mb-2">Módulo en desarrollo</h2>
            <p className="text-sm text-white/20 max-w-md">
              Esta sección estará disponible próximamente. Selecciona otra opción del menú.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
