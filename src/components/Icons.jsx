const p = "currentColor"

const s = {
  Dashboard: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/><path d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6"/>',
  Users: '<path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
  Car: '<path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path d="M5 17h14M3 11l2-4h14l2 4M3 11h18M3 11v4h18v-4"/>',
  Clipboard: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h6"/>',
  Entry: '<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3"/>',
  Exit: '<path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 17l5-5-5-5M21 12H9"/>',
  Dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
  Shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  Chart: '<path d="M3 13h8V3M3 21h18V3M3 21l8-8"/>',
  Flask: '<path d="M9 3h6v4l4 10a3 3 0 01-3 3H8a3 3 0 01-3-3l4-10V3z"/><path d="M7 13h10"/>',
  Bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  Home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
  Login: '<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  Logout: '<path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M16 17l5-5-5-5M21 12H9"/>',
  Search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  Plus: '<path d="M12 5v14M5 12h14"/>',
  Edit: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  Trash: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M10 11v6M14 11v6"/>',
  Close: '<path d="M18 6L6 18M6 6l12 12"/>',
  Menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  ArrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  ArrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  Check: '<path d="M20 6L9 17l-5-5"/>',
  X: '<path d="M18 6L6 18M6 6l12 12"/>',
  Alert: '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4M12 16h.01"/>',
  Truck: '<path d="M1 15h3M16 15h3"/><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M5 17h14M3 11l2-4h14l2 4M3 11h18M8 5V3m8 2V3"/>',
  Globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
  FileText: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  Download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  Refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  Eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  Building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  Mail: '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  Lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  Flag: '<path d="M4 21V3h14l-2 5 2 5H4"/><path d="M18 13H4"/>',
}

export default function Icon({ name, className = "" }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke={p} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: s[name] || s.Home }} />
}

const dotColors = {
  PENDIENTE: "#f59e0b",
  EN_PROCESO: "#f59e0b",
  GENERANDO: "#f59e0b",
  AUTORIZADO: "#10b981",
  COMPLETADO: "#10b981",
  APROBADO: "#10b981",
  ENVIADA: "#10b981",
  RECHAZADO: "#ef4444",
  ERROR: "#ef4444",
  OBSERVADO: "#ef4444",
  ANULADO: "#6b7280",
  ACTIVO: "#10b981",
  INACTIVO: "#6b7280",
}

const dotLabels = {
  AUTORIZADO: "Autorizado",
  RECHAZADO: "Rechazado",
  PENDIENTE: "Pendiente",
  COMPLETADO: "Completado",
  ANULADO: "Anulado",
  EN_PROCESO: "En proceso",
  GENERANDO: "Generando",
  ERROR: "Error",
  OBSERVADO: "Observado",
  APROBADO: "Aprobado",
  ENVIADA: "Enviada",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
}

export function StatusDot({ status, className = "" }) {
  const color = dotColors[status] || "#6b7280"
  const label = dotLabels[status] || status
  const isPendiente = status === "PENDIENTE" || status === "EN_PROCESO" || status === "GENERANDO"
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex w-2 h-2">
        <span className={`absolute inset-0 rounded-full`} style={{ backgroundColor: color }} />
        {isPendiente && <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: color }} />}
      </span>
      <span className="text-[11px] text-white/50">{label}</span>
    </span>
  )
}

export function CheckIcon({ active = true }) {
  return active ? (
    <svg className="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
