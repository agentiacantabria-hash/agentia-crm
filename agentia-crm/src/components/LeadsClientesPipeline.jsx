import React from 'react'
import { I } from './Icons'
import { STATE_COLORS, PIPELINE_COLS, eur } from './data'

export function Leads({ data, openQuick }) {
  const [filter, setFilter] = React.useState('todos')
  const leads = data?.leads || []
  const filtered = filter === 'todos' ? leads : leads.filter(l => l.temp === filter)

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Oportunidades aún no cerradas · {leads.length} totales · €{eur(leads.reduce((a,l)=>a+(l.monto||0),0))} en juego</p>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {[['todos','Todos'],['hot','Calientes'],['warm','Tibios'],['cold','Fríos']].map(([k,v])=>(
              <button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{v}</button>
            ))}
          </div>
          <button className="btn"><I.Filter size={13}/> Filtros</button>
          <button className="btn primary" onClick={openQuick}><I.Plus size={13}/> Lead rápido</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Empresa</th><th>Sector</th><th>Servicio</th><th>Estado</th><th>Origen</th><th>Próximo paso</th><th>Resp.</th><th style={{textAlign:'right'}}>Importe</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const sc = STATE_COLORS[l.estado] || { chip:'gray' }
              const tempColor = l.temp==='hot'?'#FF5A6A':l.temp==='warm'?'#FFB547':l.temp==='cold'?'#6B7590':l.temp==='won'?'#3ECF8E':'#FF5A6A'
              return (
                <tr key={l.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div style={{width:8, height:8, borderRadius:'50%', background:tempColor, boxShadow:`0 0 8px ${tempColor}`}}/>
                      <div><div className="primary">{l.empresa}</div><div className="muted" style={{fontSize:11.5}}>{l.ciudad}</div></div>
                    </div>
                  </td>
                  <td className="muted">{l.sector}</td>
                  <td className="muted">{l.servicio}</td>
                  <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                  <td className="muted small">{l.origen}</td>
                  <td className="muted small">{l.next}</td>
                  <td><div className="avatar sm">{l.responsable}</div></td>
                  <td className="mono" style={{textAlign:'right'}}>{l.monto ? `€${eur(l.monto)}` : <span className="muted">—</span>}</td>
                  <td><button className="icon-btn" style={{width:28, height:28}}><I.MoreH size={14}/></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Clientes({ data }) {
  const clientes = data?.clientes || []
  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Activos, recurrentes y cerrados · {clientes.length} clientes · €{eur(clientes.reduce((a,c)=>a+(c.importe||0),0))} facturados</p>
        </div>
        <div className="page-actions">
          <button className="btn"><I.Filter size={13}/> Filtros</button>
          <button className="btn"><I.Download size={13}/> Exportar</button>
          <button className="btn primary"><I.Plus size={13}/> Nuevo cliente</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Pago</th><th>Ajustes</th><th>Resp.</th><th>Desde</th><th style={{textAlign:'right'}}>Importe</th></tr></thead>
          <tbody>
            {clientes.map(c => {
              const chip = c.estado==='Cerrado'?'gray':c.estado==='En curso'?'blue':c.estado==='En revisión'?'violet':c.estado==='Recurrente'?'green':'amber'
              return (
                <tr key={c.id}>
                  <td><div className="primary">{c.nombre}</div></td>
                  <td className="muted">{c.servicio}</td>
                  <td><span className={`chip ${chip}`}><span className="dot"/>{c.estado}</span></td>
                  <td>{c.pagado ? <span className="chip green"><span className="dot"/>Pagado</span> : <span className="chip amber"><span className="dot"/>Pendiente</span>}</td>
                  <td>{c.ajustes>0 ? <span className="pend">{c.ajustes} pendiente{c.ajustes>1?'s':''}</span> : <span className="muted small">—</span>}</td>
                  <td><div className="avatar sm">{c.responsable}</div></td>
                  <td className="muted small">{c.since}</td>
                  <td className="mono" style={{textAlign:'right'}}>€{eur(c.importe||0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Pipeline({ data }) {
  const leads = data?.leads || []
  const cols = PIPELINE_COLS.map(label => ({
    label,
    color: STATE_COLORS[label]?.color || '#6B7590',
    items: leads.filter(l => l.estado === label),
  }))

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">Arrastra una tarjeta entre columnas para cambiar su estado · €24.200 abiertos</p>
        </div>
        <div className="page-actions">
          <div className="segmented"><button className="active">Kanban</button><button>Lista</button><button>Temporal</button></div>
          <button className="btn"><I.Filter size={13}/> Responsable</button>
          <button className="btn primary"><I.Plus size={13}/> Oportunidad</button>
        </div>
      </div>

      <div className="pipe-summary">
        {[
          {label:'Total abiertas', v:'14', sub:'oportunidades'},
          {label:'Valor potencial', v:'€24.200', sub:'suma ponderada'},
          {label:'Probabilidad cierre', v:'€12.300', sub:'prev. este mes'},
          {label:'Tasa conversión', v:'38%', sub:'últimos 90 días'},
        ].map((s,i)=>(
          <div key={i} className="stat" style={{padding:'14px 16px'}}>
            <div className="label" style={{fontSize:11}}>{s.label}</div>
            <div className="value" style={{fontSize:22, marginTop:6}}>{s.v}</div>
            <div className="foot">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="kanban">
        {cols.map(col=>(
          <div className="kanban-col" key={col.label}>
            <div className="kanban-col-head">
              <div className="bar" style={{'--col-color': col.color}}/>
              <span className="title">{col.label}</span>
              <span className="count">{col.items.length}</span>
            </div>
            {col.items.map(l=>(
              <div className="kanban-card" key={l.id}>
                <div className="name">{l.empresa}</div>
                <div className="sub">{l.servicio}</div>
                <div className="meta">
                  <div className="avatar xs">{l.responsable}</div>
                  <span>{l.ciudad}</span>
                  <span className="amount">€{eur(l.monto||0)}</span>
                </div>
              </div>
            ))}
            <button className="btn sm ghost" style={{justifyContent:'flex-start'}}><I.Plus size={12}/> Añadir</button>
          </div>
        ))}
      </div>
    </div>
  )
}
