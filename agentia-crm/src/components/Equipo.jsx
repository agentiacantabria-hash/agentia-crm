import React from 'react'
import { STAGES_CLOSED } from './data'

function Stat({ label, value, warn }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--surface-2)', borderRadius: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: warn && value > 0 ? '#FF5A6A' : 'var(--text-0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function MemberCard({ member, maxLoad }) {
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
        <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>{pct}%</div>
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
  const { tasks, leads, proyectos, usuarios } = data
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const workload = usuarios.map(u => {
    const ini = u.iniciales
    const myTasks    = tasks.filter(t => t.resp === ini && !t.done)
    const overdue    = myTasks.filter(t => t.due_date && new Date(t.due_date + 'T00:00:00') < today)
    const myLeads    = leads.filter(l => l.responsable === ini && !STAGES_CLOSED.includes(l.estado))
    const myProyectos = proyectos.filter(p => p.resp === ini && p.estado !== 'Cerrado')
    const load       = myTasks.length + myLeads.length * 0.5 + myProyectos.length * 0.5 + overdue.length * 2
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
            <MemberCard key={w.iniciales} member={w} maxLoad={maxLoad} />
          ))}
        </div>
      )}
    </div>
  )
}
