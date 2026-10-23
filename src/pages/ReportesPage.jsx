import { useState, useEffect } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { LinkButton, Modal, MiniTable } from '../components/ui'
import { fmtFecha, fmtNumero, fmtUSD, hoyISO, mensajeError } from '../lib/format'

function DetalleReporte({ id, onClose }) {
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get(`/reportes/${id}`).then((res) => setR(res.data)).catch((err) => setError(mensajeError(err)))
  }, [id])

  // Agrupa los tres indicadores por paso fronterizo
  const filas = []
  for (const d of r?.detalle || []) {
    const paso = d.descripcion.replace(/^.* en /, '')
    let f = filas.find((x) => x.paso === paso)
    if (!f) filas.push(f = { id: paso, paso })
    f[d.categoria] = d.valor
  }

  return (
    <Modal title={r?.titulo || `Reporte #${id}`} onClose={onClose} wide>
      {!r ? <p className="text-white/20 text-xs">{error || 'Cargando...'}</p> : (
        <div className="space-y-4 text-xs">
          <p className="text-white/40">
            Período {fmtFecha(r.fechaInicio)} a {fmtFecha(r.fechaFin)} · generado por {r.generadoPor} · <StatusDot status={r.estado} />
          </p>
          <MiniTable rows={filas} columns={[
            { key: 'paso', label: 'Paso fronterizo' },
            { key: 'CRUCES_POR_PASO', label: 'Cruces', render: fmtNumero },
            { key: 'VIAJEROS_POR_PASO', label: 'Viajeros', render: fmtNumero },
            { key: 'VALOR_DECLARADO_POR_PASO', label: 'Valor declarado', render: fmtUSD },
          ]} />
        </div>
      )}
    </Modal>
  )
}

const inicioDeAnio = () => `${new Date().getFullYear()}-01-01`

export default function ReportesPage() {
  const [detalle, setDetalle] = useState(null)
  return (
    <>
      <CrudPage
        title="Reportes"
        subtitle="Generados con el procedimiento SP_REPORTE_CRUCES (cruces, viajeros y USD declarados por paso)"
        icon="Chart"
        endpoint="reportes"
        canCreate
        canDelete
        createLabel="Generar reporte"
        onRowClick={(r) => setDetalle(r.id)}
        rowActions={(row) => <LinkButton icon="Eye" onClick={() => setDetalle(row.id)}>Ver</LinkButton>}
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'titulo', label: 'Título' },
          { key: 'fechaInicio', label: 'Desde', render: fmtFecha },
          { key: 'fechaFin', label: 'Hasta', render: fmtFecha },
          { key: 'generadoPor', label: 'Generado por' },
          { key: 'detalles', label: 'Indicadores' },
          { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
        ]}
        formFields={[
          { key: 'desde', label: 'Desde', type: 'date', required: true },
          { key: 'hasta', label: 'Hasta', type: 'date', required: true },
        ]}
        emptyData={{ desde: inicioDeAnio(), hasta: hoyISO() }}
      />
      {detalle && <DetalleReporte id={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}

