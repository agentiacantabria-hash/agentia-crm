import React, { useState } from 'react'
import { STAGES_CLOSED } from './data'

function Stat({ label, value, warn }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--surface-2)', borderRadius: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: warn && value > 0 ? '#FF5A6A' : 'var(--text-0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function ReasignarModal({ member, allMembers, onClose, onConfirm }) {
  const otros = allMembers.filter(u => u.iniciales !== member.iniciales)
  const [destino,    setDestino]    = useState(otros[0]?.iniciales || '')
  const [chkLeads,   setChkLeads]   = useState(member.myLeads.length > 0)
  const [chkTareas,  setChkTareas]  = useState(member.myTasks.length > 0)
  const [chkProy,    setChkProy]    = useState(member.myProyectos.length > 0)
  const [loading,    setLoading]    = useState(false)

  const total = (chkLeads ? member.myLeads.length : 0)
              + (chkTareas ? member.myTasks.length : 0)
              + (chkProy ? member.myProyectos.length : 0)

  const handleConfirm = async () => {
    if (!destino || total === 0) return
    setLoading(true)
    await onConfirm({ de: member.iniciales, a: destino, incluirLeads: chkLeads, incluirTareas: chkTareas, incluirProyectos: chkProy })
    onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 420, background: 'var(--surface-1)', border: '1px solid var(--line-2)',
        borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.7)', zIndex: 901, padding: 28,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Reasignación masiva</div>
        <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 22 }}>
          Transferir trabajo de <strong style={{ color: 'var(--text-1)' }}>{member.nombre || member.iniciales}</strong> a otro miembro
        </div>

        {/* Destino */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Reasignar a</div>
          <select className="select" value={destino} onChange={e => setDestino(e.target.value)} style={{ width: '100%' }}>
            {otros.map(u => <option key={u.iniciales} value={u.iniciales}>{u.nombre || u.iniciales} ({u.iniciales})</option>)}
          </select>
        </div>

        {/* Qué reasignar */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10 }}>Qué incluir</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[
            { key: 'leads',   label: 'Leads activos',      count: member.myLeads.length,    checked: chkLeads,   set: setChkLeads },
            { key: 'tareas',  label: 'Tareas pendientes',  count: member.myTasks.length,    checked: chkTareas,  set: setChkTareas },
            { key: 'proy',    label: 'Proyectos activos',  count: member.myProyectos.length, checked: chkProy,   set: setChkProy },
          ].map(({ key, label, count, checked, set }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: count === 0 ? 'not-allowed' : 'pointer', opacity: count === 0 ? 0.4 : 1 }}>
              <input type="checkbox" checked={checked} disabled={count === 0} onChange={e => set(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--brand-2)', cursor: 'inherit' }} />
              <span style={{ fontSize: 13, color: 'var(--text-1)', flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 600 }}>{count}</span>
            </label>
          ))}
        </div>

        {/* Preview */}
        {total > 0 && destino && (
          <div style={{ padding: '10px 14px', background: 'rgba(var(--brand-rgb,99,102,241),0.06)', border: '1px solid var(--line-2)', borderRadius: 8, marginBottom: 20, fontSize: 12.5, color: 'var(--text-2)' }}>
            Se moverán <strong>{total}</strong> elemento{total > 1 ? 's' : ''} de <strong>{member.iniciales}</strong> → <strong>{destino}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleConfirm} disabled={loading || total === 0 || !destino}
            style={{ opacity: (loading || total === 0 || !destino) ? 0.5 : 1 }}>
            {loading ? 'Reasignando…' : `Confirmar (${total})`}
          </button>
        </div>
      </div>
    </>
  )
}

function MemberCard({ member, maxLoad, onReasignar }) {
  const { iniciales, nombre, myTasks, overdue, myLeads, myProyectos, load } = member
  const pct = maxLoad > 0 ? Math.round((load / maxLoad) * 100) : 0
  const barColor = pct > 70 ? '#FF5A6A' : pct > 40 ? '#FFB547' : 'var(--ok)'

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--brand-deep)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--brand-3)',
          flexShrink: 0,
        }}>
          {iniciales}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)' }}>{nombre || iniciales}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1 }}>{iniciales}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>{pct}%</span>
          <button className="btn ghost sm" onClick={() => onReasignar(member)}
            style={{ fontSize: 11, padding: '3px 9px', height: 'auto', color: 'var(--text-3)' }}>
            Reasignar
          </button>
        </div>
      </div>

      {/* Barra de carga */}
      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        <Stat label="Tareas" value={myTasks.length} />
        <Stat label="Vencidas" value={overdue.length} warn />
        <Stat label="Leads" value={myLeads.length} />
        <Stat label="Proyectos" value={myProyectos.length} />
      </div>

      {/* Lista tareas vencidas */}
      {overdue.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#FF5A6A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Tareas vencidas
          </div>
          {overdue.slice(0, 3).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--line-1)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF5A6A', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              {t.due_date && (
                <span style={{ fontSize: 11, color: '#FF5A6A', flexShrink: 0 }}>
                  {new Date(t.due_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ))}
          {overdue.length > 3 && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>+{overdue.length - 3} más</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Equipo({ data }) {
  const { tasks, leads, proyectos, usuarios, reasignarMasivo } = data
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [reasignando, setReasignando] = useState(null)

  const workload = usuarios.map(u => {
    const ini = u.iniciales
    const myTasks     = tasks.filter(t => t.resp === ini && !t.done)
    const overdue     = myTasks.filter(t => t.due_date && new Date(t.due_date + 'T00:00:00') < today)
    const myLeads     = leads.filter(l => l.responsable === ini && !STAGES_CLOSED.includes(l.estado))
    const myProyectos = proyectos.filter(p => p.resp === ini && p.estado !== 'Cerrado')
    const load        = myTasks.length + myLeads.length * 0.5 + myProyectos.length * 0.5 + overdue.length * 2
    return { ...u, myTasks, overdue, myLeads, myProyectos, load }
  }).sort((a, b) => b.load - a.load)

  const maxLoad = Math.max(...workload.map(w => w.load), 1)

  const totalTasks   = workload.reduce((s, w) => s + w.myTasks.length, 0)
  const totalOverdue = workload.reduce((s, w) => s + w.overdue.length, 0)
  const totalLeads   = workload.reduce((s, w) => s + w.myLeads.length, 0)

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-0)', marginBottom: 4 }}>Carga de trabajo</h2>
        <p style={{ fontSize: 13, color: 'var(--text-4)' }}>{workload.length} miembros activos</p>
      </div>

      {/* Resumen global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28, maxWidth: 480 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-0)' }}>{totalTasks}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>Tareas activas</div>
        </div>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: totalOverdue > 0 ? '#FF5A6A' : 'var(--text-0)' }}>{totalOverdue}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>Vencidas</div>
        </div>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-0)' }}>{totalLeads}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>Leads activos</div>
        </div>
      </div>

      {/* Cards de empleados */}
      {workload.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 13, padding: '60px 0' }}>
          No hay miembros activos en el equipo
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {workload.map(w => (
            <MemberCard key={w.iniciales} member={w} maxLoad={maxLoad} onReasignar={setReasignando} />
          ))}
        </div>
      )}

      {reasignando && (
        <ReasignarModal
          member={reasignando}
          allMembers={workload}
          onClose={() => setReasignando(null)}
          onConfirm={reasignarMasivo}
        />
      )}
    </div>
  )
}
