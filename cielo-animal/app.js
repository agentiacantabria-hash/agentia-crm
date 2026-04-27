// ============ NAV SCROLL ============
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 12);
});

// ============ MOBILE MENU ============
const burger = document.getElementById('burger');
const navMobile = document.getElementById('navMobile');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navMobile.classList.toggle('open');
});
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  burger.classList.remove('open');
  navMobile.classList.remove('open');
}));

// ============ SERVICES DATA ============
const services = {
  guarderia: {
    eyebrow: '01 · Guardería de día',
    title: 'Un espacio donde <em>jugar y descansar</em>.',
    lead: 'Tu perro pasa el día con nosotros: juega, socializa, descansa y vuelve a casa cansado y feliz. Ideal si trabajas fuera o si quieres que mejore su socialización.',
    offers: ['Jornadas de media o día completo', 'Grupos pequeños separados por tamaño y carácter', 'Juego guiado, rutinas de descanso y cariño', 'Opciones de paseo exterior complementario'],
    pitch: 'Cada perro es diferente. En la valoración inicial escuchamos cómo es el tuyo y lo integramos a su ritmo.',
    phone: '655 93 32 33'
  },
  hotel: {
    eyebrow: '02 · Hotel canino, felino y roedores',
    title: 'Como en casa, <em>cuando tú no estás</em>.',
    lead: 'Alojamiento con supervisión 24 horas para perros, gatos y pequeños roedores (conejos, cobayas, hámsters). Cada mascota tiene su espacio, sus rutinas y su tiempo de atención.',
    offers: ['Habitaciones individuales o para familias multi-mascota', 'Zona felina independiente, tranquila y segura', 'Espacio especializado para roedores', 'Actualizaciones por WhatsApp durante la estancia'],
    pitch: 'Respetamos la dieta y rutina que nos indiques. Si tu mascota tiene medicación, la administramos con el protocolo que acordemos con tu veterinario.',
    phone: '655 93 32 33'
  },
  peluqueria: {
    eyebrow: '03 · Peluquería',
    title: 'Baño, corte y <em>mimos incluidos</em>.',
    lead: 'Peluquería adaptada al pelaje, la piel y el carácter de cada mascota. Productos suaves, manos pacientes y tiempos calmados.',
    offers: ['Baño completo con productos adaptados', 'Corte de pelo según raza y preferencia', 'Corte de uñas, limpieza de oídos y glándulas', 'Tratamientos específicos para pieles sensibles'],
    pitch: 'Si tu mascota está nerviosa o es su primera vez, dedicamos más tiempo a que se sienta cómoda antes de empezar.',
    phone: '655 93 32 33'
  },
  ozonoterapia: {
    eyebrow: '04 · Ozonoterapia',
    title: 'Un tratamiento <em>natural e indoloro</em>.',
    lead: 'La ozonoterapia utiliza ozono medicinal para aliviar problemas de piel, pelaje, articulaciones y sistema inmunitario. Indicada especialmente para mascotas mayores o con pieles sensibles.',
    offers: ['Tratamiento de dermatitis y alergias', 'Apoyo en recuperación post-operatoria', 'Mejora del pelaje y la piel', 'Complemento natural para mascotas senior'],
    pitch: 'Valoramos cada caso con tu veterinario antes de empezar. No reemplaza un tratamiento médico, lo acompaña.',
    phone: '655 93 32 33'
  },
  fisioterapia: {
    eyebrow: '05 · Fisioterapia',
    title: 'Movilidad y <em>calidad de vida</em>.',
    lead: 'Rehabilitación física y ejercicios terapéuticos para mascotas operadas, con lesiones o con la movilidad reducida por la edad.',
    offers: ['Plan de rehabilitación post-quirúrgica', 'Terapia para displasia, artrosis y lesiones', 'Ejercicios de movilidad para perros senior', 'Masaje y técnicas manuales de liberación'],
    pitch: 'Diseñamos sesiones personalizadas en coordinación con tu veterinario. Avanzamos al ritmo que marca tu mascota.',
    phone: '655 93 32 33'
  },
  adios: {
    eyebrow: '06 · Último adiós',
    title: 'Te acompañamos en la <em>despedida</em>.',
    lead: 'Sabemos que este momento es duro. Estamos para facilitarte el proceso con respeto, cercanía y cuidado. Sin prisas, sin protocolos fríos.',
    offers: ['Cremación individualizada o colectiva', 'Recogida cuando es necesaria', 'Gestión completa del proceso', 'Entrega respetuosa y cuidada'],
    pitch: '“No es solo un servicio. Es acompañarte en uno de los momentos más importantes con tu mascota.”',
    phone: '655 93 32 33'
  }
};

