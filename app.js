// Gabrielly Centro de Beleza — prévia conceitual (Bruno Luque).
// Motion 11.11.17 (vanilla, global `Motion`) para coreografia e cenas ligadas à rolagem; Lenis só na roda do mouse.
// Sem este arquivo a página continua completa: os estados escondidos só existem depois de `.motion-ready`.
//
// Camadas de motion
//  • Assinatura: anel de texto do selo girando devagar + inclinação por mola no ponteiro (hero);
//    cena presa "Um dia no Gabrielly" — o sol percorre o mostrador 7h→21h e o fundo vai da manhã à noite.
//  • Narrativa: (1) a noite da cena continua nos Cuidados; (2) o arco rosa do Espaço se abre como um amanhecer
//    e o círculo menor rola tangente ao maior; (3) a semana de funcionamento se desenha barra a barra.
//  • Interface: cápsula elástica das abas, pressão dos botões, brilho que segue o ponteiro, barra de agendamento.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const deskMQ = matchMedia('(min-width: 900px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* tokens (espelham style.css) */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.14, ctrl: 0.2, panel: 0.32 };
const SPRING_PILL = { type: 'spring', bounce: 0.2, duration: 0.45 };
const SPRING_TILT = { stiffness: 70, damping: 14 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ */
/* Mola 2D interrompível (preserva velocidade; rAF só enquanto se move) */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.0005) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  const set = (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
  set.stop = () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  return set;
}

