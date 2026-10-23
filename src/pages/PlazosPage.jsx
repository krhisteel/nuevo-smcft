import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { Badge, Button, LinkButton, Stat } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { puede, STAFF } from '../lib/roles'
import { fmtFecha, mensajeError } from '../lib/format'

function Dias({ v, estado }) {
  if (estado === 'CERRADO') return <span className="text-white/25">—</span>
  const color = v < 0 ? '#ef4444' : v <= 7 ? '#f59e0b' : '#10b981'
  return <Badge color={color}>{v < 0 ? `Vencido hace ${-v} días` : `${v} días`}</Badge>
}

export default function PlazosPage() {
  const { user } = useAuth()
  const editor = puede(user, 'ADMINISTRADOR', 'FISCALIZADOR')
  const staff = puede(user, ...STAFF)
  const [resumen, setResumen] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const cargarResumen = useCallback(() => {
    if (staff) api.get('/plazos/resumen').then((r) => setResumen(r.data)).catch(() => {})
  }, [staff])
  useEffect(() => { cargarResumen() }, [cargarResumen, reloadKey])

  const ejecutar = async (url, mensaje) => {
    try {
      const { data } = await api.post(url)
      alert(mensaje(data))
      setReloadKey((k) => k + 1)
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  const cerrar = async (row, reload) => {
    if (!confirm(`¿Cerrar el plazo del vehículo ${row.patente}? (el vehículo regresó al país)`)) return
    try {
      await api.patch(`/plazos/${row.id}/cerrar`, {})
      reload()
      cargarResumen()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  return (
    <div className="space-y-4">
      {staff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Activos" value={resumen?.activos} icon="Car" />
          <Stat label="Por vencer (≤ 7 días)" value={resumen?.porVencer} icon="Alert" />
          <Stat label="Vencidos (FN_TOTAL_PLAZOS_VENCIDOS)" value={resumen?.vencidosPorFecha} icon="Alert" hint="No cerrados con fecha límite pasada" />
          <Stat label="Cerrados" value={resumen?.cerrados} icon="Check" />
        </div>
      )}
      <CrudPage
        title={user?.rol === 'VIAJERO' ? 'Mis plazos de admisión' : 'Plazos de admisión temporal'}
        subtitle="Creados por el trigger TRG_CRUCE_PLAZO_AI: 90 días para diplomáticos, 180 para el resto"
        icon="Alert"
        endpoint="plazos"
        reloadKey={reloadKey}
        headerActions={() => editor && (
          <>
            <Button tone="ghost" icon="Refresh" onClick={() => ejecutar('/plazos/actualizar-vencidos', (d) => `SP_ACTUALIZAR_PLAZOS ejecutado: ${d.actualizados} plazo(s) marcados como VENCIDO.`)}>
              Actualizar vencidos
            </Button>
            <Button tone="ghost" icon="Bell" onClick={() => ejecutar('/plazos/generar-alertas', (d) => `${d.generadas} alerta(s) y notificación(es) generadas para ${d.revisados} plazo(s) revisados.`)}>
              Generar alertas
            </Button>
          </>
        )}
        columns={[
          { key: 'patente', label: 'Vehículo', render: (v, r) => <span><span className="font-mono">{v}</span> <span className="text-white/25">{r.tipoVehiculo}</span></span> },
          { key: 'propietario', label: 'Propietario' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'fechaIngreso', label: 'Salida', render: fmtFecha },
          { key: 'fechaLimite', label: 'Fecha límite', render: fmtFecha },
          { key: 'diasRestantes', label: 'Días restantes', render: (v, r) => <Dias v={v} estado={r.estado} /> },
          { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        ]}
        rowActions={editor ? (row, reload) => row.estado !== 'CERRADO' && (
          <LinkButton icon="Check" tone="success" onClick={() => cerrar(row, reload)}>Cerrar</LinkButton>
        ) : undefined}
      />
    </div>
  )
}
