import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import CrudPage from '../components/CrudPage'
import { StatusDot } from '../components/Icons'
import { Badge, Button, LinkButton, Modal } from '../components/ui'
import { fmtFechaHora, mensajeError } from '../lib/format'

const Compilacion = ({ v }) => <Badge color={v === 'VALID' ? '#10b981' : '#ef4444'}>{v === 'VALID' ? 'Compilado' : 'Con errores'}</Badge>

function EditorTrigger({ nombre, onClose, onGuardado }) {
  const [t, setT] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [compilando, setCompilando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/triggers/${nombre}`)
      setT(data)
      setCodigo(data.codigo)
    } catch (err) {
      setMensaje({ error: true, texto: mensajeError(err) })
    }
  }, [nombre])
  useEffect(() => { cargar() }, [cargar])

  const compilar = async () => {
    if (!confirm(`Se ejecutará CREATE OR REPLACE TRIGGER ${nombre} en Oracle. El cambio queda guardado en la base de datos. ¿Continuar?`)) return
    setCompilando(true)
    setMensaje(null)
    try {
      const { data } = await api.put(`/triggers/${nombre}`, { codigo })
      setT(data)
      setCodigo(data.codigo)
      setMensaje(data.compilado
        ? { texto: 'Trigger compilado y guardado en Oracle.' }
        : { error: true, texto: 'El trigger se guardó con errores de compilación (INVALID). Mientras tenga errores, las operaciones sobre su tabla fallarán: corríjalo y vuelva a compilar.' })
      onGuardado()
    } catch (err) {
      setMensaje({ error: true, texto: mensajeError(err) })
    }
    setCompilando(false)
  }

  const modificado = t && codigo !== t.codigo

  return (
    <Modal title={`Trigger ${nombre}`} onClose={onClose} wide>
      {!t ? <p className="text-white/20 text-xs">{mensaje?.texto || 'Cargando...'}</p> : (
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-white/40">
            <span>Tabla <span className="text-white/70">{t.tabla}</span></span>·
            <span>{t.tipo}</span>·<span>{t.evento}</span>·
            <StatusDot status={t.habilitado === 'ENABLED' ? 'ACTIVO' : 'INACTIVO'} />
            <Compilacion v={t.compilacion} />
            <span className="ml-auto">Última modificación: {fmtFechaHora(t.modificado)}</span>
          </div>

          <textarea
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            spellCheck={false}
            rows={22}
            className="w-full p-3 bg-black/30 border border-white/[0.06] rounded-xl font-mono text-[12px] leading-5 text-[#c9d6ff] outline-none focus:border-[#4f8cff]/30 resize-y"
          />

          {t.errores?.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1">
              <p className="text-red-400/90 font-medium">Errores de compilación (ALL_ERRORS)</p>
              {t.errores.map((e, i) => (
                <p key={i} className="font-mono text-[11px] text-red-300/80">Línea {e.linea}, col {e.posicion}: {e.mensaje.split('\n')[0]}</p>
              ))}
            </div>
          )}

          {mensaje && (
            <p className={`px-3 py-2 rounded-xl border ${mensaje.error ? 'text-red-400/80 border-red-500/10 bg-red-500/5' : 'text-[#34d399] border-[#10b981]/20 bg-[#10b981]/5'}`}>{mensaje.texto}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-white/25">El cambio se ejecuta y guarda directamente en Oracle; la página no guarda copias.</p>
            <div className="flex gap-2">
              <Button tone="ghost" icon="Refresh" disabled={!modificado || compilando} onClick={() => setCodigo(t.codigo)}>Descartar cambios</Button>
              <Button icon="Check" disabled={!modificado || compilando} onClick={compilar}>{compilando ? 'Compilando...' : 'Compilar en Oracle'}</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function TriggersPage() {
  const [editando, setEditando] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  return (
    <>
      <CrudPage
        title="Triggers"
        subtitle="Triggers del esquema SMCFT. Edite su código PL/SQL y compílelo: el cambio queda guardado en la base de datos."
        icon="Refresh"
        endpoint="triggers"
        reloadKey={reloadKey}
        onRowClick={(r) => setEditando(r.nombre)}
        rowActions={(row) => <LinkButton icon="Edit" onClick={() => setEditando(row.nombre)}>Editar código</LinkButton>}
        columns={[
          { key: 'nombre', label: 'Trigger', render: (v) => <span className="font-mono text-white/80">{v}</span> },
          { key: 'tabla', label: 'Tabla' },
          { key: 'tipo', label: 'Tipo', render: (v) => <Badge color={v.includes('ROW') ? '#818cf8' : '#06b6d4'}>{v.includes('ROW') ? 'Fila' : 'Sentencia'} · {v}</Badge> },
          { key: 'evento', label: 'Evento' },
          { key: 'condicion', label: 'Condición (WHEN)', render: (v) => v ? <span className="font-mono text-[11px]">{v}</span> : '—' },
          { key: 'habilitado', label: 'Estado', render: (v) => <StatusDot status={v === 'ENABLED' ? 'ACTIVO' : 'INACTIVO'} /> },
          { key: 'compilacion', label: 'Compilación', render: (v) => <Compilacion v={v} /> },
          { key: 'modificado', label: 'Modificado', render: fmtFechaHora },
        ]}
      />
      {editando && <EditorTrigger nombre={editando} onClose={() => setEditando(null)} onGuardado={() => setReloadKey((k) => k + 1)} />}
    </>
  )
}
