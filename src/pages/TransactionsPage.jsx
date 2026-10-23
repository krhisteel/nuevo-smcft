import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'

const tipos = [
  { value: 'PAGO_MULTA', label: 'Pago Multa' },
  { value: 'PAGO_TASA', label: 'Pago Tasa' },
  { value: 'DEVOLUCION', label: 'Devolución' },
  { value: 'COBRO_SERVICIO', label: 'Cobro Servicio' },
]

const estados = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'ANULADO', label: 'Anulado' },
]

export default function TransactionsPage() {
  return (
    <CrudPage
      title="Transacciones"
      icon="Dollar"
      endpoint="transactions"
      columns={[
        { key: 'rutUsuario', label: 'RUT' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'montoTotal', label: 'Monto', render: (v) => `$${Number(v || 0).toLocaleString()}` },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'createdAt', label: 'Fecha', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'rutUsuario', label: 'RUT Usuario', placeholder: '12.345.678-9' },
        { key: 'tipo', label: 'Tipo', type: 'select', options: tipos },
        { key: 'montoTotal', label: 'Monto total', placeholder: '50000' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'estado', label: 'Estado', type: 'select', options: estados },
      ]}
      emptyData={{ rutUsuario: '', tipo: 'PAGO_MULTA', montoTotal: '', descripcion: '', estado: 'PENDIENTE' }}
    />
  )
}
