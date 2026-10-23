import CrudPage from '../components/CrudPage'
import { CheckIcon } from '../components/Icons'
import { recargarCatalogos } from '../lib/useCatalogos'
import { fmtUSD } from '../lib/format'

export default function CategoriasPage() {
  return (
    <CrudPage
      title="Categorías de ítems"
      subtitle="Catálogo arancelario (tabla CATEGORIA_ITEM)"
      icon="Building"
      endpoint="categorias"
      canCreate
      canEdit
      canDelete
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'limiteValorUsd', label: 'Límite', render: (v) => (v === null ? '—' : fmtUSD(v)) },
        { key: 'requiereDeclaracion', label: 'Requiere declaración', render: (v) => <CheckIcon active={v} /> },
        { key: 'activo', label: 'Activa', render: (v) => <CheckIcon active={v} /> },
      ]}
      formFields={[
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'limiteValorUsd', label: 'Límite USD', type: 'number', step: '0.01', min: 0 },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true, full: true },
        { key: 'requiereDeclaracion', label: 'Declaración', type: 'checkbox', checkLabel: 'Requiere declaración' },
        { key: 'activo', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
      ]}
      emptyData={{ nombre: '', descripcion: '', limiteValorUsd: '', requiereDeclaracion: false, activo: true }}
      transformRow={(r) => ({ ...r, limiteValorUsd: r.limiteValorUsd ?? '' })}
      transformSubmit={(f) => { recargarCatalogos(); return f }}
    />
  )
}
