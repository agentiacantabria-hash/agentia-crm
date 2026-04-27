// App root: real CTAs only — no fake booking flows, no fake live data.
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "lime",
  "marquee": true
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  lime:    "oklch(0.88 0.18 110)",
  orange:  "oklch(0.78 0.18 55)",
  cyan:    "oklch(0.85 0.13 200)",
  white:   "oklch(0.97 0.01 100)",
};

function App() {
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  useReveal();

  useEffect(() => {
    document.documentElement.style.setProperty("--lime", ACCENT_PRESETS[tweaks.accent] || ACCENT_PRESETS.lime);
  }, [tweaks.accent]);

  return (
    <>
      <Nav />
      <Hero />
      {tweaks.marquee && <Marquee />}
      <Ventajas />
      <Instalaciones />
      <Clases />
      <Precios />
      <Tienda />
      <Reviews />
      <Contacto />
      <CtaFinal />
      <Footer />

      <FloatActions />
      <StickyCta />

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Aspecto">
            <window.TweakRadio
              label="Color de acento"
              value={tweaks.accent}
              onChange={(v) => setTweak("accent", v)}
              options={[
                { value: "lime", label: "Lima" },
                { value: "orange", label: "Naranja" },
                { value: "cyan", label: "Cian" },
                { value: "white", label: "Blanco" },
              ]}
            />
            <window.TweakToggle
              label="Marquee de servicios"
              value={tweaks.marquee}
              onChange={(v) => setTweak("marquee", v)}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
