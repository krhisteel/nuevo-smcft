import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { recargarCatalogos } from '../lib/useCatalogos'

const estados = [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]

export default function PasosPage() {
  return (
    <CrudPage
      title="Pasos fronterizos"
      subtitle="Solo los pasos activos se incluyen en el reporte SP_REPORTE_CRUCES"
      icon="Flag"
      endpoint="pasos"
      canCreate
      canEdit
      canDelete
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'region', label: 'Región' },
        { key: 'pais', label: 'País' },
        { key: 'cruces', label: 'Cruces' },
        { key: 'estado', label: 'Estado', render: (v) => <StatusDot status={v} /> },
      ]}
      formFields={[
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'region', label: 'Región', required: true },
        { key: 'pais', label: 'País', required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: estados, required: true },
      ]}
      emptyData={{ nombre: '', region: '', pais: 'Chile', estado: 'ACTIVO' }}
      transformSubmit={(f) => { recargarCatalogos(); return f }}
    />
  )
}
