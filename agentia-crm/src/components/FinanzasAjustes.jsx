import React, { useState } from 'react'
import { I } from './Icons'
import { PIPELINE_COLS, STATE_COLORS, eur } from './data'

export function Finanzas({ role, data }) {
  const gastos = data?.gastos || []

  if (role !== 'admin') {
    return (
      <div className="card fade-in" style={{marginTop:40}}>
        <div className="locked">
          <I.Lock size={28}/>
          <h3>Zona privada — solo admins</h3>
          <p>El módulo de finanzas está restringido a usuarios con rol de administrador.</p>
        </div>
      </div>
    )
  }

  const ingresosMes = 14820
  const cobrosPend = 5300
  const gastosMes = gastos.reduce((a,g) => a + (g.monto||0), 0)
  const gastoIA = gastos.filter(g => g.tipo === 'IA').reduce((a,g) => a + (g.monto||0), 0)

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Visión ejecutiva del negocio · abril 2026</p>
        </div>
        <div className="page-actions">
          <div className="segmented"><button>Semana</button><button className="active">Mes</button><button>Trimestre</button><button>Año</button></div>
          <button className="btn"><I.Download size={13}/> Exportar</button>
          <button className="btn primary"><I.Plus size={13}/> Movimiento</button>
        </div>
      </div>

      <div className="grid-3" style={{marginBottom:16}}>
        <div className="fin-card accent">
          <div className="label">Ingresos del mes</div>
          <div className="big"><span className="currency">€</span>{eur(ingresosMes)}</div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:10}}>
            <span className="chip green"><span className="dot"/>+18%</span>
            <span className="small" style={{color:'var(--text-3)'}}>vs marzo · 6 cobros</span>
          </div>
          <div style={{height:8}}/>
          <div className="progress"><div className="bar" style={{width:'74%'}}/></div>
          <div className="small" style={{color:'var(--text-3)', marginTop:6}}>74% del objetivo mensual (€20.000)</div>
        </div>

        <div className="fin-card">
          <div className="label">Cobros pendientes</div>
          <div className="big"><span className="currency">€</span>{eur(cobrosPend)}</div>
          <div className="small" style={{color:'var(--warn)', marginTop:8, fontFamily:'var(--font-mono)'}}>3 facturas abiertas</div>
          <div className="divider"/>
          {[
            {c:'Taller Ronda', v:1800, d:'venció 18 abr', late:true},
            {c:'Academia Logos', v:1740, d:'vence 28 abr'},
            {c:'Bodegas Altura', v:1760, d:'vence 5 may'},
          ].map((r,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', padding:'6px 0', borderBottom: i<2?'1px dashed var(--line-1)':'none'}}>
              <div style={{flex:1}}><div style={{fontSize:13}}>{r.c}</div><div className="small" style={{color: r.late?'var(--danger)':'var(--text-3)'}}>{r.d}</div></div>
              <div className="mono">€{eur(r.v)}</div>
            </div>
          ))}
        </div>

        <div className="fin-card">
          <div className="label">Gastos del mes</div>
          <div className="big"><span className="currency">€</span>{eur(gastosMes)}</div>
          <div className="small" style={{color:'var(--text-3)', marginTop:8, fontFamily:'var(--font-mono)'}}>
            <span style={{color:'var(--violet)'}}>●</span> IA €{gastoIA} · Infra €38 · Herramientas €30 · Personas €320
          </div>
          <div style={{height:10}}/>
          <div style={{display:'flex', height:6, borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,0.05)'}}>
            <div style={{width:'30%', background:'#9A7BFF'}}/><div style={{width:'5%', background:'#4F8BFF'}}/><div style={{width:'8%', background:'#3ECF8E'}}/><div style={{width:'57%', background:'#FFB547'}}/>
          </div>
          <div className="small" style={{color:'var(--text-3)', marginTop:12}}>Margen neto estimado: <span style={{color:'var(--ok)', fontFamily:'var(--font-mono)'}}>91%</span></div>
        </div>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head"><h3>Rentabilidad por cliente · mes</h3><div className="right"><button className="btn sm ghost">Ver todos</button></div></div>
          <table className="table">
            <thead><tr><th>Cliente</th><th>Servicio</th><th style={{textAlign:'right'}}>Ingreso</th><th style={{textAlign:'right'}}>Coste</th><th style={{textAlign:'right'}}>Margen</th></tr></thead>
            <tbody>
              {[
                {c:'Bodegas Altura', s:'E-commerce + SEO', i:3600, co:320},
                {c:'Óptica Horizonte', s:'Web + Chatbot', i:3400, co:280},
                {c:'Restaurante Marinero', s:'Chatbot', i:1600, co:110},
                {c:'Clínica Dental Nova', s:'Mantenimiento', i:240, co:20},
                {c:'Academia Logos', s:'Web', i:1160, co:140},
              ].map((r,i) => {
                const m = r.i - r.co, pct = Math.round(m/r.i*100)
                return (
                  <tr key={i}>
                    <td><span className="primary">{r.c}</span></td>
                    <td className="muted">{r.s}</td>
                    <td className="mono" style={{textAlign:'right'}}>€{eur(r.i)}</td>
                    <td className="mono" style={{textAlign:'right', color:'var(--text-3)'}}>€{eur(r.co)}</td>
                    <td style={{textAlign:'right'}}><span className="chip green"><span className="dot"/>{pct}% · €{eur(m)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head"><h3>Gastos recientes</h3><div className="right"><button className="btn sm"><I.Plus size={12}/></button></div></div>
          <div>
            {gastos.map(g => {
              const typeColor = g.tipo==='IA'?'#9A7BFF':g.tipo==='Infra'?'#4F8BFF':g.tipo==='Personas'?'#FFB547':'#3ECF8E'
              return (
                <div className="task" key={g.id}>
                  <div style={{width:30, height:30, borderRadius:8, background:`${typeColor}22`, color:typeColor, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><I.Receipt size={14}/></div>
                  <div style={{flex:1, minWidth:0}}><div className="title">{g.concepto}</div><div className="sub">{g.tipo} · {g.fecha} {g.recurrente && <span style={{color:'var(--brand-3)'}}>· recurrente</span>}</div></div>
                  <div className="mono" style={{fontSize:13}}>€{eur(g.monto||0)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Ajustes({ role }) {
  if (role !== 'admin') {
    return (
      <div className="card fade-in" style={{marginTop:40}}>
        <div className="locked">
          <I.Lock size={28}/>
          <h3>Solo admins pueden editar esta sección</h3>
          <p>Pide acceso a un administrador para modificar servicios o usuarios.</p>
        </div>
      </div>
    )
  }

  const [tab, setTab] = useState('servicios')
  const servicios = [
    { n:'Página web premium', base:2500, activo:true, color:'#4F8BFF' },
    { n:'Automatización WhatsApp', base:1800, activo:true, color:'#9A7BFF' },
    { n:'Chatbot de reservas', base:1600, activo:true, color:'#3ECF8E' },
    { n:'Mantenimiento mensual', base:120, activo:true, color:'#FFB547' },
    { n:'Campaña captación', base:900, activo:false, color:'#FF5A6A' },
  ]
  const usuarios = [
    { n:'Lucía P.', rol:'Admin', email:'lucia@agentia.com', ini:'LP', estado:'activo' },
    { n:'Andrés R.', rol:'Empleado', email:'andres@agentia.com', ini:'AR', estado:'activo' },
    { n:'Nueva plaza', rol:'—', email:'—', ini:'+', estado:'vacante' },
  ]

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-subtitle">Configura servicios, usuarios y permisos del sistema</p>
        </div>
      </div>

      <div className="segmented" style={{marginBottom:16}}>
        <button className={tab==='servicios'?'active':''} onClick={()=>setTab('servicios')}>Servicios</button>
        <button className={tab==='usuarios'?'active':''} onClick={()=>setTab('usuarios')}>Usuarios y roles</button>
        <button className={tab==='estados'?'active':''} onClick={()=>setTab('estados')}>Estados y etiquetas</button>
        <button className={tab==='marca'?'active':''} onClick={()=>setTab('marca')}>Marca</button>
      </div>

      {tab === 'servicios' && (
        <div className="card">
          <div className="card-head"><h3>Catálogo de servicios</h3><span className="sub">· dinámico, puedes añadir/editar/desactivar</span><div className="right"><button className="btn primary"><I.Plus size={13}/> Añadir servicio</button></div></div>
          <table className="table">
            <thead><tr><th>Servicio</th><th>Precio base</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {servicios.map((s,i)=>(
                <tr key={i}>
                  <td><div style={{display:'flex', alignItems:'center', gap:10}}><div style={{width:8, height:8, borderRadius:3, background:s.color, boxShadow:`0 0 8px ${s.color}`}}/><span className="primary">{s.n}</span></div></td>
                  <td className="mono">€{eur(s.base)}</td>
                  <td><div className={`toggle ${s.activo?'on':''}`}/></td>
                  <td style={{textAlign:'right'}}><button className="btn sm ghost">Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-head"><h3>Equipo y permisos</h3><div className="right"><button className="btn primary"><I.Plus size={13}/> Invitar usuario</button></div></div>
          <table className="table">
            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u,i)=>(
                <tr key={i}>
                  <td><div style={{display:'flex', alignItems:'center', gap:10}}><div className="avatar" style={u.estado==='vacante'?{background:'rgba(255,255,255,0.05)', color:'var(--text-3)'}:{}}>{u.ini}</div><span className="primary">{u.n}</span></div></td>
                  <td className="muted">{u.email}</td>
                  <td>{u.rol==='Admin'?<span className="chip blue"><span className="dot"/>Admin</span>:u.rol==='Empleado'?<span className="chip gray"><span className="dot"/>Empleado</span>:<span className="muted small">—</span>}</td>
                  <td>{u.estado==='activo'?<span className="chip green"><span className="dot"/>Activo</span>:<span className="chip amber"><span className="dot"/>Vacante</span>}</td>
                  <td style={{textAlign:'right'}}><button className="btn sm ghost">Gestionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'estados' && (
        <div className="card">
          <div className="card-head"><h3>Estados del pipeline</h3></div>
          <div className="card-body" style={{display:'flex', flexWrap:'wrap', gap:10}}>
            {PIPELINE_COLS.map(s=>(
              <div key={s} style={{display:'flex', alignItems:'center', gap:8, padding:'8px 14px', border:'1px solid var(--line-2)', borderRadius:10, background:'rgba(255,255,255,0.02)'}}>
                <div style={{width:10, height:10, borderRadius:3, background:STATE_COLORS[s]?.color, boxShadow:`0 0 8px ${STATE_COLORS[s]?.color}`}}/>
                {s}
              </div>
            ))}
            <button className="btn sm"><I.Plus size={12}/> Añadir estado</button>
          </div>
        </div>
      )}

      {tab === 'marca' && (
        <div className="card">
          <div className="card-head"><h3>Identidad Agentia</h3></div>
          <div className="card-body" style={{display:'flex', alignItems:'center', gap:24}}>
            <div style={{width:96, height:96, borderRadius:18, backgroundImage:'url(/assets/logo-agentia.jpeg)', backgroundSize:'cover', boxShadow:'0 0 0 1px var(--line-2), 0 10px 30px -6px rgba(45,107,255,0.4)'}}/>
            <div>
              <div style={{fontSize:18, fontWeight:600}}>Agentia</div>
              <div className="small" style={{color:'var(--text-3)'}}>Logo oficial · subido 23 abr 2026</div>
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <button className="btn sm"><I.Upload size={12}/> Reemplazar</button>
                <button className="btn sm ghost">Guidelines</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
