(() => {
  'use strict';
  const OPEN_FROM = new Date('2026-12-05T00:00:00-05:00');
  const OPEN_UNTIL = new Date('2026-12-07T00:00:00-05:00'); // abierto 5 y 6 de dic
  const MAX_SIDE = 2000;
  const QUALITY = 0.85;

  const $ = s => document.querySelector(s);
  const url = (window.ALBUM_URL || '').trim();
  const params = new URLSearchParams(location.search);
  // ?estado=abierto|antes|cerrado para probar la página antes del día
  const forced = params.get('estado');

  const show = id => { $(id).hidden = false; };
  const form = $('#albumForm'), input = $('#photos'), queue = $('#queue'), sendBtn = $('#sendBtn'), msg = $('#albumMsg');
  let files = [];

  const localState = () => {
    const now = new Date();
    return now < OPEN_FROM ? 'antes' : now >= OPEN_UNTIL ? 'cerrado' : 'abierto';
  };

  const render = estado => {
    if (estado === 'antes') { show('#stateBefore'); $('#albumIntro').hidden = true; }
    else if (estado === 'cerrado') { show('#stateClosed'); $('#albumIntro').hidden = true; }
    else form.hidden = false;
    if (!url) show('#demoNote');
  };

  render(forced || localState());

  // Comprimir en el celular: máx 2000 px, JPEG 85 %
  const compress = file => new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      resolve({ datos: c.toDataURL('image/jpeg', QUALITY).split(',')[1], ancho: c.width, alto: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('No se pudo leer la foto')); };
    img.src = src;
  });

  const item = (file, i) => {
    const li = document.createElement('li');
    li.className = 'q-item';
    const thumb = document.createElement('img');
    thumb.src = URL.createObjectURL(file); thumb.alt = ''; thumb.width = 56; thumb.height = 56;
    const label = document.createElement('span');
    label.className = 'q-state'; label.textContent = 'Lista para subir';
    li.append(thumb, label);
    li.dataset.i = i;
    return li;
  };

  input.addEventListener('change', () => {
    // se suman a las ya elegidas (así se pueden elegir de a varias, en varias tandas)
    const key = f => `${f.name}|${f.size}|${f.lastModified}`;
    const have = new Set(files.map(key));
    files = files.concat([...input.files].filter(f => f.type.startsWith('image/') && !have.has(key(f))));
    input.value = '';
    queue.replaceChildren(...files.map(item));
    sendBtn.disabled = files.length === 0;
    sendBtn.textContent = files.length > 1 ? `Subir mis ${files.length} fotos` : 'Subir mis fotos';
    msg.textContent = '';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!files.length) return;
    sendBtn.disabled = true; input.disabled = true;
    const nombre = '';   // ya no se pide el nombre: no se muestra en el libro
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const li = queue.children[i], st = li.querySelector('.q-state');
      st.textContent = 'Subiendo…'; li.className = 'q-item is-busy';
      try {
        const foto = await compress(files[i]);
        if (!url) { await new Promise(r => setTimeout(r, 500)); }
        else {
          // text/plain evita la verificación previa (CORS) de Apps Script
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ nombre, tipo: 'image/jpeg', datos: foto.datos, ancho: foto.ancho, alto: foto.alto }) });
          const out = await res.json();
          if (!out.ok) throw new Error(out.error || 'No se pudo guardar');
        }
        ok++; st.textContent = 'Guardada'; li.className = 'q-item is-done';
      } catch (err) {
        st.textContent = (err && err.message) || 'Falló. Toca "Subir" para reintentar.'; li.className = 'q-item is-error';
      }
    }
    const failed = files.length - ok;
    msg.textContent = failed === 0
      ? (url ? '¡Gracias por guardar este recuerdo!' : 'Vista previa: así se verá al subir tus fotos.')
      : `Se guardaron ${ok} de ${files.length}. Vuelve a elegir las que fallaron para reintentar.`;
    input.value = ''; input.disabled = false; files = [];
    sendBtn.textContent = 'Subir mis fotos';
    if (ok) loadGallery();
  });

  /* ---------- Álbum de la fiesta: libro con hojas que se pasan ---------- */
  const section = $('#gallery'), book = $('#book'), stage = $('#bookStage'), counter = $('#bookCount'), gmsg = $('#galleryMsg');
  const btnPrev = $('#bookPrev'), btnNext = $('#bookNext'), lb = $('#lightbox'), lbImg = $('#lightboxImg');
  // Drive limita las miniaturas cuando se piden muchas juntas: se reintenta alternando las dos direcciones
  const THUMBS = [(id, s) => `https://drive.google.com/thumbnail?id=${id}&sz=w${s}`, (id, s) => `https://lh3.googleusercontent.com/d/${id}=w${s}`];
  function thumb(img, id, size, n = 0) {
    img.onerror = () => { if (n < 5) setTimeout(() => thumb(img, id, size, n + 1), 500 + n * 700); };
    img.src = THUMBS[n % 2](id, size) + (n && n % 2 === 0 ? '&r=' + n : '');
  }
  const spreadMq = matchMedia('(min-width: 900px) and (orientation: landscape)');
  let ids = [], leaves = [], cur = 0, maxCur = 0, spread = false;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const CROWN = '<img class="bk-crown" src="assets/img/corona-oro.webp" alt="" width="900" height="591">';

  const ORN = '<svg class="bk-orn" viewBox="0 0 120 12" aria-hidden="true"><path d="M2 6h48M70 6h48" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M60 1l5 5-5 5-5-5z" fill="currentColor"/></svg>';
  const pageCover = () => el('div', 'pg pg-cover', `<div class="bk-center">
      <img class="bk-corona" src="assets/img/corona-oro.webp" alt="" width="900" height="591">
      <span class="bk-kicker">Una vez en un sueño</span>
      <span class="bk-mis">Mis XV años</span>
      <span class="bk-name">Luisa María</span>
      <img class="bk-castle" src="assets/img/castillo-libro.webp" alt="" width="763" height="305">
      <span class="bk-date">05 · 12 · 2026</span>
    </div>`);
  const pageBack = () => el('div', 'pg pg-cover pg-back', `<div class="bk-center">
      ${CROWN.replace('bk-crown', 'bk-corona')}
      <img class="bk-sello" src="assets/img/sello-l.webp" alt="" width="360" height="360">
      ${ORN}
      <span class="bk-date">Mis XV · Luisa María</span>
    </div>`);
  const pageNote = () => el('div', 'pg pg-note', '<span class="bk-title sm">Recuerdos</span><span class="bk-line">Cada foto es un pedacito de esta noche, vista por todos los que la vivieron.</span>');
  const pageEnd = () => el('div', 'pg pg-note', `${CROWN}<span class="bk-title sm">Gracias</span><span class="bk-line">por cada recuerdo compartido.</span>`);
  const pageBlank = () => el('div', 'pg pg-note');
  const pageEmpty = () => el('div', 'pg pg-note', '<span class="bk-title sm">Pronto…</span><span class="bk-line">Aún no hay fotos. Las que suban los invitados aparecerán aquí.</span>');
  // Cada foto se muestra en polaroid vertical u horizontal según su forma; las hojas se arman con 2 del mismo tipo
  function packPages(items) {
    const q = { v: [], h: [] }, out = [];
    items.forEach(it => { const k = it.o === 'v' ? 'v' : 'h'; q[k].push(it); if (q[k].length === 2) { out.push(q[k]); q[k] = []; } });
    [q.v, q.h].forEach(g => g.forEach(it => out.push([it])));   // las que sobran van solas en su hoja
    return out;
  }
  function pagePhotos(group, num) {
    const kind = group.length === 1 ? 'pg-solo' : group[0].o === 'v' && group[1].o === 'v' ? 'pg-vv' : 'pg-hh';
    const pg = el('div', 'pg pg-photos ' + kind);
    group.forEach((it, k) => {
      const fig = el('figure', 'pol ' + (it.o === 'v' ? 'v' : 'h')); fig.style.setProperty('--r', (k ? 2.2 : -2.2) + 'deg');
      const im = new Image(); im.alt = 'Foto de la fiesta'; im.decoding = 'async'; im.dataset.id = it.id;
      im.onload = () => { const v = im.naturalHeight > im.naturalWidth * 1.1; fig.classList.toggle('v', v); fig.classList.toggle('h', !v); };  // corrige las que llegaron sin marca
      fig.append(im); pg.append(fig);
    });
    pg.append(el('span', 'pg-num', `— ${num} —`));
    return pg;
  }

  function build() {
    spread = spreadMq.matches; book.classList.toggle('is-spread', spread);
    const photoPages = packPages(ids).map((g, i) => pagePhotos(g, i + 1));
    if (!photoPages.length) photoPages.push(pageEmpty());
    const pages = spread ? [pageCover(), pageNote(), ...photoPages] : [pageCover(), ...photoPages];
    if (spread && pages.length % 2) pages.push(pageBlank());
    pages.push(pageEnd(), pageBack());
    stage.replaceChildren(); leaves = [];
    const face = (pg, side) => { const f = el('div', 'face ' + side); f.append(pg); return f; };
    if (spread) {
      for (let k = 0; k < pages.length; k += 2) { const lf = el('div', 'leaf'); lf.append(face(pages[k], 'front'), face(pages[k + 1], 'back')); leaves.push(lf); }
    } else {
      pages.forEach(pg => { const lf = el('div', 'leaf'); lf.append(face(pg, 'front')); leaves.push(lf); });
    }
    stage.append(...leaves);
    maxCur = spread ? leaves.length : leaves.length - 1;
    cur = Math.min(cur, maxCur);
    renderBook();
  }

  function fixZ() { leaves.forEach((lf, i) => { lf.style.zIndex = i < cur ? i + 1 : leaves.length - i; }); }
  function renderBook() {
    leaves.forEach((lf, i) => lf.classList.toggle('is-flipped', i < cur));
    fixZ();
    book.dataset.pos = cur === 0 ? 'start' : cur >= maxCur ? 'end' : 'mid';
    btnPrev.disabled = cur === 0; btnNext.disabled = cur >= maxCur;
    counter.textContent = cur === 0 ? 'Toca el libro para abrirlo' : `Hoja ${cur + 1} de ${maxCur + 1}`;
    leaves.slice(Math.max(0, cur - 1), cur + 3).forEach(lf => lf.querySelectorAll('img[data-id]:not([src])').forEach(im => thumb(im, im.dataset.id, 800)));
  }
  function go(d) {
    const n = Math.max(0, Math.min(maxCur, cur + d));
    if (n === cur) return;
    const flipping = leaves[d > 0 ? cur : cur - 1];
    cur = n; renderBook();
    if (flipping) { flipping.style.zIndex = leaves.length + 2; setTimeout(fixZ, 500); }
  }

  // Gestos: arrastrar de lado pasa la hoja; tocar un lado también; tocar una foto la abre en grande
  let sx = 0, sy = 0, swiped = false;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; swiped = false; });
  stage.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? 1 : -1); }
  });
  stage.addEventListener('click', e => {
    if (swiped) return;
    const im = e.target.closest('img[data-id]');
    if (im && im.complete && im.naturalWidth > 1) { openPhoto(im.dataset.id); return; }
    const r = stage.getBoundingClientRect();
    go(cur === 0 || e.clientX > r.left + r.width / 2 ? 1 : -1);
  });
  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePhoto();
    else if (!lb.hidden) return;
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });
  function openPhoto(id) { lbImg.removeAttribute('src'); thumb(lbImg, id, 1600); lb.hidden = false; }
  function closePhoto() { lb.hidden = true; lbImg.removeAttribute('src'); }
  lb.addEventListener('click', closePhoto);
  spreadMq.addEventListener('change', build);

  async function loadGallery() {
    if (!url) return;
    try {
      const res = await fetch(url + '?accion=lista');
      const out = await res.json();
      if (!out.ok) return;
      ids = out.fotos.map(f => (typeof f === 'string' ? { id: f } : f)).reverse(); section.hidden = false; build();   // de la más antigua a la más nueva
      gmsg.textContent = ids.length ? '' : 'Aún no hay fotos. ¡Sé la primera persona en compartir un recuerdo!';
    } catch (e) { /* sin conexión: el libro simplemente no aparece */ }
  }
  loadGallery();
})();