/* ------------------------------------------------------------------ */
/* Topo e barra de agendamento                                          */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const dock = $('[data-dock]');
const hero = $('[data-hero]');
const onScroll = () => {
  top.classList.toggle('is-solid', scrollY > 24);
  if (dock) dock.classList.toggle('is-on', scrollY > hero.offsetHeight * 0.75);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* brilho do botão segue o ponteiro (só ponteiro fino) */
if (fineMQ.matches) {
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest?.('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
  }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Lenis — rolagem contínua só para roda do mouse; toque nativo          */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !fineMQ.matches || !window.Lenis || lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? null : $(id);
  if (id !== '#inicio' && !target) return;
  e.preventDefault();
  const y = target ? target.getBoundingClientRect().top + scrollY - (top.offsetHeight + 8) : 0;
  if (lenis) lenis.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* Mostrador 7h→21h: marcas das horas (decorativas)                     */
/* ------------------------------------------------------------------ */
const DIAL = { cx: 300, cy: 300, r: 260 };
const dialPoint = (t, r = DIAL.r) => [DIAL.cx - r * Math.cos(Math.PI * t), DIAL.cy - r * Math.sin(Math.PI * t)];
const ticks = $('[data-dial-ticks]');
if (ticks) {
  const STOPS_T = [0, 0.25, 0.5, 0.75, 1];
  for (let h = 7; h <= 21; h++) {
    const t = (h - 7) / 14;
    const [x1, y1] = dialPoint(t, 268), [x2, y2] = dialPoint(t, h % 2 ? 280 : 275);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
    ticks.appendChild(l);
  }
  STOPS_T.forEach((t) => {
    const [x, y] = dialPoint(t, 246);
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', '3');
    c.setAttribute('class', 'dial__mark'); c.setAttribute('fill', '#C69A5C');
    ticks.appendChild(c);
  });
}

/* ------------------------------------------------------------------ */
/* Abas de cuidados (funcionam sem Motion; teclado com setas)           */
/* ------------------------------------------------------------------ */
const tablist = $('[data-tablist]');
const tabs = tablist ? $$('[role="tab"]', tablist) : [];
const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
const pill = $('[data-pill]');
let activeTab = 0;
let animateFn = null; // definido quando o Motion carrega
let pillPlaced = false;

function placePill(animate) {
  if (!pill || !tabs.length) return;
  const t = tabs[activeTab];
  const to = { x: t.offsetLeft, y: t.offsetTop, w: t.offsetWidth, h: t.offsetHeight };
  if (!animate || !animateFn || reduce || !pillPlaced) {
    Object.assign(pill.style, { width: to.w + 'px', height: to.h + 'px', transform: `translate(${to.x}px, ${to.y}px)`, opacity: 1 });
    pillPlaced = true; return;
  }
  animateFn(pill, { transform: `translate(${to.x}px, ${to.y}px)`, width: to.w + 'px', height: to.h + 'px' }, SPRING_PILL);
}
function selectTab(i, { focus = false } = {}) {
  if (i === activeTab) { if (focus) tabs[i].focus(); return; }
  const prev = activeTab, dir = i > prev ? 1 : -1;
  tabs[prev].setAttribute('aria-selected', 'false'); tabs[prev].tabIndex = -1;
  tabs[i].setAttribute('aria-selected', 'true'); tabs[i].tabIndex = 0;
  panels[prev].hidden = true; panels[i].hidden = false;
  activeTab = i;
  if (focus) tabs[i].focus();
  tabs[i].scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  placePill(true);
  if (animateFn && !reduce) {
    const p = panels[i], img = $('img', p), fig = $('.panel__img', p);
    // íris: a nova foto abre em círculo a partir do lado de onde a aba veio
    animateFn(img, { clipPath: [`circle(0% at ${dir > 0 ? '100%' : '0%'} 50%)`, `circle(120% at ${dir > 0 ? '100%' : '0%'} 50%)`], transform: ['scale(1.12)', 'scale(1)'] }, { duration: 0.7, ease: EASE_IN_OUT });
    animateFn(fig, { rotate: [`${dir * -4}deg`, '0deg'] }, { duration: 0.7, ease: EASE_OUT });
    animateFn($('.panel__t', p), { opacity: [0, 1], transform: [`translateY(${18}px)`, 'translateY(0px)'] }, { duration: 0.45, ease: EASE_OUT });
    animateFn($$('.panel__txt > :not(.panel__t)', p), { opacity: [0, 1] }, { duration: 0.4, delay: 0.08, ease: EASE_OUT });
  }
}
if (tabs.length) {
  panels.forEach((p, i) => { p.hidden = i !== 0; });
  tabs.forEach((t, i) => t.addEventListener('click', () => selectTab(i)));
  tablist.addEventListener('keydown', (e) => {
    const k = e.key;
    let n = null;
    if (k === 'ArrowRight' || k === 'ArrowDown') n = (activeTab + 1) % tabs.length;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (activeTab - 1 + tabs.length) % tabs.length;
    else if (k === 'Home') n = 0; else if (k === 'End') n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault(); selectTab(n, { focus: true });
  });
  if (!pill) tablist.classList.add('no-pill');
  addEventListener('resize', () => placePill(false));
  document.fonts?.ready.then(() => placePill(false));
  placePill(false);
}

/* ------------------------------------------------------------------ */
/* Cores do dia: manhã creme → tarde rosa → noite vinho                 */
/* ------------------------------------------------------------------ */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SKY = [
  [0.00, hex('#F6EEE4')], [0.20, hex('#F5E6D8')], [0.40, hex('#F0DACE')], [0.57, hex('#E9CFC8')],
  [0.63, hex('#7C2A43')], [0.80, hex('#561330')], [1.00, hex('#3A0B1F')],
];
function skyAt(p) {
  for (let i = 1; i < SKY.length; i++) {
    if (p <= SKY[i][0]) {
      const [p0, c0] = SKY[i - 1], [p1, c1] = SKY[i];
      const t = clamp((p - p0) / (p1 - p0));
      return c0.map((v, k) => Math.round(lerp(v, c1[k], t)));
    }
  }
  return SKY[SKY.length - 1][1];
}
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                  */
/* ------------------------------------------------------------------ */
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

if (M) {
  const { animate, scroll, inView, stagger } = M;
  animateFn = (...a) => animate(...a);
  const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);
  root.classList.add('motion-ready');

  if (!reduce) {
    /* ---- HERO: entrada (título e CTA não esperam o anel) ---- */
    animate('.hero__title .line > span', { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.08), ease: EASE_OUT });
    animate('.hero__lead, .hero__actions, .hero__hours', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] }, { duration: 0.7, delay: stagger(0.07, { startDelay: 0.3 }), ease: EASE_OUT });
    animate('.hero__photo', { clipPath: ['inset(100% 0 0 0 round 999px)', 'inset(0% 0 0 0 round 999px)'] }, { duration: 1.25, delay: 0.1, ease: EASE_IN_OUT });
    animate('.hero__photo img', { transform: ['scale(1.16)', 'scale(1)'] }, { duration: 1.8, delay: 0.1, ease: EASE_OUT });
    // SVG: WAAPI direto (traço do anel e texto)
    const eo = 'cubic-bezier(0.23, 1, 0.32, 1)';
    $$('.ring__line:not(.ring__line--in)').forEach((c) => c.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1600, delay: 250, easing: eo, fill: 'both' }));
    $$('.ring__line--in').forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 900, easing: eo, fill: 'both' }));
    $('.ring__text')?.animate([{ opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.24em' }], { duration: 1400, delay: 500, easing: eo, fill: 'both' });
    animate('.hero__seal', { opacity: [0, 1], transform: ['scale(.6) rotate(-40deg)', 'scale(1) rotate(0deg)'] }, { type: 'spring', bounce: 0.3, duration: 0.9, delay: 1.0 });

    /* ---- HERO: anel pausa fora da tela; inclinação por mola no ponteiro ---- */
    const spin = $('[data-ring-spin]');
    inView(hero, () => { spin.style.animationPlayState = 'running'; return () => { spin.style.animationPlayState = 'paused'; }; });
    const tilt = $('[data-tilt]');
    const ring = $('[data-ring]');
    const photo = $('[data-hero-photo]');
    if (fineMQ.matches && tilt) {
      const set = springVec((x, y) => {
        tilt.style.transform = `rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg)`;
        ring.style.translate = `${(x * 10).toFixed(2)}px ${(y * 10).toFixed(2)}px`;
        photo.style.translate = `${(x * -6).toFixed(2)}px ${(y * -6).toFixed(2)}px`;
      }, SPRING_TILT);
      let heroOn = true;
      inView(hero, () => { heroOn = true; return () => { heroOn = false; set(0, 0); }; });
      addEventListener('pointermove', (e) => {
        if (!heroOn || e.pointerType !== 'mouse') return;
        const r = tilt.getBoundingClientRect();
        set(clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1), clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1));
      }, { passive: true });
      document.addEventListener('pointerleave', () => set(0, 0));
    }
    /* saída ligada à rolagem: o anel se afasta e gira um pouco a mais */
    scroll((p) => {
      const t = prog(p);
      $('.hero__art').style.transform = `translateY(${(t * -60).toFixed(1)}px) rotate(${(t * 12).toFixed(2)}deg)`;
    }, { target: hero, offset: ['start start', 'end start'] });

    /* ---- CENA: Um dia no Gabrielly ---- */
    const day = $('[data-day]');
    const stops = $$('[data-stop]');
    const sun = $('[data-dial-sun]');
    const done = $('[data-dial-done]');
    const clock = $('[data-clock]');
    const count = $('[data-count]');
    const N = stops.length;
    let current = -1, lastInk = '';
    const setStopText = (i) => {
      if (i === current) return;
      const prev = current, dir = i > prev ? 1 : -1;
      current = i;
      stops.forEach((s, k) => s.classList.toggle('is-active', k === i));
      if (count) count.textContent = String(i + 1).padStart(2, '0');
      if (!deskMQ.matches) return;
      if (prev >= 0) {
        const pt = $('.stop__txt', stops[prev]);
        animate(pt, { opacity: 0, transform: `translateY(${-14 * dir}px)` }, { duration: 0.24, ease: EASE_OUT })
          .then(() => { if (current !== prev) pt.style.visibility = 'hidden'; });
      }
      const nt = $('.stop__txt', stops[i]);
      nt.style.visibility = 'visible';
      animate(nt, { opacity: [0, 1], transform: [`translateY(${20 * dir}px)`, 'translateY(0px)'] }, { duration: 0.5, delay: 0.06, ease: EASE_OUT });
      // máscara de linha no título da parada
      animate($('.stop__t', stops[i]), { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 -20% 0)'], transform: ['translateY(30%)', 'translateY(0%)'] }, { duration: 0.6, delay: 0.06, ease: EASE_OUT });
    };
    const imgs = stops.map((s) => $('.stop__img img', s));
    const render = (p) => {
      // céu e tinta
      const c = skyAt(p);
      day.style.setProperty('--day-bg', `rgb(${c.join(',')})`);
      const dark = lum(c) < 0.2;
      const ink = dark ? 'light' : 'dark';
      if (ink !== lastInk) {
        lastInk = ink;
        day.style.setProperty('--day-ink', dark ? '#F6EEE4' : '#2B0A17');
        day.style.setProperty('--day-line', dark ? 'rgba(246,238,228,.32)' : 'rgba(92,2,38,.28)');
      }
      // sol no arco
      const [x, y] = dialPoint(p);
      sun.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      done.style.strokeDashoffset = (1 - p).toFixed(4);
      const h = Math.floor(lerp(7, 21, p) + 0.0001);
      if (clock && clock._h !== h) { clock._h = h; clock.textContent = `${h}h`; }
      // paradas
      setStopText(Math.min(N - 1, Math.floor(clamp(p, 0, 0.9999) * N)));
      // íris das fotos (desktop): a próxima abre em círculo a partir do lado do sol
      if (deskMQ.matches) {
        imgs.forEach((im, i) => {
          if (!i) return;
          const start = i / N - 0.05;
          const t = clamp((p - start) / 0.09);
          const ox = (p * 100).toFixed(1);
          const v = t >= 1 ? 'none' : `circle(${(t * 140).toFixed(2)}% at ${ox}% 0%)`;
          if (im._c !== v) { im._c = v; im.style.clipPath = v; im.style.transform = `scale(${(1.08 - t * 0.08).toFixed(4)})`; }
        });
      }
    };
    const resetImgs = () => imgs.forEach((im) => { im._c = ''; im.style.clipPath = ''; im.style.transform = ''; });
    const applyMode = () => {
      resetImgs(); current = -1;
      stops.forEach((s, i) => { const t = $('.stop__txt', s); t.style.opacity = ''; t.style.transform = ''; t.style.visibility = deskMQ.matches && i ? 'hidden' : ''; });
    };
    applyMode();
    deskMQ.addEventListener('change', applyMode);
    // desktop: progresso da seção presa; celular: progresso da leitura da lista
    scroll((p) => { if (deskMQ.matches) render(prog(p)); }, { target: day, offset: ['start start', 'end end'] });
    scroll((p) => { if (!deskMQ.matches) render(prog(p)); }, { target: $('[data-stops]'), offset: ['start 0.7', 'end end'] });
    // celular: cada foto abre em íris ao entrar
    imgs.forEach((im) => {
      inView(im.parentElement, () => {
        if (deskMQ.matches) return;
        animate(im, { clipPath: ['circle(8% at 50% 0%)', 'circle(130% at 50% 0%)'], transform: ['scale(1.1)', 'scale(1)'] }, { duration: 1.1, ease: EASE_IN_OUT });
      }, { amount: 0.3 });
    });

    /* ---- NARRATIVA 2: o Espaço se abre como um amanhecer + círculo tangente ---- */
    const stay = $('[data-stay]');
    const stayInner = $('.stay__inner');
    const stayImgs = $('.stay__imgs');
    scroll((p) => {
      const t = prog(p);
      const e = 1 - Math.pow(1 - t, 3);
      stayInner.style.setProperty('--arch', `${(46 - e * 46).toFixed(2)}%`);
      stayInner.style.setProperty('--arch-y', `${(160 * (1 - e)).toFixed(1)}px`);
    }, { target: stay, offset: ['start end', 'start 0.15'] });
    scroll((p) => {
      stayImgs.style.setProperty('--a', `${(125 - prog(p) * 75).toFixed(2)}deg`);
    }, { target: stayImgs, offset: ['start end', 'center 0.45'] });

    /* ---- NARRATIVA 3: semana se desenha barra a barra ---- */
    const bars = $$('.week__bar i');
    bars.forEach((b) => { b.style.transform = 'scaleX(0)'; });
    inView('[data-week]', () => {
      animate(bars, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 0.9, delay: stagger(0.07), ease: EASE_OUT });
    }, { amount: 0.4 });

    /* ---- Títulos: máscara de linha ao entrar (não em todo bloco) ---- */
    const bookLines = $$('.book__title .line > span');
    bookLines.forEach((s) => { s.style.transform = 'translateY(108%)'; });
    inView('[data-book]', () => { animate(bookLines, { transform: 'translateY(0%)' }, { duration: 0.95, delay: stagger(0.09), ease: EASE_OUT }); }, { amount: 0.25 });

    $$('.care .h2, .stay .h2').forEach((h) => {
      if (h.getBoundingClientRect().top < innerHeight) return;
      h.style.clipPath = 'inset(0 0 100% 0)'; h.style.transform = 'translateY(26px)';
      inView(h.parentElement, () => { animate(h, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% -14% 0%)'], transform: 'translateY(0px)' }, { duration: 0.95, ease: EASE_OUT }); }, { amount: 0.2 });
    });
  }
  placePill(false);
}
