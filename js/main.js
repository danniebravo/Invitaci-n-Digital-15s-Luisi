(() => {
  'use strict';

  /* ---------------- Datos del evento ---------------- */
  const EVENT_DATE = new Date('2026-12-05T19:00:00-05:00'); // Sábado 05 dic 2026, 7:00 p.m. (Colombia)
  const WHATSAPP = '573155863999';
  const WA_TEXT = 'Hola, confirmo mi asistencia a los XV años de Luisa María.\n\nMi nombre: ';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  // La invitación siempre se anima (Android activa 'reducir movimiento' solo con el ahorro de batería y apagaba todo). Versión calmada: /?calma=1
  const reduce = new URLSearchParams(location.search).get('calma') === '1';
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------------- RSVP ---------------- */
  // Invitación personalizada: /?para=Nombre&c=2 (sin parámetros se ve la invitación general)
  const q = new URLSearchParams(location.search);
  const guest = (q.get('para') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
  const seats = Math.max(0, Math.min(20, parseInt(q.get('c'), 10) || 0));
  let waText = WA_TEXT;
  if (guest) {
    $('#introParaName').textContent = guest;
    $('#introPara').hidden = false;
    const lf = $('#letterFor'); lf.textContent = guest; lf.hidden = false;   // también en la carta que sale del sobre
    const head = `Hola, confirmo mi asistencia a los XV años de Luisa María.\n\nInvitado: ${guest}`;
    // Solo jóvenes (c=1) ven el aviso de cupo único; familias y señores solo confirman, sin pedir ni permitir acompañantes.
    waText = head;
    if (seats === 1) {
      const n = $('#placesNote');
      n.textContent = 'Hay 1 cupo reservado únicamente para quien recibe esta tarjeta.';
      n.hidden = false;
    }
  }
  $('#rsvpBtn').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}`;

  /* ---------------- Disuasión de copia (no es seguridad real: en el navegador todo el código es visible) ---------------- */
  if (!/^(localhost|127\.|192\.168\.)/.test(location.hostname)) {
    const stop = e => e.preventDefault();
    ['contextmenu', 'dragstart', 'copy', 'cut'].forEach(t => document.addEventListener(t, stop));
    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (e.key === 'F12' || (e.ctrlKey && ['u', 's', 'p'].includes(k)) || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k))) e.preventDefault();
    });
  }

  /* ---------------- Partículas ---------------- */
  const fill = (el, make) => {
    const n = reduce ? Math.ceil(+el.dataset.count / 3) : +el.dataset.count;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) frag.appendChild(make(i));
    el.appendChild(frag);
  };
  const node = (cls, css) => {
    const e = document.createElement('span'); e.className = cls;
    for (const [k, v] of Object.entries(css)) k.startsWith('--') ? e.style.setProperty(k, v) : (e.style[k] = v);
    return e;
  };

  $$('.fireflies').forEach(el => fill(el, () => node('fly', {
    left: rand(0, 100) + '%', top: rand(5, 95) + '%',
    '--d': rand(6, 12) + 's', '--t': rand(2, 4.5) + 's', '--dl': -rand(0, 8) + 's',
    '--fx': rand(-50, 50) + 'px', '--fy': rand(-70, 30) + 'px',
  })));
  $$('.sparkles').forEach(el => fill(el, i => {
    const s = node('spark' + (i % 3 === 0 ? ' gold' : ''), {
      left: rand(4, 96) + '%', top: rand(28, 92) + '%',
      '--t': rand(1.8, 3.6) + 's', '--dl': -rand(0, 4) + 's',
    });
    const z = rand(6, 14); s.style.width = s.style.height = z + 'px';
    return s;
  }));
  $$('.stars').forEach(el => fill(el, () => {
    const z = rand(1, 2.6);
    return node('star', { left: rand(0, 100) + '%', top: rand(0, 100) + '%', width: z + 'px', height: z + 'px', '--t': rand(2, 5) + 's', '--dl': -rand(0, 5) + 's' });
  }));
  const petal = () => node('petal', {
    left: rand(0, 100) + '%', '--dx': rand(-90, 90) + 'px', '--rot': rand(300, 720) + 'deg',
    animationDuration: rand(9, 18) + 's', animationDelay: -rand(0, 16) + 's',
    transform: `scale(${rand(.6, 1.4)})`,
  });
  $$('.petal-field').forEach(el => fill(el, petal));
  const petals = $('#petals'); petals.dataset.count = 20; fill(petals, petal);
  $$('.envelope-rain').forEach(el => fill(el, () => node('rain-env', {
    left: rand(0, 94) + '%', '--dx': rand(-60, 60) + 'px', '--rot': rand(-200, 200) + 'deg',
    animationDuration: rand(10, 18) + 's', animationDelay: -rand(0, 18) + 's',
    transform: `scale(${rand(.6, 1.1)})`,
  })));

  /* ---------------- Cuenta regresiva ---------------- */
  const cd = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let t = Math.max(0, EVENT_DATE - Date.now());
    if (t === 0) { $('#countdown').hidden = true; $('#countDone').hidden = false; $('#countLabel').hidden = true; return; }
    t = Math.floor(t / 1000);
    cd.d.textContent = Math.floor(t / 86400);
    cd.h.textContent = pad(Math.floor(t % 86400 / 3600));
    cd.m.textContent = pad(Math.floor(t % 3600 / 60));
    cd.s.textContent = pad(t % 60);
  };
  tick(); setInterval(tick, 1000);

  /* ---------------- Música ---------------- */
  const song = $('#song');
  const musicBtn = $('#music');
  let wantMusic = true;
  const setMusicUI = on => { musicBtn.setAttribute('aria-pressed', on); musicBtn.setAttribute('aria-label', on ? 'Pausar música' : 'Reproducir música'); };
  // El audio ya viene recortado para que la canción suene desde el segundo 0
  song.volume = .8;
  const playSong = () => { song.play().then(() => setMusicUI(true)).catch(() => setMusicUI(false)); };


  /* ---------------- Reintento de imágenes que fallen ---------------- */
  const retry = img => {
    if (img.dataset.retried) return;
    img.dataset.retried = '1';
    const src = img.getAttribute('src');
    setTimeout(() => { img.src = src + (src.includes('?') ? '&' : '?') + 'r=' + Date.now(); }, 800);
  };
  $$('img').forEach(img => {
    img.addEventListener('error', () => retry(img));
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) retry(img);
  });

  /* ---------------- Videos decorativos: arrancan al verse; si el celular bloquea el autoplay hay respaldo ---------------- */
  const lazyVideos = ['#dateVideo', '#dreamVideo'].map(sel => $(sel)).filter(Boolean);
  lazyVideos.forEach(v => { v.muted = true; v.defaultMuted = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); });
  const visibleVideos = new Set();
  const dreamAnim = $('#dreamAnim');
  let dreamFallback = false;
  // El baile pasa a un WebP animado (las imágenes animadas no las bloquea el ahorro de batería)
  const useDreamFallback = () => {
    const v = $('#dreamVideo');
    if (dreamFallback || !dreamAnim || !v) return;
    dreamFallback = true;
    dreamAnim.src = dreamAnim.dataset.src; dreamAnim.hidden = false; v.hidden = true;
  };
  const retryOnTouch = () => addEventListener('touchend', () => visibleVideos.forEach(v => v.play().catch(() => {})), { once: true, passive: true });
  const tryPlay = v => {
    const p = v.play();
    if (p && p.catch) p.catch(() => { v.classList.add('is-still'); if (v.id === 'dreamVideo') useDreamFallback(); retryOnTouch(); });
    if (v.id === 'dreamVideo') setTimeout(() => { if (visibleVideos.has(v) && v.paused) useDreamFallback(); }, 1500);
  };
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { visibleVideos.add(e.target); tryPlay(e.target); } else { visibleVideos.delete(e.target); e.target.pause(); }
    }), { rootMargin: '120px' });
    lazyVideos.forEach(v => io.observe(v));
  }
  musicBtn.addEventListener('click', () => {
    if (song.paused) { wantMusic = true; playSong(); } else { wantMusic = false; song.pause(); setMusicUI(false); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) song.pause(); else if (wantMusic && introDone) song.play().catch(() => {});
  });

  /* ---------------- Precarga de imágenes que entran por los lados ---------------- */
  // Las palomas y el carrusel de fotos entran de lado: se cargan antes de llegar a su sección
  if ('IntersectionObserver' in window) {
    const pre = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
      pre.unobserve(e.target);
    }), { rootMargin: '1200px 0px' });
    ['#regalos', '#galeria'].forEach(s => { const el = document.querySelector(s); if (el) pre.observe(el); });
  }

  /* ---------------- Separar palabras ---------------- */
  const splitWords = el => {
    const walk = n => {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); }
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(el);
  };
  $$('.split').forEach(splitWords);

  /* ---------------- Video del hero ---------------- */
  const video = $('#heroVideo');
  const playVideo = () => { if (!reduce) video.play().catch(() => video.classList.add('is-still')); };   // sin video: el póster se mueve despacio

  /* ---------------- Lenis ---------------- */
  let lenis = null;
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });   // la barra del navegador móvil no desajusta las animaciones
    if (window.Lenis && !reduce) {
      lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
  }

  /* ---------------- Apertura de la carta ---------------- */
  const intro = $('#intro');
  const seal = $('#seal');
  let introDone = false;
  let opening = false;

  const heroWords = $$('#heroTitle .w');
  if (hasGSAP) {
    gsap.set(heroWords, { opacity: 0, y: 24, filter: 'blur(10px)' });
    gsap.set('#heroGirl', { opacity: 0, y: 40 });
    gsap.set('.hero-bloom', { opacity: 0, y: 60 });
  }

  const finishIntro = () => {
    introDone = true;
    intro.remove();
    document.body.classList.remove('is-locked');
    musicBtn.classList.add('is-visible');
    if (hasGSAP) gsap.set('#app', { clearProps: 'transform,filter,borderRadius' });
    if (lenis) lenis.start();
    if (hasGSAP) setupScroll();
  };

  const open = () => {
    if (opening) return;
    opening = true;
    intro.classList.add('is-opening');
    song.preload = 'auto';
    playSong();
    playVideo();
    // Un play() dentro del toque desbloquea estos videos para los play() posteriores (iOS / ahorro de batería)
    if (!reduce) lazyVideos.forEach(v => { const p = v.play(); if (p && p.then) p.then(() => { if (!visibleVideos.has(v)) v.pause(); }).catch(() => {}); });

    if (!hasGSAP) { finishIntro(); return; }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finishIntro });
    tl.to('#introHint, .intro-sound, #introPara', { opacity: 0, duration: .3 })
      .to('.seal-l', { x: -46, y: 30, rotation: -35, opacity: 0, duration: .8, ease: 'power2.in' }, 0)
      .to('.seal-r', { x: 46, y: 34, rotation: 38, opacity: 0, duration: .8, ease: 'power2.in' }, 0)
      .to('.seal-crown', { opacity: 0, duration: .2 }, 0)
      .to('#flap', { rotateX: 180, duration: .9, ease: 'power2.inOut' }, .35)
      .set('#flap', { zIndex: 1 }, .8)
      .to('#letter', { yPercent: -62, duration: 1, ease: 'power3.out' }, 1.05)
      .to('#letter', { scale: 1.06, duration: .6 }, 1.5)
      .to('.envelope', { y: 60, duration: 1.1, ease: 'power2.inOut' }, 1.1)
      .to('.intro-kicker', { y: -30, opacity: 0, duration: .8 }, 1.4)
      .to(intro, { opacity: 0, scale: 1.25, duration: 1.1, ease: 'power2.inOut' }, 2.2)
      .fromTo('#app', { scale: .9, filter: 'blur(6px)', borderRadius: 28 }, { scale: 1, filter: 'blur(0px)', borderRadius: 0, duration: 1.4, ease: 'expo.inOut' }, 2.2)
      .from('.cloud-l', { x: -140, opacity: 0, duration: 1.8 }, 2.6)
      .from('.cloud-r', { x: 140, opacity: 0, duration: 1.8 }, 2.6)
      .to(heroWords, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: .12, clearProps: 'filter,willChange' }, 2.9)
      .to('#heroGirl', { opacity: 1, y: 0, duration: 1.4 }, 3.1)
      .to('.hero-bloom', { opacity: 1, y: 0, duration: 1.4, stagger: .1 }, 3.2);
    // Si la animación se atasca (celular lento), se abre igual y se muestra todo
    setTimeout(() => {
      if (introDone) return;
      tl.kill();
      gsap.set([heroWords, '#heroGirl', '.hero-bloom', '.cloud-l', '.cloud-r'], { clearProps: 'all' });
      finishIntro();
    }, 9000);
  };
  seal.addEventListener('click', open);
  $('#envelope').addEventListener('click', open);

  /* ---------------- Animaciones con scroll ---------------- */
  function setupScroll() {
    // Cada bloque va aislado: si uno falla en un celular, los demás siguen funcionando
    const safe = fn => { try { fn(); } catch (e) { console.warn('animación omitida', e); } };
    const touch = matchMedia('(hover: none)').matches;           // en táctiles se evita el blur animado (pesado en gama baja)
    const soft = touch ? {} : { filter: 'blur(4px)', clearProps: 'filter' };
    const softW = touch ? { clearProps: 'willChange' } : { filter: 'blur(8px)', clearProps: 'filter,willChange' };

    safe(() => {   // Hero parallax
      gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
        .to('#heroTitle', { yPercent: -50, ease: 'none' }, 0)
        .to('#heroGirl', { yPercent: 8, ease: 'none' }, 0)
        .to('.hero-media', { yPercent: 10, ease: 'none' }, 0);
      $$('.hero [data-par]').forEach(el => gsap.to(el, { y: +el.dataset.par * 2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } }));
    });

    if (reduce) { ScrollTrigger.refresh(); return; }

    safe(() => {   // Entradas discretas: el momento protagonista es la carta y el pergamino
      $$('.reveal').forEach(el => gsap.from(el, { opacity: .15, y: 12, duration: .9, ease: 'expo.out', ...soft, scrollTrigger: { trigger: el, start: 'top 90%' } }));
      $$('.split').forEach(el => {
        if (el.closest('#hero')) return;
        gsap.from($$('.w', el), { opacity: 0, y: 16, duration: 1.1, stagger: .07, ease: 'expo.out', ...softW, scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
    });

    safe(() => {   // Pergamino que se desenrolla
      const body = $('#scrollBody');
      const roll = $('.scroll-roll-bottom');
      gsap.timeline({ scrollTrigger: { trigger: '#scroll', start: 'top 82%', end: 'top 12%', scrub: .6, invalidateOnRefresh: true } })
        .fromTo(body, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
        .fromTo(roll, { y: () => -(body.offsetHeight - 30) }, { y: 0, ease: 'none' }, 0);
      gsap.from('.msg-text', { opacity: 0, y: 14, stagger: .2, duration: 1, scrollTrigger: { trigger: '#scroll', start: 'top 40%' } });
    });

    safe(() => gsap.from('.polaroid', { y: 70, rotation: 0, opacity: 0, duration: 1.1, stagger: .14, ease: 'back.out(1.4)', scrollTrigger: { trigger: '#polaroids', start: 'top 85%' } }));

    safe(() => {   // Hadas volando
      const fly = (sel, fromX, toX, fromY, toY) => gsap.fromTo(sel, { x: fromX, y: fromY }, { x: toX, y: toY, ease: 'none', scrollTrigger: { trigger: '#fecha', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      fly('.fairy-rosa', '-70vw', '10vw', 120, -60);
      fly('.fairy-verde', '70vw', '-10vw', 80, -40);
      fly('.fairy-azul', '-60vw', '6vw', 140, -80);
      $$('.fairy').forEach((f, i) => gsap.to(f, { rotation: i % 2 ? 6 : -6, duration: 2.4 + i * .4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    });

    safe(() => {   // Línea del itinerario
      gsap.to('#tlFill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 60%', scrub: .5 } });
      $$('.tl-item').forEach(el => gsap.from(el, { opacity: 0, x: -24, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } }));
    });

    safe(() => {   // Libro pop-up: al bajar se abre y el castillo se despliega; al subir se cierra. Abierto, respira suave
      gsap.timeline({ scrollTrigger: { trigger: '#popupBook', start: 'top 95%', end: 'top 40%', scrub: .8 } })
        .fromTo('.book-base', { rotationX: 62, opacity: .6 }, { rotationX: 0, opacity: 1, ease: 'power2.out' }, 0)
        .fromTo('.place-castle', { scaleY: .08, scaleX: .55, opacity: 0, transformOrigin: '50% 74%' }, { scaleY: 1, scaleX: 1, opacity: 1, ease: 'back.out(1.6)' }, .15);
      gsap.to('.castle-float', { y: -7, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.from('#placeCard', { y: 50, opacity: 0, ...(touch ? {} : { filter: 'blur(8px)' }), duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '#placeCard', start: 'top 88%' } });
    });

    safe(() => gsap.from('.couple', { scale: .82, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.couple', start: 'top 85%' } }));

    // Las imágenes con carga diferida cambian el alto de la página: se recalculan las posiciones (con pausa para no recalcular a cada una)
    ScrollTrigger.refresh();
    let rt; const refreshSoon = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 400); };
    document.addEventListener('load', refreshSoon, true);
    addEventListener('load', refreshSoon);
    addEventListener('orientationchange', () => setTimeout(() => ScrollTrigger.refresh(), 300));
  }

  // Enlaces internos con scroll suave
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id, { duration: 1.6 }); else $(id).scrollIntoView({ behavior: 'smooth' });
  }));
})();
