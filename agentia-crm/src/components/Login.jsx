import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ noProfile, onRetry }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const lbl = {
    fontSize: 11.5, fontWeight: 600, color: '#6B7590',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    display: 'block', marginBottom: 6,
  }

  return (
    <div style={{position:'fixed', inset:0, background:'#0A0E17', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif'}}>
      <div style={{width:'100%', maxWidth:380, padding:'0 24px'}}>

        <div style={{textAlign:'center', marginBottom:40}}>
          <div style={{width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#2D6BFF,#1a4fd8)', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:'0 0 32px rgba(45,107,255,0.45)'}}>⚡</div>
          <div style={{fontSize:22, fontWeight:700, color:'#fff', marginBottom:4}}>Agentia CRM</div>
          <div style={{fontSize:13, color:'#6B7590'}}>Accede con tu cuenta de equipo</div>
        </div>

        {noProfile ? (
          <div style={{padding:'16px', borderRadius:10, background:'rgba(255,90,106,0.08)', border:'1px solid rgba(255,90,106,0.25)', color:'#FF8FA0', fontSize:13, textAlign:'center', lineHeight:1.6}}>
            Tu cuenta existe pero no está configurada en el CRM.<br/>
            <span style={{color:'#FF5A6A', fontWeight:600}}>Contacta con el administrador</span> para que te añada al equipo.
            <br/><br/>
            <button onClick={onRetry} style={{background:'none', border:'1px solid rgba(255,90,106,0.4)', color:'#FF8FA0', padding:'6px 16px', borderRadius:7, cursor:'pointer', fontSize:12}}>
              Volver al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required autoFocus style={inp} />
            </div>
            <div style={{marginBottom:20}}>
              <label style={lbl}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inp} />
            </div>

            {error && (
              <div style={{padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(255,90,106,0.1)', border:'1px solid rgba(255,90,106,0.25)', color:'#FF8FA0', fontSize:13}}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'12px', borderRadius:10,
              background: loading ? 'rgba(45,107,255,0.5)' : '#2D6BFF',
              color:'#fff', fontSize:15, fontWeight:600, border:'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow:'0 4px 20px rgba(45,107,255,0.35)',
            }}>
              {loading ? 'Accediendo…' : 'Entrar →'}
            </button>
          </form>
        )}

        <div style={{textAlign:'center', marginTop:24, fontSize:11.5, color:'#4A5168'}}>
          ¿Sin acceso? Contacta con el administrador.
        </div>
      </div>
    </div>
  )
}
