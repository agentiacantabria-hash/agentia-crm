export const LEADS = [
  { id:'l1', empresa:'Clínica Marbella', sector:'Salud', ciudad:'Málaga', responsable:'LP', servicio:'Web + Chatbot', estado:'En Revisión', next:'Llamar el 26 abr', monto:3800, origen:'Instagram', temp:'hot' },
  { id:'l2', empresa:'Aceite del Sur', sector:'Alimentación', ciudad:'Sevilla', responsable:'AR', servicio:'Automatización ventas', estado:'Cliente Interesado', next:'Enviar caso de éxito', monto:2400, origen:'Referido', temp:'warm' },
  { id:'l3', empresa:'Estudio Nácar', sector:'Arquitectura', ciudad:'Valencia', responsable:'LP', servicio:'Web premium', estado:'Cliente Potencial', next:'Reunión miércoles', monto:5200, origen:'LinkedIn', temp:'warm' },
  { id:'l4', empresa:'Kumō Sushi Bar', sector:'Restauración', ciudad:'Madrid', responsable:'AR', servicio:'Chatbot reservas', estado:'Cliente Nuevo', next:'Primer contacto', monto:1600, origen:'Formulario', temp:'cold' },
  { id:'l5', empresa:'Gym Pulse', sector:'Fitness', ciudad:'Barcelona', responsable:'LP', servicio:'Mantenimiento web', estado:'Cliente Potencial', next:'Recordatorio 30 abr', monto:900, origen:'Instagram', temp:'warm' },
  { id:'l6', empresa:'Notaría Vega', sector:'Legal', ciudad:'Madrid', responsable:'LP', servicio:'Web corporativa', estado:'En Revisión', next:'Seguimiento viernes', monto:4100, origen:'Referido', temp:'hot' },
  { id:'l7', empresa:'Bodegas Altura', sector:'Vinos', ciudad:'La Rioja', responsable:'AR', servicio:'E-commerce', estado:'Cobrado', next:'—', monto:7200, origen:'Evento', temp:'won' },
  { id:'l8', empresa:'Dental Luna', sector:'Salud', ciudad:'Granada', responsable:'AR', servicio:'Chatbot citas', estado:'Denegado', next:'—', monto:0, origen:'Formulario', temp:'lost' },
]

export const CLIENTES = [
  { id:'c1', nombre:'Bodegas Altura', servicio:'E-commerce + SEO', importe:7200, estado:'En curso', pagado:true, ajustes:2, responsable:'AR', since:'Feb 2026' },
  { id:'c2', nombre:'Óptica Horizonte', servicio:'Web + Chatbot', importe:3400, estado:'Pagado · ajustes', pagado:true, ajustes:3, responsable:'LP', since:'Ene 2026' },
  { id:'c3', nombre:'Taller Mecánico Ronda', servicio:'Automatización WhatsApp', importe:1800, estado:'En revisión', pagado:false, ajustes:0, responsable:'LP', since:'Mar 2026' },
  { id:'c4', nombre:'Inmobiliaria Litoral', servicio:'Web premium', importe:5400, estado:'Cerrado', pagado:true, ajustes:0, responsable:'AR', since:'Dic 2025' },
  { id:'c5', nombre:'Clínica Dental Nova', servicio:'Mantenimiento mensual', importe:240, estado:'Recurrente', pagado:true, ajustes:0, responsable:'LP', since:'Oct 2025' },
  { id:'c6', nombre:'Restaurante Marinero', servicio:'Chatbot reservas', importe:1600, estado:'Pagado · ajustes', pagado:true, ajustes:1, responsable:'AR', since:'Feb 2026' },
  { id:'c7', nombre:'Academia Logos', servicio:'Web + Captación', importe:2900, estado:'En curso', pagado:false, ajustes:0, responsable:'LP', since:'Abr 2026' },
]

export const TASKS = [
  { id:'t1', title:'Llamar a Clínica Marbella para cerrar propuesta', cliente:'Clínica Marbella', when_group:'hoy', time:'11:30', prio:'alta', resp:'LP', done:false, tag:'Comercial' },
  { id:'t2', title:'Revisar ajustes pendientes de Óptica Horizonte', cliente:'Óptica Horizonte', when_group:'hoy', time:'14:00', prio:'alta', resp:'LP', done:false, tag:'Entrega' },
  { id:'t3', title:'Enviar caso de éxito a Aceite del Sur', cliente:'Aceite del Sur', when_group:'hoy', time:'16:00', prio:'media', resp:'AR', done:false, tag:'Comercial' },
  { id:'t4', title:'Publicar post para Gym Pulse', cliente:'Gym Pulse', when_group:'hoy', time:'—', prio:'baja', resp:'LP', done:true, tag:'Operativo' },
  { id:'t5', title:'Reunión con Estudio Nácar', cliente:'Estudio Nácar', when_group:'mañana', time:'10:00', prio:'alta', resp:'LP', done:false, tag:'Comercial' },
  { id:'t6', title:'Cobrar segundo pago — Inmobiliaria Litoral', cliente:'Inmobiliaria Litoral', when_group:'mañana', time:'12:00', prio:'media', resp:'AR', done:false, tag:'Finanzas' },
  { id:'t7', title:'Enviar ajuste de colores — Restaurante Marinero', cliente:'Restaurante Marinero', when_group:'vencida', time:'Ayer', prio:'alta', resp:'AR', done:false, tag:'Entrega' },
  { id:'t8', title:'Configurar dominio Academia Logos', cliente:'Academia Logos', when_group:'semana', time:'Vie', prio:'media', resp:'LP', done:false, tag:'Operativo' },
]

