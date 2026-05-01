/* ─────────────────────────────────────────────────────────────
   SCATTER ON LEAVE
   Aplica un efecto de "desarmado" letra a letra a los titulares
   grandes y frases destacadas cuando salen por arriba del viewport
   al hacer scroll hacia abajo. Al volver a subir, se reconstruyen.

   Selectores: titulares display + frases destacadas.
   El hero principal (h1.hero-title) tiene su propio efecto en
   index.html — lo excluimos aquí.
   ───────────────────────────────────────────────────────────── */

(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SELECTOR = [
    'h2.display-l',
    'h2.quote-text',
    'section.cta-final h2',
    'section.end-cta h2',
    '.scatter-target',
    '.manifest-line',
  ].join(', ');

  // Helper: split del contenido del elemento en spans .scatter-char.
  // Cada palabra queda envuelta en .scatter-word (inline-block) para que
  // el navegador rompa línea ENTRE palabras, nunca dentro de una.
  function splitNode(root) {
    if (root.dataset.scatterDone) return;
    root.dataset.scatterDone = '1';

    let charIdx = 0;
    const out = [];
    let wordBuf = [];

    function flushWord() {
      if (!wordBuf.length) return;
      out.push(`<span class="scatter-word">${wordBuf.join('')}</span>`);
      wordBuf = [];
    }

    function walk(node, isAccent) {
      if (node.nodeType === 3) {
        for (const ch of node.textContent) {
          if (ch === '\n' || ch === '\r') continue;
          if (ch === ' ') {
            flushWord();
            out.push(' ');
          } else {
            const cls = 'scatter-char' + (isAccent ? ' accent' : '');
            const safe = ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            wordBuf.push(`<span class="${cls}" data-i="${charIdx++}">${safe}</span>`);
          }
        }
      } else if (node.nodeType === 1) {
        if (node.tagName === 'BR') { flushWord(); out.push('<br>'); return; }
        const accent = node.classList && node.classList.contains('accent');
        for (const child of node.childNodes) walk(child, accent || isAccent);
      }
    }

    for (const child of root.childNodes) walk(child, false);
    flushWord();
    root.innerHTML = out.join('');
  }

  // Un seed pseudo-aleatorio estable por índice
  function rand(i) {
    return ((i * 9301 + 49297) % 233280) / 233280;
  }

  // Aplica el progreso de "scatter" (0 = intacto, 1 = totalmente desarmado)
  function applyProgress(el, p) {
    if (p <= 0.001) {
      el.style.opacity = '';
      // Reset rápido: si las letras tienen transform, lo borramos
      if (el.dataset.scatterActive === '1') {
        const chars = el.querySelectorAll('.scatter-char');
        chars.forEach(c => {
          c.style.transform = '';
          c.style.opacity = '';
        });
        el.dataset.scatterActive = '0';
      }
      return;
    }
    el.dataset.scatterActive = '1';
    const chars = el.querySelectorAll('.scatter-char');
    const total = chars.length;
    chars.forEach((c, i) => {
      const stagger = i / Math.max(1, total - 1);
      // Cascada: las primeras letras caen antes
      const lp = Math.max(0, Math.min(1, (p - stagger * 0.35) / 0.65));
      if (lp <= 0) {
        c.style.transform = '';
        c.style.opacity = '';
      } else {
        const seed = rand(i);
        const dx = (seed - 0.5) * 60 * lp;
        const dy = 30 + lp * 180;
        const rot = (seed - 0.5) * 50 * lp;
        const op = 1 - lp;
        c.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;
        c.style.opacity = op.toFixed(3);
      }
    });
  }

  let elements = [];
  let ticking = false;

  function refreshList() {
    elements = Array.from(document.querySelectorAll(SELECTOR))
      // Excluir el hero principal — tiene su propio efecto controlado
      .filter(el => !el.classList.contains('hero-title'));
    elements.forEach(splitNode);
  }

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight;
      elements.forEach(el => {
        const r = el.getBoundingClientRect();
        // Cuando el bottom del elemento empieza a salir por arriba,
        // arrancamos el scatter. p=0 cuando bottom está en 25% del viewport,
        // p=1 cuando ya ha salido del todo (bottom = -altura).
        const startAt = vh * 0.28; // empieza cuando el bottom está al 28% del viewport (casi saliendo por arriba)
        const endAt = -r.height * 0.2; // termina cuando casi ha salido
        const cur = r.bottom;
        const p = Math.max(0, Math.min(1, (startAt - cur) / (startAt - endAt)));
        applyProgress(el, p);
      });
      ticking = false;
    });
  }

  function init() {
    refreshList();
    onScrollOrResize();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', () => {
      // Re-medir tras layout
      onScrollOrResize();
    }, { passive: true });
    // Por si se inyecta contenido tarde (footer, marquee, etc.)
    setTimeout(() => { refreshList(); onScrollOrResize(); }, 600);
    setTimeout(() => { refreshList(); onScrollOrResize(); }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