// ============ MODAL ============
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
function openModal(key) {
  const s = services[key]; if (!s) return;
  modalContent.innerHTML = `
    <div class="modal-eyebrow">${s.eyebrow}</div>
    <h2>${s.title}</h2>
    <p>${s.lead}</p>
    <h4>Qué incluye</h4>
    <ul>${s.offers.map(o => `<li>${o}</li>`).join('')}</ul>
    <h4>Nuestro enfoque</h4>
    <p style="font-family:var(--serif); font-style:italic; color:var(--sky-700);">${s.pitch}</p>
    <div class="modal-ctas">
      <a href="#contacto" class="btn btn-primary" data-close>Reservar valoración</a>
      <a href="tel:+34655933233" class="btn btn-ghost">Llamar al ${s.phone}</a>
    </div>
  `;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() { modal.classList.remove('open'); document.body.style.overflow = ''; }

document.querySelectorAll('[data-open]').forEach(b => {
  b.addEventListener('click', e => {
    e.stopPropagation();
    openModal(b.dataset.open);
  });
});
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('click', () => openModal(card.dataset.service));
});
modal.addEventListener('click', e => {
  if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeLightbox(); } });

// ============ LIGHTBOX ============
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
document.querySelectorAll('[data-lightbox]').forEach(el => {
  el.addEventListener('click', () => {
    lightboxImg.src = el.dataset.lightbox;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});
function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = ''; }
lightbox.addEventListener('click', e => {
  if (e.target === lightbox || e.target.hasAttribute('data-close-lb')) closeLightbox();
});

// ============ REVIEWS ============
const reviews = [
  { name:'Laura M.', initials:'LM', meta:'Cliente desde 2024 · Guardería', text:'Mi Luna va los martes y jueves y vuelve feliz, cansada y socializada. Javier y su equipo la tratan como si fuera suya. No puedo imaginar un sitio mejor.', stars:5 },
  { name:'Carlos R.', initials:'CR', meta:'Hotel canino · 2 estancias', text:'Dejamos a nuestro Max una semana y nos mandaron fotos todos los días. Cuando volvimos, el perro estaba tan a gusto que no quería irse.', stars:5 },
  { name:'Isabel G.', initials:'IG', meta:'Fisioterapia · Perro senior', text:'Mi perrita tiene 13 años y artrosis. Con las sesiones de fisio ha recuperado ganas de moverse. Son profesionales y tienen una paciencia enorme.', stars:5 },
  { name:'Alberto P.', initials:'AP', meta:'Peluquería · Mensual', text:'Siempre salen perfectos, huelen de maravilla y no sufren. Mi caniche, que antes odiaba la peluquería, ahora entra solo.', stars:5 },
  { name:'María H.', initials:'MH', meta:'Ozonoterapia · Dermatitis', text:'Probamos la ozonoterapia para la dermatitis de nuestro labrador y ha sido un cambio enorme. Muy recomendable el trato y el equipo.', stars:5 },
  { name:'Sergio V.', initials:'SV', meta:'Último adiós · 2025', text:'Cuando se fue nuestra Nala, el trato de Cielo Animal fue impecable. Cercanía, respeto y cero prisas. Gracias por acompañarnos.', stars:5 }
];
const reviewsGrid = document.getElementById('reviewsGrid');
reviewsGrid.innerHTML = reviews.map(r => `
  <article class="review-card">
    <div class="review-mark">"</div>
    <blockquote>${r.text}</blockquote>
    <div class="review-foot">
      <div class="review-avatar">${r.initials}</div>
      <div class="review-meta">
        <strong>${r.name}</strong>
        <span>${r.meta}</span>
      </div>
      <div class="review-stars">${'★'.repeat(r.stars)}</div>
    </div>
  </article>
`).join('');

// ============ FAQ ============
const faqs = [
  { q:'¿Cómo funciona la primera visita?', a:'Nos contáis sobre vuestra mascota, visitamos juntos las instalaciones, y hacemos una valoración para ver cómo se siente. Sin compromiso y totalmente gratuita.' },
  { q:'¿Qué necesita mi mascota para quedarse?', a:'La cartilla de vacunación al día, antiparasitación interna y externa recientes, y si toma alguna medicación, las indicaciones de tu veterinario. Si quieres traer su cama o juguete favorito, mejor que mejor.' },
  { q:'¿Aceptáis gatos y pequeños roedores?', a:'Sí. Tenemos una zona felina independiente y tranquila, y un espacio específico para roedores. Cada especie tiene sus necesidades y las respetamos.' },
  { q:'¿Cómo me comunicáis cómo está durante el hotel?', a:'Durante la estancia te mandamos fotos y actualizaciones por WhatsApp. Si tienes cualquier duda o necesitas saber algo concreto, nos lo pides cuando quieras.' },
  { q:'¿Qué precios tenéis?', a:'Cada servicio tiene tarifas distintas y adaptamos según las necesidades. Escríbenos por el formulario o llámanos y te enviamos la tarifa actualizada al momento.' },
  { q:'¿Tenéis veterinario?', a:'Trabajamos en coordinación con veterinarios y especialistas externos. Si tu mascota necesita atención veterinaria durante su estancia, avisamos y actuamos siempre con tu consentimiento.' }
];
const faqList = document.getElementById('faqList');
faqList.innerHTML = faqs.map(f => `
  <div class="faq-item">
    <button>
      <span>${f.q}</span>
      <span class="faq-item-icon">+</span>
    </button>
    <div class="faq-item-body"><div>${f.a}</div></div>
  </div>
`).join('');
faqList.querySelectorAll('.faq-item button').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.classList.toggle('open');
  });
});

