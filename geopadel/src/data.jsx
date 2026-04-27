// Static data for the Geopadel site
const GEO = {
  name: "Geopadel",
  tagline: "Pádel indoor en Granada",
  phone: "646 059 962",
  phoneRaw: "646059962",
  phoneFijo: "958 597 814",
  phoneFijoRaw: "958597814",
  email: "geopadel@gmail.com",
  address: "C/ Zamora 130, Ogíjares, Granada",
  instagram: "https://www.instagram.com/geopadelgranada/",
  whatsapp: "https://wa.me/34646059962",
  hours: [
    { d: "Lunes — Viernes", h: "09:00 — 14:00 / 17:00 — 23:30" },
    { d: "Sábado — Domingo", h: "09:00 — 14:00 / 17:00 — 22:00" },
  ],
};

const VENTAJAS = [
  { n: "01", t: "Sin depender del clima", d: "Nueve pistas indoor. Llueve, hace calor o sopla viento — tu partido sigue." },
  { n: "02", t: "Horarios amplios", d: "Abrimos de 9 a 23:30. Encuentra un hueco antes del trabajo, en la pausa o de noche." },
  { n: "03", t: "Buen ambiente", d: "Comunidad activa de jugadores, torneos cada mes y bar para el tercer tiempo." },
  { n: "04", t: "Servicio completo", d: "Alquiler, clases, torneos, tienda y bar — todo en un mismo edificio." },
];

const FACILITIES = [
  { src: "assets/court-02.png", tag: "Pabellón principal · 9 pistas", num: "01" },
  { src: "assets/court-01.png", tag: "Cristales panorámicos", num: "02" },
  { src: "assets/court-03.png", tag: "Iluminación LED", num: "03" },
  { src: "assets/shop-apparel-01.png", tag: "Tienda en el club", num: "04" },
];

const COURTS_NOW = [
  { n: 1, status: "free" },
  { n: 2, status: "busy" },
  { n: 3, status: "free" },
  { n: 4, status: "free" },
  { n: 5, status: "busy" },
  { n: 6, status: "free" },
  { n: 7, status: "busy" },
  { n: 8, status: "free" },
  { n: 9, status: "free" },
];

const FEED = [
  { when: "Hoy 21:00", who: "Carlos & Marta", what: "Buscan pareja · pista 4", lvl: "3.5" },
  { when: "Mañ 10:30", who: "Liga interna", what: "Jornada 8 — categoría B", lvl: "2.5—3.5" },
  { when: "Sáb 18:00", who: "Open Geopadel", what: "Cuadro masculino · 32 plazas", lvl: "Open" },
  { when: "Dom 11:00", who: "Clase grupal", what: "Iniciación adultos — 2 plazas", lvl: "Inic." },
];

const CLASES = [
  {
    a: "Adultos",
    h: "Clases de adultos",
    bullets: [
      "Grupos reducidos (máx. 4)",
      "Iniciación, medio y avanzado",
      "Lunes a Viernes · mañana y tarde",
      "Profesor titulado FAP",
    ],
    price: "12€",
    per: "/ clase / persona",
  },
  {
    a: "Niños",
    h: "Escuela infantil",
    bullets: [
      "De 6 a 16 años",
      "1 o 2 días por semana",
      "Material incluido",
      "Torneos internos cada trimestre",
    ],
    price: "35€",
    per: "/ mes (1 día/sem)",
  },
];

const SHOP = [
  { src: "assets/shop-rackets.png", cat: "Palas", t: "Drop Shot · Selección 2026", d: "Más de 20 modelos en exposición. Pruébalas antes de comprar.", badge: "Nuevo" },
  { src: "assets/shop-shoes.png", cat: "Zapatillas", t: "Calzado de pádel", d: "Tallas para hombre, mujer y junior. Modelos para todas las pistas.", badge: null },
  { src: "assets/shop-apparel-02.png", cat: "Ropa", t: "Equipación técnica", d: "Camisetas, faldas y shorts de Drop Shot y otras marcas.", badge: null },
  { src: "assets/shop-apparel-01.png", cat: "Accesorios", t: "Mochilas y paleteros", d: "Lleva tu equipo cómodo y protegido a cada partido.", badge: null },
];

const REVIEWS = [
  { stars: 5, t: "El mejor club de Granada para jugar al pádel. Pistas muy bien cuidadas, ambiente increíble y la gente que trabaja allí es un 10.", who: "Javier M.", when: "hace 2 sem" },
  { stars: 5, t: "Reservar es facilísimo, un mensaje de WhatsApp y listo. Las pistas indoor son muy cómodas, sobre todo en verano.", who: "Ana R.", when: "hace 1 mes" },
  { stars: 5, t: "Mis hijos van a la escuela y están encantados. Los profes son muy buenos y se nota la mejoría partido a partido.", who: "Diego F.", when: "hace 2 meses" },
];

// simple slot grid for booking — 17:00 to 22:30
const TIMES = ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00","20:00","21:00","22:00","22:30"];
// pre-baked busy slots so the grid feels real
const BUSY_TIMES = new Set(["10:00","13:00","18:00","20:00"]);
// per-court busy state at chosen time
const COURT_NAMES = [
  { n: 1, kind: "Cristal panorámico" },
  { n: 2, kind: "Cristal panorámico" },
  { n: 3, kind: "Pista central" },
  { n: 4, kind: "Cristal panorámico" },
  { n: 5, kind: "Pista central" },
  { n: 6, kind: "Cristal panorámico" },
  { n: 7, kind: "Pista lateral" },
  { n: 8, kind: "Pista lateral" },
  { n: 9, kind: "Pista lateral" },
];

const PRECIOS = {
  alquiler: [
    { label: "L — V · Mañana",          rows: [{ h: null,           p: "5€",    per: " / h" }] },
    { label: "L — V · Tarde",           rows: [{ h: "17:00 – 18:30", p: "6€",    per: " / h" },
                                                { h: "18:30 – 23:00", p: "6,50€", per: " / h" }] },
    { label: "Fin de semana\ny festivos", rows: [{ h: "1,5 horas",   p: "6,50€", per: "" },
                                                  { h: "2 horas",     p: "7€",    per: "" }] },
  ],
  clases: [
    { label: "Niños y niñas", p: "64€", per: " / mes",
      bullets: ["Grupos de 4", "2 clases por semana", "L y X, o M y J"] },
  ],
};

Object.assign(window, {
  GEO, VENTAJAS, FACILITIES, COURTS_NOW, FEED, CLASES, SHOP, REVIEWS, TIMES, BUSY_TIMES, COURT_NAMES, PRECIOS,
});
