// All page sections — informativa pura. No datos en tiempo real.
// Toda acción de reservar va a teléfono / WhatsApp.

function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a href="#top" className="brand">
          <Mark />
          <span>GEOPADEL</span>
        </a>
        <nav className="nav-links" aria-label="Navegación principal">
          <a href="#instalaciones">Instalaciones</a>
          <a href="#clases">Clases</a>
          <a href="#tienda">Tienda</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <div className="nav-cta">
          <a className="btn btn-ghost" href={"tel:+34" + GEO.phoneRaw} aria-label={"Llamar al " + GEO.phone}>
            <PhoneGlyph size={14} />
            <span className="sr-only">Llamar</span>
          </a>
          <a className="btn btn-primary nav-wa-btn" href={GEO.whatsapp} target="_blank" rel="noopener">
            <span className="nav-wa-text">Reservar por WhatsApp</span>
            <span className="nav-wa-short">WhatsApp</span>
            <ArrowRight />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <div className="hero-meta">
            <span className="dot" />
            <span>CLUB DE PÁDEL INDOOR · GRANADA</span>
          </div>
          <h1>
            Reserva pista<br />
            y juega <span className="lime">sin complicaciones.</span>
          </h1>
          <p className="hero-sub">
            Pádel indoor en Granada con 9 pistas, horarios amplios y buen ambiente.
            Llueva, haga calor o sople viento — tu partido sigue.
          </p>
          <div className="hero-actions">
            <a className="btn btn-lime btn-lg" href={GEO.whatsapp} target="_blank" rel="noopener">
              <WhatsappGlyph size={16} /> Reservar por WhatsApp
            </a>
            <a className="btn btn-dark-ghost btn-lg" href={"tel:+34" + GEO.phoneRaw}>
              <PhoneGlyph size={16} /> {GEO.phone}
            </a>
          </div>
          <div className="hero-trust">
            <div className="trust-stat">
              <span className="num">9</span>
              <span className="lbl">Pistas indoor</span>
            </div>
            <div className="trust-stat">
              <span className="num">Indoor</span>
              <span className="lbl">Cubierto todo el año</span>
            </div>
          </div>

          <div className="hero-bottom">
            <div className="hero-hours">
              <div className="hero-hours-row">
                <span className="k">L — V</span>
                <span className="v">9:00–14:00 &nbsp;·&nbsp; 17:00–23:30</span>
              </div>
              <div className="hero-hours-row">
                <span className="k">S — D</span>
                <span className="v">9:00–14:00 &nbsp;·&nbsp; 17:00–22:00</span>
              </div>
            </div>
            <a className="hero-insta" href={GEO.instagram} target="_blank" rel="noopener">
              <InstaGlyph size={15} />
              <span>@geopadelgranada — eventos y torneos</span>
              <ArrowRight />
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-photo">
            <img src="assets/court-03.png" alt="Pistas indoor de Geopadel en Ogíjares" />
            <span className="overlay-tag">Pabellón principal · Ogíjares</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    "9 pistas indoor",
    "Abiertos hasta las 23:30",
    "Clases adultos & niños",
    "Tienda en el club",
    "Pádel en Granada",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {doubled.map((it, i) => (
          <span key={i}>
            {it}
            <span className="sep" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Ventajas() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">01 / Por qué Geopadel</span>
            <h2>Pádel sin excusas, todos los días del año.</h2>
          </div>
          <p className="lede">
            Cuatro razones para elegir Geopadel.
            No es magia — son instalaciones, horario y ambiente.
          </p>
        </div>

        <div className="ventajas-grid reveal">
          {VENTAJAS.map((v) => (
            <div className="ventaja" key={v.n}>
              <span className="num">{v.n}</span>
              <h3>{v.t}</h3>
              <p>{v.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Instalaciones() {
  return (
    <section className="section dark" id="instalaciones">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">02 / Instalaciones</span>
            <h2>Nueve pistas indoor.<br />Cero excusas.</h2>
          </div>
          <p className="lede">
            Cristal panorámico, suelo de césped sintético profesional, iluminación LED uniforme
            y graderío para que tus amigos vean el partido.
          </p>
        </div>

        <div className="facility-grid reveal">
          {FACILITIES.map((f, i) => (
            <div key={i} className={"facility-item f-" + (i + 1)}>
              <img src={f.src} alt={f.tag} />
              <span className="num-tag">{f.num}</span>
              <span className="tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clases() {
  return (
    <section className="section" id="clases">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">03 / Clases</span>
            <h2>Mejora rápido.<br />Diviértete más.</h2>
          </div>
          <p className="lede">
            Clases para adultos y niños. Grupos reducidos, plan claro
            y mejora visible partido a partido.
          </p>
        </div>

        <div className="clases-grid reveal">
          {CLASES.map((c) => (
            <div className="clase" key={c.a}>
              <span className="eyebrow">{c.a}</span>
              <h3>{c.h}</h3>
              <ul>
                {c.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className="clase-cta">
                <a className="btn btn-ghost" href={GEO.whatsapp} target="_blank" rel="noopener">
                  Consultar por WhatsApp <ArrowRight />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Precios() {
  return (
    <section className="section" id="precios">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">04 / Precios</span>
            <h2>Sin sorpresas.<br />Paga lo que juegas.</h2>
          </div>
          <p className="lede">
            Sin cuota de socio ni permanencia. Reserva cuando quieras y paga por pista.
          </p>
        </div>

        <div className="precios-grid reveal">
          <div className="precio-bloque">
            <div className="precio-bloque-head">Alquiler de pistas</div>
            {PRECIOS.alquiler.map((b, i) => (
              <div className="precio-fila" key={i}>
                <div className="precio-fila-lbl">{b.label}</div>
                <div className="precio-fila-slots">
                  {b.rows.map((r, j) => (
                    <div className="precio-slot" key={j}>
                      {r.h && <span className="slot-rango">{r.h}</span>}
                      <span className="slot-num">{r.p}{r.per && <span className="slot-per">{r.per}</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="precio-bloque">
            <div className="precio-bloque-head">Clases</div>
            {PRECIOS.clases.map((c, i) => (
              <div className="precio-fila" key={i}>
                <div className="precio-fila-lbl">{c.label}</div>
                <div className="precio-fila-slots">
                  <div className="precio-slot">
                    <span className="slot-num slot-num-lg">{c.p}<span className="slot-per">{c.per}</span></span>
                  </div>
                  <ul className="precio-lista">
                    {c.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="precio-pie reveal">
          <span>Precio por pista · Reservas por teléfono o WhatsApp</span>
          <a className="btn btn-ghost" href={GEO.whatsapp} target="_blank" rel="noopener">
            <WhatsappGlyph size={14} /> Consultar precios <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

function Tienda() {
  return (
    <section className="section" id="tienda" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">05 / Tienda en el club</span>
            <h2>Todo lo que necesitas<br />para jugar.</h2>
          </div>
          <p className="lede">
            Palas, ropa técnica, zapatillas y mochilas — disponible en el club.
            Pruébalas antes de comprar. No vendemos online: pásate y elígelas.
          </p>
        </div>
      </div>
      <div className="wrap reveal">
        <div className="shop-rail">
          {SHOP.map((s, i) => (
            <div className="shop-card" key={i}>
              <div className="photo">
                <img src={s.src} alt={s.t} />
              </div>
              <div className="body">
                <span className="cat">{s.cat}</span>
                <span className="ttl">{s.t}</span>
                <span className="desc">{s.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="reviews">
      <div className="wrap">
        <div className="reviews-head reveal">
          <div>
            <span className="eyebrow">06 / Reseñas</span>
            <h2>Lo dice la gente que juega aquí.</h2>
          </div>
          <a className="btn btn-dark-ghost" href="https://www.google.com/maps/search/?api=1&query=Geopadel+Ogijares" target="_blank" rel="noopener">
            Ver en Google <ArrowRight />
          </a>
        </div>
        <div className="reviews-grid reveal">
          {REVIEWS.map((r, i) => (
            <div className="review" key={i}>
              <div className="stars" aria-label={r.stars + " de 5 estrellas"}>{"★".repeat(r.stars)}</div>
              <p>"{r.t}"</p>
              <div className="who">
                <span>{r.who}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contacto() {
  return (
    <section className="section" id="contacto">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">07 / Contacto</span>
            <h2>Pásate o escríbenos.<br />Estamos en Ogíjares.</h2>
          </div>
          <p className="lede">
            Reserva por teléfono o WhatsApp. Te confirmamos el hueco y listo.
          </p>
        </div>

        <div className="map-block reveal">
          <div className="map-info">
            <h3>{GEO.address}</h3>
            <ul>
              <li><span className="k">Móvil</span><a className="v" href={"tel:+34" + GEO.phoneRaw}>{GEO.phone}</a></li>
              <li><span className="k">Fijo</span><a className="v" href={"tel:+34" + GEO.phoneFijoRaw}>{GEO.phoneFijo}</a></li>
              <li><span className="k">Email</span><a className="v" href={"mailto:" + GEO.email}>{GEO.email}</a></li>
              <li><span className="k">L — V</span><span className="v">9:00 — 14:00 / 17:00 — 23:30</span></li>
              <li><span className="k">S — D</span><span className="v">9:00 — 14:00 / 17:00 — 22:00</span></li>
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <a className="btn btn-lime" href={GEO.whatsapp} target="_blank" rel="noopener">
                <WhatsappGlyph size={16} /> WhatsApp
              </a>
              <a className="btn btn-ghost" href={"tel:+34" + GEO.phoneRaw}>
                <PhoneGlyph size={14} /> Llamar
              </a>
              <a className="btn btn-ghost" href={GEO.instagram} target="_blank" rel="noopener">
                <InstaGlyph size={14} /> Instagram
              </a>
            </div>
          </div>
          <div className="map-img">
            <iframe
              title="Mapa de Geopadel en Ogíjares, Granada"
              src="https://www.google.com/maps?q=Geopadel+Calle+Zamora+130+Ogijares+Granada&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, display: "block", width: "100%", height: "100%", minHeight: 360 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="cta-final">
      <div className="wrap cta-final-inner reveal">
        <h2>
          Coge la pala.<br />
          Reserva tu <em>pista.</em>
        </h2>
        <div className="cta-final-side">
          <a className="btn btn-primary btn-lg" href={GEO.whatsapp} target="_blank" rel="noopener">
            <WhatsappGlyph size={16} /> Reservar por WhatsApp
          </a>
          <a className="btn btn-ghost btn-lg" href={"tel:+34" + GEO.phoneRaw} style={{ borderColor: "var(--ink)" }}>
            <PhoneGlyph size={16} /> Llamar al {GEO.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a href="#top" className="brand" style={{ color: "var(--paper)", marginBottom: 16, display: "inline-flex" }}>
              <Mark />
              <span>GEOPADEL</span>
            </a>
            <p style={{ color: "oklch(0.75 0.012 250)", fontSize: 14, lineHeight: 1.55, maxWidth: 320, margin: "12px 0 0" }}>
              Club de pádel indoor en Granada. 9 pistas, horarios amplios, buen ambiente.
            </p>
          </div>
          <div>
            <h4>Club</h4>
            <ul>
              <li><a href="#instalaciones">Instalaciones</a></li>
              <li><a href="#clases">Clases</a></li>
              <li><a href="#tienda">Tienda</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4>Contacto</h4>
            <ul>
              <li><a href={"tel:+34" + GEO.phoneRaw}>{GEO.phone}</a></li>
              <li><a href={"tel:+34" + GEO.phoneFijoRaw}>{GEO.phoneFijo}</a></li>
              <li><a href={"mailto:" + GEO.email}>{GEO.email}</a></li>
              <li>{GEO.address}</li>
            </ul>
          </div>
          <div>
            <h4>Síguenos</h4>
            <ul>
              <li><a href={GEO.instagram} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <InstaGlyph size={16} /> @geopadelgranada
              </a></li>
              <li><a href={GEO.whatsapp} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <WhatsappGlyph size={16} /> WhatsApp
              </a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bot">
          <span>© 2026 Geopadel</span>
          <span>Hecho en Granada</span>
        </div>
      </div>
    </footer>
  );
}

function FloatActions() {
  return (
    <div className="float-actions">
      <a className="fab lime" href={GEO.whatsapp} target="_blank" rel="noopener" aria-label="Escribir por WhatsApp">
        <WhatsappGlyph size={22} />
      </a>
      <a className="fab" href={"tel:+34" + GEO.phoneRaw} aria-label={"Llamar al " + GEO.phone}>
        <PhoneGlyph size={20} />
      </a>
    </div>
  );
}

function StickyCta() {
  return (
    <div className="sticky-cta">
      <a className="btn btn-ghost" href={"tel:+34" + GEO.phoneRaw} style={{ flex: "0 0 auto", width: 56 }} aria-label={"Llamar al " + GEO.phone}>
        <PhoneGlyph size={16} />
      </a>
      <a className="btn btn-primary" href={GEO.whatsapp} target="_blank" rel="noopener">
        <WhatsappGlyph size={16} /> Reservar por WhatsApp
      </a>
    </div>
  );
}

Object.assign(window, {
  Nav, Hero, Marquee, Ventajas, Instalaciones, Clases, Precios, Tienda, Reviews, Contacto, CtaFinal, Footer, FloatActions, StickyCta,
});
