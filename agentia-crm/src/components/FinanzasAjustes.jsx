import React, { useState, useEffect } from 'react'
import { I } from './Icons'
import { Modal, F, SelectOrText, CustomSelect } from './Modal'
import { PIPELINE_COLS, STATE_COLORS, eur } from './data'
import { supabase } from '../lib/supabase'

// ── CSV export helper ────────────────────────────────────────────
function downloadCSV(rows, filename) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? '' : String(r[h])
      return v.includes(';') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v
    }).join(';'))
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Finanzas ─────────────────────────────────────────────────────

function CobroModal({ cobro, onClose, onSave }) {
  const isNew = !cobro?.id
  const [form, setForm] = useState(cobro ? { ...cobro, monto: cobro.monto ?? '' } : {
    cliente:'', concepto:'', monto:'', vence:'', vencida:false, pagado:false,
    recurrente:false, frecuencia:'Mensual',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open title={isNew ? 'Nueva factura' : 'Editar factura'}
      onClose={onClose} onSave={() => { if (!form.cliente.trim()) return; onSave({ ...form, monto: parseFloat(form.monto) || 0 }) }} saveLabel={isNew ? 'Añadir factura' : 'Guardar'}>
      <F label="Cliente"><input value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Ej: Bodegas Altura" autoFocus /></F>
      <F label="Concepto"><input value={form.concepto||''} onChange={e => set('concepto', e.target.value)} placeholder="Ej: Mantenimiento mensual" /></F>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
        <F label="Fecha de vencimiento"><input type="date" value={form.vence||''} onChange={e => set('vence', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Estado">
          <CustomSelect value={form.pagado?'pagado':form.vencida?'vencida':'pendiente'}
            onChange={v => setForm(f => ({ ...f, pagado: v==='pagado', vencida: v==='vencida' }))}
            options={[{value:'pendiente',label:'Pendiente'},{value:'vencida',label:'Vencida'},{value:'pagado',label:'Pagada'}]} />
        </F>
        <F label="Recurrente">
          <CustomSelect value={form.recurrente?'si':'no'} onChange={v => set('recurrente', v==='si')}
            options={[{value:'no',label:'No — único'},{value:'si',label:'Sí — se repite'}]} />
        </F>
      </div>
      {form.recurrente && (
        <F label="Frecuencia">
          <CustomSelect value={form.frecuencia||'Mensual'} onChange={v => set('frecuencia', v)}
            options={['Mensual','Semanal','Trimestral']} />
        </F>
      )}
    </Modal>
  )
}

function GastoModal({ gasto, onClose, onSave, onDelete }) {
  const isNew = !gasto?.id
  const [form, setForm] = useState(gasto || {
    concepto:'', tipo:'Herramienta', monto:'', recurrente:false, fecha:'',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo gasto' : 'Editar gasto'}
      onClose={onClose} onSave={() => { if (!form.concepto.trim()) return; onSave({ ...form, monto: parseFloat(form.monto) || 0 }) }} saveLabel={isNew ? 'Añadir gasto' : 'Guardar'}>
      <F label="Concepto"><input value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Ej: OpenAI — API" autoFocus /></F>
      <div className="form-2col">
        <F label="Tipo">
          <SelectOrText value={form.tipo||'Herramienta'} onChange={v => set('tipo', v)} options={['IA','Infra','Herramienta','Personas','Otro']} placeholder="Ej: Marketing…" />
        </F>
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Fecha"><input type="date" value={form.fecha||''} onChange={e => set('fecha', e.target.value)} /></F>
        <F label="Recurrente">
          <CustomSelect value={form.recurrente?'si':'no'} onChange={v => set('recurrente', v==='si')}
            options={[{value:'no',label:'No — pago único'},{value:'si',label:'Sí — mensual'}]} />
        </F>
      </div>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete?.(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar gasto</button>
          }
        </div>
      )}
    </Modal>
  )
}

// ── P&L View ─────────────────────────────────────────────────────
function PLView({ cobros, gastos }) {
  const [offset, setOffset] = useState(0)

  const monthData = (off) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off)
    const y = d.getFullYear(), m = d.getMonth()
    const pad = n => String(n).padStart(2, '0')
    const start = `${y}-${pad(m+1)}-01`
    const end   = `${y}-${pad(m+1)}-${pad(new Date(y, m+1, 0).getDate())}`
    const ingresos    = cobros.filter(c => c.pagado && c.vence >= start && c.vence <= end)
    const gastosPunt  = gastos.filter(g => !g.recurrente && g.fecha && g.fecha >= start && g.fecha <= end)
    const gastosRec   = gastos.filter(g => g.recurrente && (!g.fecha || g.fecha <= end))
    const totalIng    = ingresos.reduce((a,c) => a+(c.monto||0), 0)
    const totalGPunt  = gastosPunt.reduce((a,g) => a+(g.monto||0), 0)
    const totalGRec   = gastosRec.reduce((a,g) => a+(g.monto||0), 0)
    const totalGast   = totalGPunt + totalGRec
    const beneficio   = totalIng - totalGast
    const margen      = totalIng > 0 ? Math.round(beneficio/totalIng*100) : (totalGast > 0 ? -100 : 0)
    const label       = d.toLocaleDateString('es-ES', {month:'long', year:'numeric'})
    return { y, m, start, end, ingresos, gastosPunt, gastosRec, totalIng, totalGPunt, totalGRec, totalGast, beneficio, margen, label }
  }

  const cur   = monthData(offset)
  const prv   = monthData(offset - 1)
  const chart = Array.from({length:6}, (_,i) => monthData(offset - 5 + i))
  const maxVal = Math.max(...chart.map(d => Math.max(d.totalIng, d.totalGast)), 1)

  const ingByCliente = Object.values(
    cur.ingresos.reduce((acc, c) => {
      const k = c.cliente || 'Sin cliente'
      if (!acc[k]) acc[k] = { cliente: k, total: 0, items: [] }
      acc[k].total += c.monto||0; acc[k].items.push(c)
      return acc
    }, {})
  ).sort((a,b) => b.total - a.total)

  const mrr    = cur.ingresos.filter(c => c.recurrente).reduce((a,c) => a+(c.monto||0), 0)
  const oneOff = cur.ingresos.filter(c => !c.recurrente).reduce((a,c) => a+(c.monto||0), 0)
  const diffIng = prv.totalIng > 0 ? Math.round((cur.totalIng - prv.totalIng)/prv.totalIng*100) : null
  const diffBen = prv.beneficio !== 0 ? Math.round((cur.beneficio - prv.beneficio)/Math.abs(prv.beneficio)*100) : null

  return (
    <div className="fade-in">
      {/* Month selector */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <button className="btn ghost" onClick={() => setOffset(o => o-1)}>←</button>
        <h2 style={{fontSize:18, fontWeight:700, textTransform:'capitalize', minWidth:200, textAlign:'center'}}>{cur.label}</h2>
        <button className="btn ghost" onClick={() => setOffset(o => o+1)} disabled={offset >= 0} style={{opacity: offset >= 0 ? 0.3 : 1}}>→</button>
        {offset < 0 && <button className="btn sm ghost" onClick={() => setOffset(0)}>Mes actual</button>}
      </div>

      {/* KPI row */}
      <div className="grid-3" style={{marginBottom:20}}>
        <div className="card" style={{padding:'18px 20px'}}>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--ok)', marginBottom:10}}>Ingresos</div>
          <div style={{fontSize:28, fontWeight:700, color:'var(--ok)'}}>€{eur(cur.totalIng)}</div>
          {diffIng !== null && <div style={{fontSize:12, color: diffIng>=0?'var(--ok)':'var(--danger)', marginTop:4}}>{diffIng>=0?'↑':'↓'} {Math.abs(diffIng)}% vs mes anterior</div>}
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:10}}>
            {mrr > 0    && <span style={{fontSize:11, padding:'2px 8px', borderRadius:12, background:'rgba(62,207,142,0.12)', color:'var(--ok)'}}>↺ MRR €{eur(mrr)}</span>}
            {oneOff > 0 && <span style={{fontSize:11, padding:'2px 8px', borderRadius:12, background:'rgba(107,117,144,0.12)', color:'var(--text-3)'}}>One-off €{eur(oneOff)}</span>}
          </div>
        </div>
        <div className="card" style={{padding:'18px 20px'}}>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--danger)', marginBottom:10}}>Gastos</div>
          <div style={{fontSize:28, fontWeight:700, color:'var(--danger)'}}>€{eur(cur.totalGast)}</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:10}}>
            {cur.totalGRec  > 0 && <span style={{fontSize:11, padding:'2px 8px', borderRadius:12, background:'rgba(255,90,106,0.1)', color:'var(--danger)'}}>Suscr. €{eur(cur.totalGRec)}</span>}
            {cur.totalGPunt > 0 && <span style={{fontSize:11, padding:'2px 8px', borderRadius:12, background:'rgba(107,117,144,0.12)', color:'var(--text-3)'}}>Puntuales €{eur(cur.totalGPunt)}</span>}
          </div>
        </div>
        <div className="card" style={{padding:'18px 20px'}}>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--text-4)', marginBottom:10}}>Resultado</div>
          <div style={{fontSize:28, fontWeight:700, color: cur.beneficio>=0?'var(--ok)':'var(--danger)'}}>
            {cur.beneficio<0?'-':''}€{eur(Math.abs(cur.beneficio))}
          </div>
          <div style={{fontSize:13, color:'var(--text-3)', marginTop:4}}>Margen {cur.margen}%</div>
          {diffBen !== null && <div style={{fontSize:12, color: diffBen>=0?'var(--ok)':'var(--danger)', marginTop:4}}>{diffBen>=0?'↑':'↓'} {Math.abs(diffBen)}% vs mes anterior</div>}
        </div>
      </div>

      {/* Detail + chart */}
      <div className="grid-main-side">
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* Ingresos detail */}
          <div className="card">
            <div className="card-head"><h3>Ingresos del mes</h3></div>
            {cur.ingresos.length === 0
              ? <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'20px 0'}}>Sin ingresos este mes</div>
              : <div style={{overflowX:'auto'}}><table className="table">
                  <thead><tr><th>Cliente</th><th>Concepto</th><th style={{textAlign:'right'}}>Importe</th><th>Tipo</th></tr></thead>
                  <tbody>
                    {ingByCliente.map(g => g.items.map(c => (
                      <tr key={c.id}>
                        <td><span className="primary">{c.cliente}</span></td>
                        <td className="muted small">{c.concepto}</td>
                        <td className="mono" style={{textAlign:'right', color:'var(--ok)'}}>€{eur(c.monto||0)}</td>
                        <td>{c.recurrente
                          ? <span style={{fontSize:10, fontWeight:600, color:'var(--ok)', background:'rgba(62,207,142,0.12)', padding:'2px 8px', borderRadius:12}}>↺ Recurrente</span>
                          : <span style={{fontSize:10, fontWeight:600, color:'var(--text-4)', background:'rgba(107,117,144,0.1)', padding:'2px 8px', borderRadius:12}}>One-off</span>
                        }</td>
                      </tr>
                    )))}
                  </tbody>
                </table></div>
            }
          </div>
          {/* Gastos detail */}
          <div className="card">
            <div className="card-head"><h3>Gastos del mes</h3></div>
            {cur.totalGast === 0
              ? <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'20px 0'}}>Sin gastos este mes</div>
              : <div style={{overflowX:'auto'}}><table className="table">
                  <thead><tr><th>Concepto</th><th>Categoría</th><th style={{textAlign:'right'}}>Importe</th></tr></thead>
                  <tbody>
                    {cur.gastosRec.map(g => (
                      <tr key={g.id}>
                        <td><span className="primary">{g.concepto}</span></td>
                        <td><span style={{fontSize:10, fontWeight:600, color:'var(--ok)', background:'rgba(62,207,142,0.12)', padding:'2px 8px', borderRadius:12}}>↺ {g.tipo}</span></td>
                        <td className="mono" style={{textAlign:'right', color:'var(--danger)'}}>€{eur(g.monto||0)}</td>
                      </tr>
                    ))}
                    {cur.gastosPunt.map(g => (
                      <tr key={g.id}>
                        <td><span className="primary">{g.concepto}</span></td>
                        <td className="muted small">{g.tipo}</td>
                        <td className="mono" style={{textAlign:'right', color:'var(--danger)'}}>€{eur(g.monto||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            }
          </div>
        </div>

        {/* Chart + histórico */}
        <div className="card" style={{padding:'18px 20px'}}>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--text-4)', marginBottom:16}}>Últimos 6 meses</div>
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height:140, marginBottom:8}}>
            {chart.map((d,i) => {
              const ingH = Math.round((d.totalIng/maxVal)*130)
              const gstH = Math.round((d.totalGast/maxVal)*130)
              const sel  = i === 5
              return (
                <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3}}>
                  <div style={{width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:130}}>
                    <div style={{flex:1, height:ingH||2, background:sel?'var(--ok)':'rgba(62,207,142,0.35)', borderRadius:'3px 3px 0 0'}}/>
                    <div style={{flex:1, height:gstH||2, background:sel?'var(--danger)':'rgba(255,90,106,0.35)', borderRadius:'3px 3px 0 0'}}/>
                  </div>
                  <div style={{fontSize:9, color:sel?'var(--text-0)':'var(--text-4)', fontWeight:sel?700:400, textAlign:'center'}}>
                    {new Date(d.y,d.m,1).toLocaleDateString('es-ES',{month:'short'})}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{display:'flex', gap:12, justifyContent:'center', marginBottom:16}}>
            <div style={{display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-4)'}}><div style={{width:10,height:10,borderRadius:2,background:'var(--ok)'}}/> Ingresos</div>
            <div style={{display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-4)'}}><div style={{width:10,height:10,borderRadius:2,background:'var(--danger)'}}/> Gastos</div>
          </div>
          <div style={{borderTop:'1px solid var(--border)', paddingTop:14}}>
            {[...chart].reverse().map((d,i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i<5?'1px solid rgba(255,255,255,0.04)':'none'}}>
                <div style={{fontSize:12, color:'var(--text-3)', textTransform:'capitalize', minWidth:60}}>
                  {new Date(d.y,d.m,1).toLocaleDateString('es-ES',{month:'long'})}
                </div>
                <div style={{display:'flex', gap:10, fontSize:12, fontFamily:'var(--font-mono)'}}>
                  <span style={{color:'var(--ok)'}}>+{eur(d.totalIng)}</span>
                  <span style={{color:'var(--danger)'}}>-{eur(d.totalGast)}</span>
                  <span style={{fontWeight:700, color:d.beneficio>=0?'var(--ok)':'var(--danger)'}}>{d.beneficio<0?'-':''}{eur(Math.abs(d.beneficio))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Finanzas ──────────────────────────────────────────────────────
export function Finanzas({ role, data }) {
  const gastos     = data?.gastos    || []
  const cobros     = data?.cobros    || []
  const showToast  = data?.showToast
  const [addingGasto, setAddingGasto]   = useState(false)
  const [editingGasto, setEditingGasto] = useState(null)
  const [addingCobro, setAddingCobro]   = useState(false)
  const [editingCobro, setEditingCobro] = useState(null)
  const [tab, setTab] = useState('resumen')

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

  const hoyBase = new Date(); hoyBase.setHours(0,0,0,0)
  // Recurrentes futuros (vence > hoy) no cuentan como "por cobrar"
  const pendientes  = cobros.filter(c => {
    if (c.pagado) return false
    if (c.recurrente && c.vence) return new Date(c.vence + 'T00:00:00') <= hoyBase
    return true
  })
  const pagados     = cobros.filter(c => c.pagado)
  const ingresosMes = pagados.reduce((a,c) => a + (c.monto||0), 0)
  const cobrosPend  = pendientes.reduce((a,c) => a + (c.monto||0), 0)
  const gastosMes   = gastos.reduce((a,g) => a + (g.monto||0), 0)
  const gastoIA     = gastos.filter(g => g.tipo === 'IA').reduce((a,g) => a + (g.monto||0), 0)
  const gastoInfra  = gastos.filter(g => g.tipo === 'Infra').reduce((a,g) => a + (g.monto||0), 0)
  const gastoHerr   = gastos.filter(g => g.tipo === 'Herramienta').reduce((a,g) => a + (g.monto||0), 0)
  const gastoPerso  = gastos.filter(g => g.tipo === 'Personas').reduce((a,g) => a + (g.monto||0), 0)
  const margen      = (ingresosMes + cobrosPend) > 0
    ? Math.round((ingresosMes - gastosMes) / (ingresosMes + cobrosPend) * 100)
    : (gastosMes === 0 ? 100 : 0)

  const handleSaveCobro = (form) => {
    if (form.id) data.updateCobro?.(form.id, form)
    else data.addCobro?.(form)
    setAddingCobro(false); setEditingCobro(null)
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Visión ejecutiva del negocio · {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="page-actions">
          {tab === 'resumen' && <>
            <button className="btn" onClick={() => setAddingCobro(true)}><I.Plus size={13}/> Nueva factura</button>
            <button className="btn primary" onClick={() => setAddingGasto(true)}><I.Plus size={13}/> Añadir gasto</button>
          </>}
        </div>
      </div>

      <div style={{padding:'0 0 20px'}}>
        <div className="segmented">
          <button className={tab==='resumen'?'active':''} onClick={()=>setTab('resumen')}>Resumen</button>
          <button className={tab==='pl'?'active':''} onClick={()=>setTab('pl')}>P&L mensual</button>
        </div>
      </div>

      {tab === 'pl' && <PLView cobros={cobros} gastos={gastos} />}
      {tab === 'resumen' && <><div className="grid-3" style={{marginBottom:16}}>
        <div className="fin-card accent">
          <div className="label">Ingresos cobrados</div>
          <div className="big"><span className="currency">€</span>{eur(ingresosMes)}</div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:10}}>
            <span className="chip green"><span className="dot"/>{pagados.length} cobro{pagados.length!==1?'s':''}</span>
            {pendientes.length > 0 && <span className="chip amber"><span className="dot"/>{pendientes.length} pendiente{pendientes.length!==1?'s':''}</span>}
          </div>
          <div style={{height:8}}/>
          <div className="progress">
            <div className="bar" style={{width: ingresosMes > 0 ? `${Math.min(100, Math.round(ingresosMes/20000*100))}%` : '0%'}}/>
          </div>
          <div className="small" style={{color:'var(--text-3)', marginTop:6}}>
            {ingresosMes > 0 ? `${Math.min(100, Math.round(ingresosMes/20000*100))}% del objetivo €20.000` : 'Sin cobros aún'}
          </div>
        </div>

        <div className="fin-card">
          <div className="label">Por cobrar</div>
          <div className="big"><span className="currency">€</span>{eur(cobrosPend)}</div>
          <div className="small" style={{color: cobrosPend > 0 ? 'var(--warn)' : 'var(--ok)', marginTop:8, fontFamily:'var(--font-mono)'}}>
            {cobrosPend > 0 ? `${pendientes.length} factura${pendientes.length!==1?'s':''} sin cobrar` : 'Todo cobrado ✓'}
          </div>
          <div style={{height:8}}/>
          <div className="progress">
            <div className="bar warn" style={{width: (ingresosMes+cobrosPend) > 0 ? `${Math.round(cobrosPend/(ingresosMes+cobrosPend)*100)}%` : '0%'}}/>
          </div>
          <div className="small" style={{color:'var(--text-3)', marginTop:6}}>
            {(ingresosMes+cobrosPend) > 0 ? `${Math.round(cobrosPend/(ingresosMes+cobrosPend)*100)}% del total aún no cobrado` : 'Añade facturas desde la tabla'}
          </div>
        </div>

        <div className="fin-card">
          <div className="label">Gastos del mes</div>
          <div className="big"><span className="currency">€</span>{eur(gastosMes)}</div>
          <div className="small" style={{color:'var(--text-3)', marginTop:8, fontFamily:'var(--font-mono)'}}>
            <span style={{color:'#9A7BFF'}}>●</span> IA €{gastoIA} · Infra €{gastoInfra} · Herr €{gastoHerr} · Pers €{gastoPerso}
          </div>
          <div style={{height:10}}/>
          {gastosMes > 0 && (
            <div style={{display:'flex', height:6, borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,0.05)'}}>
              <div style={{width:`${Math.round(gastoIA/gastosMes*100)}%`, background:'#9A7BFF'}}/>
              <div style={{width:`${Math.round(gastoInfra/gastosMes*100)}%`, background:'#4F8BFF'}}/>
              <div style={{width:`${Math.round(gastoHerr/gastosMes*100)}%`, background:'#3ECF8E'}}/>
              <div style={{width:`${Math.round(gastoPerso/gastosMes*100)}%`, background:'#FFB547'}}/>
            </div>
          )}
          <div className="small" style={{color:'var(--text-3)', marginTop:12}}>Margen estimado: <span style={{color: margen>=60?'var(--ok)':margen>=30?'var(--warn)':'var(--danger)', fontFamily:'var(--font-mono)'}}>{margen}%</span></div>
        </div>
      </div>

      <div className="grid-main-side">
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* ── Recurrentes: una fila por cliente (vista suscripción) ── */}
          {(() => {
            const hoy = new Date(); hoy.setHours(0,0,0,0)
            const todosRec = cobros.filter(c => c.recurrente)
            const clientesRec = [...new Set(todosRec.map(c => c.cliente))]

            const suscripciones = clientesRec.map(cliente => {
              const all = todosRec.filter(c => c.cliente === cliente)
              const pendSorted = all.filter(c => !c.pagado).sort((a,b) => (a.vence||'') < (b.vence||'') ? -1 : 1)
              const pagSorted  = all.filter(c => c.pagado).sort((a,b) => (a.vence||'') > (b.vence||'') ? -1 : 1)
              const next   = pendSorted[0]
              const ultimo = pagSorted[0]
              const rep    = next || ultimo
              const venceDate = next?.vence ? new Date(next.vence + 'T00:00:00') : null
              const dias = venceDate ? Math.floor((venceDate - hoy) / 86400000) : null
              const vencido = dias !== null && dias <= 0
              return { cliente, concepto: rep?.concepto, frecuencia: rep?.frecuencia || 'Mensual', monto: rep?.monto || 0, next, ultimo, dias, vencido }
            })

            const mrr      = suscripciones.reduce((a, s) => a + s.monto, 0)
            const vencidas = suscripciones.filter(s => s.vencido).length

            return (
              <div className="card">
                <div className="card-head">
                  <h3>
                    ↺ Recurrentes
                    <span style={{fontSize:12, fontWeight:400, color:'var(--text-4)'}}> · MRR €{eur(mrr)}/mes</span>
                    {vencidas > 0 && <span style={{fontSize:12, fontWeight:600, color:'var(--danger)', marginLeft:8}}>⚠ {vencidas} vencida{vencidas>1?'s':''}</span>}
                  </h3>
                  <div className="right">
                    <button className="btn sm" onClick={() => setAddingCobro(true)}><I.Plus size={12}/></button>
                  </div>
                </div>
                {suscripciones.length === 0 ? (
                  <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'20px 0'}}>Sin suscripciones recurrentes</div>
                ) : (
                  <div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
                  <table className="table">
                    <thead>
                      <tr><th>Cliente</th><th>Concepto</th><th>Frecuencia</th><th style={{textAlign:'right'}}>Importe</th><th>Último pago</th><th>Próximo</th><th>Estado</th><th></th></tr>
                    </thead>
                    <tbody>
                      {suscripciones.map(s => (
                        <tr key={s.cliente}>
                          <td><span className="primary">{s.cliente}</span></td>
                          <td className="muted small">{s.concepto}</td>
                          <td><span style={{fontSize:10, fontWeight:600, color:'var(--ok)', background:'rgba(62,207,142,0.12)', padding:'2px 8px', borderRadius:12}}>↺ {s.frecuencia}</span></td>
                          <td className="mono" style={{textAlign:'right'}}>€{eur(s.monto)}</td>
                          <td className="muted small">{s.ultimo?.vence || '—'}</td>
                          <td className="muted">
                            {s.next?.vence || '—'}
                            {s.vencido && <span style={{marginLeft:6, fontSize:10.5, fontWeight:600, color:'var(--danger)', fontFamily:'var(--font-mono)'}}>
                              {s.dias === 0 ? ' · Hoy' : ` · ${Math.abs(s.dias)}d`}
                            </span>}
                          </td>
                          <td>
                            {s.vencido
                              ? <span className="chip red"><span className="dot"/>Vencida</span>
                              : <span className="chip green"><span className="dot"/>Al día</span>
                            }
                          </td>
                          <td>
                            <div style={{display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
                              {s.vencido && s.next && (
                                <button className="btn sm" style={{padding:'3px 10px', fontSize:12}}
                                  onClick={() => { data.updateCobro?.(s.next.id, { pagado: true, vencida: false }); showToast?.(`Cobro de ${s.cliente} marcado como pagado`) }}>
                                  ✓ Cobrado
                                </button>
                              )}
                              <button className="icon-btn" style={{width:24, height:24, color:'var(--text-4)'}}
                                onClick={() => {
                                  const target = s.next || s.ultimo
                                  if (target && confirm(`¿Eliminar suscripción de ${s.cliente}?`)) data.deleteCobro?.(target.id)
                                }}>
                                <I.Close size={11}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Facturas puntuales ── */}
          {(() => {
            const puntuales = cobros.filter(c => !c.recurrente)
            return (
              <div className="card">
                <div className="card-head">
                  <h3>Facturas</h3>
                  <div className="right">
                    <button className="btn sm ghost" onClick={() => downloadCSV(
                      cobros.map(c => ({ Cliente: c.cliente, Concepto: c.concepto||'', Importe: c.monto||0, Vencimiento: c.vence||'', Estado: c.pagado?'Pagada':c.vencida?'Vencida':'Pendiente', Recurrente: c.recurrente?'Sí':'No' })),
                      `facturas-${new Date().toISOString().slice(0,10)}.csv`
                    )}>↓ CSV</button>
                    <button className="btn sm" onClick={() => setAddingCobro(true)}><I.Plus size={12}/></button>
                  </div>
                </div>
                {puntuales.length === 0 ? (
                  <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'20px 0'}}>Sin facturas puntuales</div>
                ) : (
                  <div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
                  <table className="table">
                    <thead><tr><th>Cliente</th><th>Concepto</th><th style={{textAlign:'right'}}>Importe</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {puntuales.map(c => (
                        <tr key={c.id} style={{cursor:'pointer'}} onClick={() => setEditingCobro(c)}>
                          <td><span className="primary">{c.cliente}</span></td>
                          <td className="muted small">{c.concepto}</td>
                          <td className="mono" style={{textAlign:'right'}}>€{eur(c.monto||0)}</td>
                          <td className="muted">
                            {c.vence || '—'}
                            {!c.pagado && c.vence && (() => {
                              const dias = Math.floor((Date.now() - new Date(c.vence + 'T00:00:00')) / 86400000)
                              if (dias < 0) return null
                              const col = dias < 15 ? '#FFB547' : dias < 30 ? '#FF8050' : '#FF5A6A'
                              return <span style={{marginLeft:6, fontSize:10.5, fontWeight:600, color:col, fontFamily:'var(--font-mono)'}}>{dias === 0 ? 'Hoy' : `+${dias}d`}</span>
                            })()}
                          </td>
                          <td>
                            {c.pagado && (c.concepto || '').startsWith('Señal ·')
                              ? <span className="chip amber"><span className="dot"/>Señal pagada</span>
                              : c.pagado
                                ? <span className="chip green"><span className="dot"/>Pagada</span>
                                : c.vencida
                                  ? <span className="chip red"><span className="dot"/>Vencida</span>
                                  : <span className="chip amber"><span className="dot"/>Pendiente</span>
                            }
                          </td>
                          <td style={{display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
                            {!c.pagado && (
                              <button className="btn sm" style={{padding:'3px 10px', fontSize:12}}
                                onClick={e => { e.stopPropagation(); data.updateCobro?.(c.id, { pagado: true, vencida: false }); showToast?.(`Cobro de ${c.cliente} marcado como pagado`) }}>
                                ✓ Cobrado
                              </button>
                            )}
                            <button className="icon-btn" style={{width:24, height:24, color:'var(--text-4)'}}
                              onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar factura de ${c.cliente}?`)) data.deleteCobro?.(c.id) }}>
                              <I.Close size={11}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* ── Suscripciones (gastos recurrentes) ── */}
          {(() => {
            const hoy = new Date(); hoy.setHours(0,0,0,0)
            const addMes = (fechaStr) => {
              if (!fechaStr) return null
              const d = new Date(fechaStr + 'T00:00:00')
              d.setMonth(d.getMonth() + 1)
              return d.toISOString().slice(0, 10)
            }
            const subs = gastos.filter(g => g.recurrente)
            const mrc  = subs.reduce((a, g) => a + (g.monto || 0), 0)
            const vencidas = subs.filter(g => {
              const p = addMes(g.fecha)
              return p && new Date(p + 'T00:00:00') <= hoy
            }).length
            return (
              <div className="card">
                <div className="card-head">
                  <h3>
                    Suscripciones
                    <span style={{fontSize:12, fontWeight:400, color:'var(--text-4)'}}> · MRC €{eur(mrc)}/mes</span>
                    {vencidas > 0 && <span style={{fontSize:12, fontWeight:600, color:'var(--danger)', marginLeft:8}}>⚠ {vencidas} por pagar</span>}
                  </h3>
                  <div className="right"><button className="btn sm" onClick={() => setAddingGasto(true)}><I.Plus size={12}/></button></div>
                </div>
                {subs.length === 0
                  ? <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'16px 0'}}>Sin suscripciones activas</div>
                  : subs.map(g => {
                    const typeColor = g.tipo==='IA'?'#9A7BFF':g.tipo==='Infra'?'#4F8BFF':g.tipo==='Personas'?'#FFB547':'#3ECF8E'
                    const proximo = addMes(g.fecha)
                    const proximoDate = proximo ? new Date(proximo + 'T00:00:00') : null
                    const dias = proximoDate ? Math.floor((proximoDate - hoy) / 86400000) : null
                    const toca = dias !== null && dias <= 0
                    return (
                      <div className="task" key={g.id} style={{cursor:'pointer'}} onClick={() => setEditingGasto(g)}>
                        <div style={{width:30, height:30, borderRadius:8, background:`${typeColor}22`, color:typeColor, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><I.Receipt size={14}/></div>
                        <div style={{flex:1, minWidth:0}}>
                          <div className="title">{g.concepto}</div>
                          <div className="sub">
                            {g.tipo} · <span style={{color:'var(--ok)'}}>↺ mensual</span>
                            {proximo && (
                              <span style={{marginLeft:6, color: toca ? 'var(--danger)' : 'var(--text-4)'}}>
                                {toca
                                  ? (dias === 0 ? '· ⚠ Toca hoy' : `· ⚠ Tocaba hace ${Math.abs(dias)}d`)
                                  : `· próx. ${proximo}`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mono" style={{fontSize:13}}>€{eur(g.monto||0)}<span style={{fontSize:10, color:'var(--text-4)'}}>/mes</span></div>
                        <button className="icon-btn" style={{width:22, height:22, color:'var(--text-4)'}}
                          onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar suscripción "${g.concepto}"?`)) data.deleteGasto?.(g.id) }}>
                          <I.Close size={11}/>
                        </button>
                      </div>
                    )
                  })
                }
              </div>
            )
          })()}

          {/* ── Gastos puntuales ── */}
          {(() => {
            const puntuales = gastos.filter(g => !g.recurrente)
            return (
              <div className="card">
                <div className="card-head">
                  <h3>Gastos puntuales</h3>
                  <div className="right"><button className="btn sm" onClick={() => setAddingGasto(true)}><I.Plus size={12}/></button></div>
                </div>
                {puntuales.length === 0
                  ? <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'16px 0'}}>Sin gastos puntuales</div>
                  : puntuales.map(g => {
                    const typeColor = g.tipo==='IA'?'#9A7BFF':g.tipo==='Infra'?'#4F8BFF':g.tipo==='Personas'?'#FFB547':'#3ECF8E'
                    return (
                      <div className="task" key={g.id} style={{cursor:'pointer'}} onClick={() => setEditingGasto(g)}>
                        <div style={{width:30, height:30, borderRadius:8, background:`${typeColor}22`, color:typeColor, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><I.Receipt size={14}/></div>
                        <div style={{flex:1, minWidth:0}}>
                          <div className="title">{g.concepto}</div>
                          <div className="sub">{g.tipo}{g.fecha ? ` · ${g.fecha}` : ''}</div>
                        </div>
                        <div className="mono" style={{fontSize:13}}>€{eur(g.monto||0)}</div>
                        <button className="icon-btn" style={{width:22, height:22, color:'var(--text-4)'}}
                          onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${g.concepto}"?`)) data.deleteGasto?.(g.id) }}>
                          <I.Close size={11}/>
                        </button>
                      </div>
                    )
                  })
                }
              </div>
            )
          })()}
        </div>
      </div>
      </>}

      {(addingCobro || editingCobro) && (
        <CobroModal
          cobro={editingCobro}
          onClose={() => { setAddingCobro(false); setEditingCobro(null) }}
          onSave={handleSaveCobro}
        />
      )}
      {(addingGasto || editingGasto) && (
        <GastoModal
          gasto={editingGasto}
          onClose={() => { setAddingGasto(false); setEditingGasto(null) }}
          onSave={form => {
            if (form.id) data.updateGasto?.(form.id, form)
            else data.addGasto?.(form)
            setAddingGasto(false); setEditingGasto(null)
          }}
          onDelete={id => { data.deleteGasto?.(id); setEditingGasto(null) }}
        />
      )}
    </div>
  )
}

// ── Ajustes ──────────────────────────────────────────────────────

function ServicioModal({ servicio, onClose, onSave }) {
  const isNew = !servicio
  const [form, setForm] = useState(servicio || { n:'', base:0, activo:true, color:'#4F8BFF' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const COLORS = ['#4F8BFF','#9A7BFF','#3ECF8E','#FFB547','#FF5A6A','#F0A050']

  return (
    <Modal open title={isNew ? 'Nuevo servicio' : `Editar — ${form.n}`}
      onClose={onClose} onSave={() => onSave(form)} saveLabel={isNew ? 'Añadir servicio' : 'Guardar'}>
      <F label="Nombre del servicio"><input value={form.n} onChange={e => set('n', e.target.value)} autoFocus /></F>
      <F label="Precio base (€)"><input type="number" min="0" value={form.base} onChange={e => set('base', Number(e.target.value))} /></F>
      <F label="Color">
        <div style={{display:'flex', gap:8, flexWrap:'wrap', paddingTop:4}}>
          {COLORS.map(c=>(
            <div key={c} onClick={() => set('color', c)}
              style={{width:26, height:26, borderRadius:7, background:c, cursor:'pointer',
                boxShadow: form.color===c ? `0 0 0 2px white, 0 0 0 4px ${c}` : `0 0 8px ${c}66`}}/>
          ))}
        </div>
      </F>
      <F label="Activo">
        <CustomSelect value={form.activo?'si':'no'} onChange={v => set('activo', v==='si')}
          options={[{value:'si',label:'Sí'},{value:'no',label:'No (desactivado)'}]} />
      </F>
    </Modal>
  )
}

const DEFAULT_SERVICIOS = [
  { id:1, n:'Página web premium',       base:2500, activo:true,  color:'#4F8BFF' },
  { id:2, n:'Automatización WhatsApp',  base:1800, activo:true,  color:'#9A7BFF' },
  { id:3, n:'Chatbot de reservas',      base:1600, activo:true,  color:'#3ECF8E' },
  { id:4, n:'Mantenimiento mensual',    base:120,  activo:true,  color:'#FFB547' },
  { id:5, n:'Campaña captación',        base:900,  activo:false, color:'#FF5A6A' },
]

function initials(name) {
  return (name || '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0,2).toUpperCase() || '?'
}

function UsuarioModal({ usuario, onClose, onSave, onDelete }) {
  const isNew = !usuario?.id
  const [form, setForm] = useState(usuario || { nombre:'', iniciales:'', rol:'Empleado', email:'', estado:'activo' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo miembro del equipo' : `Editar — ${form.nombre}`}
      onClose={onClose} onSave={() => { if (!form.nombre.trim()) return; onSave(form) }}
      saveLabel={isNew ? 'Añadir al equipo' : 'Guardar'}>
      <div className="form-2col">
        <F label="Nombre completo">
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Juan García" autoFocus />
        </F>
        <F label="Iniciales (2 letras)">
          <input value={form.iniciales||''} onChange={e => set('iniciales', e.target.value.toUpperCase().slice(0,2))} placeholder="Ej: JG" maxLength={2} />
        </F>
      </div>
      <div className="form-2col">
        <F label="Email">
          <input value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="juan@agentia.com" />
        </F>
        <F label="Rol">
          <CustomSelect value={form.rol||'Empleado'} onChange={v => set('rol', v)} options={['Admin','Empleado']} />
        </F>
      </div>
      <F label="Estado">
        <CustomSelect value={form.estado||'activo'} onChange={v => set('estado', v)} options={[{value:'activo',label:'Activo'},{value:'inactivo',label:'Inactivo'}]} />
      </F>
      {isNew && (
        <div style={{padding:'12px 14px', background:'rgba(45,107,255,0.06)', border:'1px solid rgba(45,107,255,0.2)', borderRadius:10, fontSize:12.5, color:'var(--text-3)', lineHeight:1.6}}>
          Después de añadir al equipo aquí, el empleado necesita una cuenta en <b style={{color:'var(--text-2)'}}>Supabase Auth</b> con el mismo email para poder iniciar sesión. Su <b>auth_uid</b> debe coincidir con el de la tabla usuarios.
        </div>
      )}
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar usuario</button>
          }
        </div>
      )}
    </Modal>
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

  const [ivaConfig, setIvaConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agentia_iva') || 'null') || { enabled: false, rate: 21, incluido: true } } catch { return { enabled: false, rate: 21, incluido: true } }
  })
  const saveIva = (cfg) => { setIvaConfig(cfg); localStorage.setItem('agentia_iva', JSON.stringify(cfg)) }

  const [servicios, setServicios] = useState(() => {
    try { const s = localStorage.getItem('agentia_servicios'); return s ? JSON.parse(s) : DEFAULT_SERVICIOS } catch { return DEFAULT_SERVICIOS }
  })
  useEffect(() => { localStorage.setItem('agentia_servicios', JSON.stringify(servicios)) }, [servicios])

  const [editingServicio, setEditingServicio] = useState(null)
  const [addingServicio, setAddingServicio] = useState(false)

  const toggleServicio = (id) => setServicios(prev => prev.map(s => s.id===id ? {...s, activo:!s.activo} : s))
  const saveServicio = (form) => {
    if (form.id) setServicios(prev => prev.map(s => s.id===form.id ? form : s))
    else setServicios(prev => [...prev, { ...form, id: Date.now() }])
    setEditingServicio(null); setAddingServicio(false)
  }

  const [usuarios, setUsuarios] = useState([])
  const [usuariosLoading, setUsuariosLoading] = useState(true)

  useEffect(() => {
    supabase.from('usuarios').select('*').order('created_at', { ascending: true }).then(({ data }) => {
      if (data) setUsuarios(data)
      setUsuariosLoading(false)
    })
  }, [])

  const [editingUsuario, setEditingUsuario] = useState(null)
  const [addingUsuario, setAddingUsuario] = useState(false)

  const saveUsuario = async (form) => {
    const { id, created_at, ...fields } = form
    if (id) {
      const { data } = await supabase.from('usuarios').update(fields).eq('id', id).select().single()
      if (data) setUsuarios(prev => prev.map(u => u.id === id ? data : u))
    } else {
      const { data } = await supabase.from('usuarios').insert([fields]).select().single()
      if (data) setUsuarios(prev => [...prev, data])
    }
    setEditingUsuario(null); setAddingUsuario(false)
  }
  const deleteUsuario = async (id) => {
    await supabase.from('usuarios').delete().eq('id', id)
    setUsuarios(prev => prev.filter(u => u.id !== id))
  }

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
        <button className={tab==='finanzas'?'active':''} onClick={()=>setTab('finanzas')}>Finanzas</button>
        <button className={tab==='estados'?'active':''} onClick={()=>setTab('estados')}>Estados y etiquetas</button>
        <button className={tab==='marca'?'active':''} onClick={()=>setTab('marca')}>Marca</button>
      </div>

      {tab === 'servicios' && (
        <div className="card">
          <div className="card-head">
            <h3>Catálogo de servicios</h3>
            <span className="sub">· {servicios.filter(s=>s.activo).length} activos</span>
            <div className="right">
              <button className="btn primary" onClick={() => setAddingServicio(true)}><I.Plus size={13}/> Añadir servicio</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Servicio</th><th>Precio base</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {servicios.map(s=>(
                <tr key={s.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div style={{width:8, height:8, borderRadius:3, background:s.color, boxShadow:`0 0 8px ${s.color}`}}/>
                      <span className="primary">{s.n}</span>
                    </div>
                  </td>
                  <td className="mono">€{eur(s.base)}</td>
                  <td>
                    <div className={`toggle ${s.activo?'on':''}`} style={{cursor:'pointer'}} onClick={() => toggleServicio(s.id)}/>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn sm ghost" onClick={() => setEditingServicio(s)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-head">
            <h3>Equipo y permisos</h3>
            <span className="sub">· {usuarios.length} miembro{usuarios.length!==1?'s':''}</span>
            <div className="right">
              <button className="btn primary" onClick={() => setAddingUsuario(true)}><I.Plus size={13}/> Añadir miembro</button>
            </div>
          </div>
          {usuariosLoading ? (
            <div style={{padding:'24px 0', textAlign:'center', color:'var(--text-4)', fontSize:13}}>Cargando equipo…</div>
          ) : usuarios.length === 0 ? (
            <div style={{padding:'24px 0', textAlign:'center', color:'var(--text-4)', fontSize:13}}>Sin miembros en el equipo aún</div>
          ) : (
            <table className="table">
              <thead><tr><th>Usuario</th><th>Email</th><th>Iniciales</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <div className="avatar" style={u.estado==='inactivo'?{background:'rgba(255,255,255,0.05)', color:'var(--text-3)'}:{}}>{u.iniciales || '?'}</div>
                        <span className="primary">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="muted">{u.email || '—'}</td>
                    <td><span style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-3)'}}>{u.iniciales || '—'}</span></td>
                    <td>
                      {u.rol==='Admin'
                        ? <span className="chip blue"><span className="dot"/>Admin</span>
                        : <span className="chip gray"><span className="dot"/>Empleado</span>
                      }
                    </td>
                    <td>
                      {u.estado==='activo'
                        ? <span className="chip green"><span className="dot"/>Activo</span>
                        : <span className="chip amber"><span className="dot"/>Inactivo</span>
                      }
                    </td>
                    <td style={{textAlign:'right'}}>
                      <button className="btn sm ghost" onClick={() => setEditingUsuario(u)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'finanzas' && (
        <div className="card">
          <div className="card-head"><h3>Configuración de IVA</h3></div>
          <div style={{display:'flex', flexDirection:'column', gap:16, padding:'4px 0'}}>
            <div className="form-row" style={{alignItems:'center', justifyContent:'space-between', flexDirection:'row'}}>
              <label style={{margin:0}}>Aplicar IVA en los importes</label>
              <div className={`toggle ${ivaConfig.enabled?'on':''}`} style={{cursor:'pointer', flexShrink:0}} onClick={() => saveIva({...ivaConfig, enabled:!ivaConfig.enabled})}/>
            </div>
            {ivaConfig.enabled && (
              <>
                <div className="form-row">
                  <label>Tipo de IVA</label>
                  <CustomSelect value={String(ivaConfig.rate)} onChange={v => saveIva({...ivaConfig, rate: Number(v)})}
                    options={[{value:'21',label:'21% — General'},{value:'10',label:'10% — Reducido'},{value:'4',label:'4% — Superreducido'},{value:'0',label:'0% — Exento'}]} />
                </div>
                <div className="form-row">
                  <label>Los importes actuales son</label>
                  <CustomSelect value={ivaConfig.incluido?'incluido':'base'} onChange={v => saveIva({...ivaConfig, incluido: v==='incluido'})}
                    options={[{value:'base',label:'Base imponible (sin IVA)'},{value:'incluido',label:'Con IVA incluido'}]} />
                </div>
                <div style={{padding:'12px 14px', background:'rgba(62,207,142,0.06)', border:'1px solid rgba(62,207,142,0.2)', borderRadius:10, fontSize:12.5, color:'var(--text-3)'}}>
                  {ivaConfig.incluido
                    ? `Los importes ya incluyen IVA. Base imponible = importe ÷ 1.${String(ivaConfig.rate).padStart(2,'0')}`
                    : `Los importes son base. Total con IVA = importe × 1.${String(ivaConfig.rate).padStart(2,'0')}`
                  }
                  <div style={{marginTop:6, color:'var(--text-4)'}}>Este ajuste es informativo — los importes almacenados no cambian.</div>
                </div>
              </>
            )}
          </div>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {(editingServicio || addingServicio) && (
        <ServicioModal
          servicio={editingServicio}
          onClose={() => { setEditingServicio(null); setAddingServicio(false) }}
          onSave={saveServicio}
        />
      )}

      {(editingUsuario || addingUsuario) && (
        <UsuarioModal
          usuario={editingUsuario}
          onClose={() => { setEditingUsuario(null); setAddingUsuario(false) }}
          onSave={saveUsuario}
          onDelete={deleteUsuario}
        />
      )}
    </div>
  )
}
