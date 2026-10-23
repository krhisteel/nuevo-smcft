// Listas para selectores (pasos, categorías, funcionarios, roles), cargadas una vez.
import { useEffect, useState } from 'react'
import api from '../api/axios'

let cache = null

export default function useCatalogos() {
  const [data, setData] = useState(cache || { pasos: [], categorias: [], funcionarios: [], roles: [] })
  useEffect(() => {
    if (cache) return
    api.get('/catalogos').then((r) => { cache = r.data; setData(r.data) }).catch(() => {})
  }, [])
  return data
}

export const recargarCatalogos = () => { cache = null }