export const PROYECTOS = [
  { id:'p1', cliente:'Bodegas Altura', servicio:'E-commerce + SEO', estado:'En curso', progreso:62, ajustes:2, pago:'Parcial 50%', resp:'AR' },
  { id:'p2', cliente:'Óptica Horizonte', servicio:'Web + Chatbot', estado:'Pagado · ajustes', progreso:88, ajustes:3, pago:'Pagado', resp:'LP' },
  { id:'p3', cliente:'Taller Ronda', servicio:'Automatización WA', estado:'En revisión', progreso:75, ajustes:1, pago:'Pendiente', resp:'LP' },
  { id:'p4', cliente:'Academia Logos', servicio:'Web + Captación', estado:'En curso', progreso:35, ajustes:0, pago:'Parcial 40%', resp:'LP' },
  { id:'p5', cliente:'Restaurante Marinero', servicio:'Chatbot reservas', estado:'Pagado · ajustes', progreso:95, ajustes:1, pago:'Pagado', resp:'AR' },
  { id:'p6', cliente:'Inmobiliaria Litoral', servicio:'Web premium', estado:'Cerrado', progreso:100, ajustes:0, pago:'Pagado', resp:'AR' },
]

export const COBROS = [
  { id:'cb1', cliente:'Taller Ronda',    monto:1800, vence:'18 abr', vencida:true,  pagado:false },
  { id:'cb2', cliente:'Academia Logos',  monto:1740, vence:'28 abr', vencida:false, pagado:false },
  { id:'cb3', cliente:'Bodegas Altura',  monto:1760, vence:'5 may',  vencida:false, pagado:false },
]

export const GASTOS = [
  { id:'g1', concepto:'OpenAI — API', tipo:'IA', monto:128, recurrente:true, fecha:'15 abr' },
  { id:'g2', concepto:'Anthropic — Claude', tipo:'IA', monto:85, recurrente:true, fecha:'12 abr' },
  { id:'g3', concepto:'Vercel Pro', tipo:'Infra', monto:20, recurrente:true, fecha:'8 abr' },
  { id:'g4', concepto:'Figma equipo', tipo:'Herramienta', monto:30, recurrente:true, fecha:'5 abr' },
  { id:'g5', concepto:'Dominio .com cliente', tipo:'Infra', monto:18, recurrente:false, fecha:'3 abr' },
  { id:'g6', concepto:'Freelance copywriter', tipo:'Personas', monto:320, recurrente:false, fecha:'10 abr' },
]

export const STATE_COLORS = {
  'Cliente Nuevo':      { chip:'gray',   color:'#6B7590' },
  'Cliente Potencial':  { chip:'blue',   color:'#4F8BFF' },
  'Cliente Interesado': { chip:'violet', color:'#9A7BFF' },
  'En Revisión':        { chip:'amber',  color:'#FFB547' },
  'Señal pagada':       { chip:'teal',   color:'#2EC4B6' },
  'Cobrado':            { chip:'green',  color:'#3ECF8E' },
  'Denegado':           { chip:'red',    color:'#FF5A6A' },
}

// Constantes de etapas — usar siempre estas, nunca strings literales
export const STAGE = {
  NUEVO:      'Cliente Nuevo',
  POTENCIAL:  'Cliente Potencial',
  INTERESADO: 'Cliente Interesado',
  EN_REVISION:'En Revisión',
  SEÑAL:      'Señal pagada',
  COBRADO:    'Cobrado',
  DENEGADO:   'Denegado',
}
export const STAGES_CLOSED  = [STAGE.COBRADO, STAGE.DENEGADO]
export const STAGES_ACTIVE  = [STAGE.NUEVO, STAGE.POTENCIAL, STAGE.INTERESADO, STAGE.EN_REVISION, STAGE.SEÑAL]
// Etapas que cuentan como valor potencial real (Interesado en adelante)
export const STAGES_VALOR   = [STAGE.INTERESADO, STAGE.EN_REVISION, STAGE.SEÑAL]

export const PIPELINE_COLS = [STAGE.NUEVO, STAGE.POTENCIAL, STAGE.INTERESADO, STAGE.EN_REVISION, STAGE.SEÑAL, STAGE.COBRADO, STAGE.DENEGADO]

export const eur = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 0 })
