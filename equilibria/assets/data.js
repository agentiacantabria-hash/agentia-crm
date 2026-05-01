// EQUILIBRIA · Datos compartidos

window.EQ = {
  phone: '684 80 30 11',
  phoneRaw: '+34684803011',
  whatsapp: 'https://wa.me/34684803011',
  address: 'Calle Sierra Don Esteve, 4',
  city: 'El Astillero',
  postal: '39610',
  region: 'Cantabria',

  disciplinas: [
    { id: 'pilates',    name: 'Pilates',      color: '#F9DE73', desc: 'Core, postura y control corporal. La base para entrenar con cabeza.', tag: 'Suelo · 50 min',      spots: 7 },
    { id: 'bodypower',  name: 'Body Power',   color: '#9B7FD4', desc: 'Fuerza y tonificación con pesas, discos y barras. Progresión y buen ritmo.', tag: 'Fuerza · 50 min',    spots: 7 },
    { id: 'hiit',       name: 'HIIT',         color: '#78CEC9', desc: 'Intervalos cortos e intensos. Cardio, calorías y sensación de haberlo dado todo.', tag: 'Cardio · 40 min', spots: 7 },
    { id: 'gap',        name: 'GAP',          color: '#A2C6E6', desc: 'Glúteos, abdominales y piernas. Trabajo directo y bien guiado.', tag: 'Localizado · 50 min',              spots: 7 },
    { id: 'trx',        name: 'TRX',          color: '#F0924F', desc: 'Entrenamiento en suspensión con tu propio peso. Core, estabilidad y control.', tag: 'Suspensión · 50 min', spots: 5 },
    { id: 'funcional',  name: 'Funcional',    color: '#A9DE84', desc: 'Fuerza, cardio y coordinación. Para ponerte en forma para la vida real.', tag: 'Completo · 50 min',       spots: 7 },
    { id: 'espalda',    name: 'Espalda Sana', color: '#F4BDD2', desc: 'Fuerza y movilidad para cuidar la espalda, mejorar la postura y prevenir molestias.', tag: 'Postura · 50 min', spots: 7 },
  ],

  // Horario real extraído de las imágenes
  horarioManana: [
    // hora,        L,           M,           X,          J,           V
    ['09:10', 'pilates',   'pilates',   'gap',      'pilates',   'espalda'],
    ['10:00', 'bodypower', 'bodypower', 'trx',      'bodypower', 'pilates'],
    ['11:00', 'gap',       'espalda',   'hiit',     'trx',       'gap'],
  ],
  horarioTarde: [
    ['16:00', 'espalda',   'gap',       'pilates',  'funcional', 'bodypower'],
    ['17:00', 'gap',       'funcional', 'gap',      'gap',       'funcional'],
    ['17:00b','hiit',      'trx',       'bodypower','pilates',   'bodypower'],
    ['18:00', 'pilates',   'bodypower', 'espalda',  'pilates',   'pilates'],
    ['18:00b','trx',       'gap',       'pilates',  'hiit',      'trx'],
    ['19:00', 'bodypower', 'pilates',   'bodypower','bodypower', 'gap'],
    ['19:00b','gap',       'bodypower', 'gap',      'trx',       'hiit'],
    ['20:00', 'hiit',      'bodypower', 'hiit',     'bodypower', 'bodypower'],
    ['20:00b','trx',       'gap',       'trx',      'pilates',   'trx'],
    ['21:00', 'bodypower', 'pilates',   'bodypower','trx',       null],
  ],

  precios: {
    mensual: [
      { freq: '1 clase/semana',  price: 40 },
      { freq: '2 clases/semana', price: 60 },
      { freq: '3 clases/semana', price: 80 },
    ],
    trimestral: [
      { freq: '1 clase/semana',  before: 120, price: 100, save: 20 },
      { freq: '2 clases/semana', before: 180, price: 150, save: 30 },
      { freq: '3 clases/semana', before: 240, price: 200, save: 40 },
    ],
  },
};

// ─────── Helpers compartidos ───────
window.EQ.findDisc = function(id){ return window.EQ.disciplinas.find(d => d.id === id); };

// Reveal on scroll
window.addEventListener('DOMContentLoaded', () => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  const map = { 'index.html': 'home', '': 'home', 'disciplinas.html': 'disciplinas', 'horarios.html': 'horarios', 'precios.html': 'precios', 'contacto.html': 'contacto' };
  const active = map[path];
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.dataset.page === active) a.classList.add('active');
  });

  // Mobile drawer wire-up (delegated, runs after nav is injected)
  const wireDrawer = () => {
    const burger = document.getElementById('nav-burger');
    const drawer = document.getElementById('nav-drawer');
    if (!burger || !drawer || burger.dataset.wired) return;
    burger.dataset.wired = '1';
    const close = () => {
      burger.classList.remove('open');
      drawer.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    const open = () => {
      burger.classList.add('open');
      drawer.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    burger.addEventListener('click', () => {
      drawer.classList.contains('open') ? close() : open();
    });
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) close();
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // Mark active on drawer too
    drawer.querySelectorAll('a[data-page]').forEach(a => {
      if (a.dataset.page === active) a.classList.add('active');
    });
  };
  // Try now and after a short delay (in case nav is fetched async)
  wireDrawer();
  setTimeout(wireDrawer, 100);
  setTimeout(wireDrawer, 400);
  setTimeout(wireDrawer, 1000);
});