// ============ CONTACT FORM ============
const form = document.getElementById('contactForm');
const toast = document.getElementById('toast');
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = (fd.get('name') || '').toString().trim();
  const phone = (fd.get('phone') || '').toString().trim();
  const email = (fd.get('email') || '').toString().trim();
  const service = (fd.get('service') || '').toString().trim();
  const message = (fd.get('message') || '').toString().trim();

  if (!name || !phone || !email) {
    toast.textContent = 'Por favor, completa los campos obligatorios.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
    return;
  }

  const lines = [
    '¡Hola Cielo Animal! 👋',
    '',
    `*Nombre:* ${name}`,
    `*Teléfono:* ${phone}`,
    `*Email:* ${email}`,
    `*Servicio de interés:* ${service}`,
  ];
  if (message) { lines.push('', `*Mensaje:*`, message); }
  lines.push('', '— Enviado desde cieloanimal.es');

  const text = encodeURIComponent(lines.join('\n'));
  const waUrl = `https://wa.me/34655933233?text=${text}`;

  toast.textContent = '✓ Abriendo WhatsApp…';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);

  window.open(waUrl, '_blank', 'noopener');
});

// ============ REVEAL ON SCROLL ============
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: .12 });
document.querySelectorAll('section > .container > *, .service-card, .facility-tile, .review-card, .process-steps li, .feat').forEach(el => {
  el.classList.add('reveal');
  obs.observe(el);
});

// ============ TWEAKS ============
const TWEAKS = /*EDITMODE-BEGIN*/{
  "accentHue": 210,
  "heroTone": "claro",
  "showMarquee": true
}/*EDITMODE-END*/;

let tweakPanel;
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === '__activate_edit_mode') buildTweakPanel();
  if (d.type === '__deactivate_edit_mode' && tweakPanel) { tweakPanel.remove(); tweakPanel = null; }
});

function applyTweaks(t) {
  document.documentElement.style.setProperty('--sky-700', `oklch(0.40 0.07 ${t.accentHue})`);
  document.documentElement.style.setProperty('--sky-500', `oklch(0.60 0.08 ${t.accentHue})`);
  document.documentElement.style.setProperty('--sky-400', `oklch(0.72 0.06 ${t.accentHue})`);
  document.documentElement.style.setProperty('--sky-300', `oklch(0.82 0.04 ${t.accentHue})`);
  document.documentElement.style.setProperty('--sky-200', `oklch(0.90 0.03 ${t.accentHue})`);
  document.documentElement.style.setProperty('--sky-50', `oklch(0.97 0.01 ${t.accentHue})`);
  document.body.style.background = t.heroTone === 'cálido' ? '#f6f1e8' : 'var(--cream)';
  const m = document.querySelector('.marquee');
  if (m) m.style.display = t.showMarquee ? '' : 'none';
}
applyTweaks(TWEAKS);

function buildTweakPanel() {
  if (tweakPanel) return;
  tweakPanel = document.createElement('div');
  tweakPanel.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:90;background:white;padding:20px 24px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:Inter,sans-serif;min-width:280px;';
  tweakPanel.innerHTML = `
    <h4 style="font-family:Fraunces,serif;font-size:18px;margin:0 0 16px;color:#1e3a5f;">Tweaks</h4>
    <label style="display:block;font-size:12px;color:#7a8499;margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em;">Tono del color</label>
    <input type="range" id="tw-hue" min="180" max="260" step="5" value="${TWEAKS.accentHue}" style="width:100%;margin-bottom:16px;"/>
    <label style="display:block;font-size:12px;color:#7a8499;margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em;">Fondo</label>
    <select id="tw-tone" style="width:100%;padding:8px;border-radius:8px;border:1px solid #e6e0d4;margin-bottom:16px;">
      <option value="claro" ${TWEAKS.heroTone === 'claro' ? 'selected' : ''}>Claro (crema)</option>
      <option value="cálido" ${TWEAKS.heroTone === 'cálido' ? 'selected' : ''}>Cálido</option>
    </select>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#4a5670;">
      <input type="checkbox" id="tw-marquee" ${TWEAKS.showMarquee ? 'checked' : ''}/>
      Mostrar marquesina de servicios
    </label>
  `;
  document.body.appendChild(tweakPanel);
  tweakPanel.querySelector('#tw-hue').addEventListener('input', (e) => {
    TWEAKS.accentHue = +e.target.value; applyTweaks(TWEAKS);
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ accentHue: TWEAKS.accentHue } }, '*');
  });
  tweakPanel.querySelector('#tw-tone').addEventListener('change', (e) => {
    TWEAKS.heroTone = e.target.value; applyTweaks(TWEAKS);
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ heroTone: TWEAKS.heroTone } }, '*');
  });
  tweakPanel.querySelector('#tw-marquee').addEventListener('change', (e) => {
    TWEAKS.showMarquee = e.target.checked; applyTweaks(TWEAKS);
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ showMarquee: TWEAKS.showMarquee } }, '*');
  });
}

window.parent.postMessage({ type:'__edit_mode_available' }, '*');
