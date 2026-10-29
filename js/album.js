(() => {
  'use strict';
  const OPEN_FROM = new Date('2026-12-05T00:00:00-05:00');
  const OPEN_UNTIL = new Date('2026-12-07T00:00:00-05:00');
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
      resolve(c.toDataURL('image/jpeg', QUALITY).split(',')[1]);
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
    files = [...input.files].filter(f => f.type.startsWith('image/'));
    queue.replaceChildren(...files.map(item));
    sendBtn.disabled = files.length === 0;
    sendBtn.textContent = files.length > 1 ? `Subir mis ${files.length} fotos` : 'Subir mis fotos';
    msg.textContent = '';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!files.length) return;
    sendBtn.disabled = true; input.disabled = true;
    const nombre = $('#guestName').value.trim();
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const li = queue.children[i], st = li.querySelector('.q-state');
      st.textContent = 'Subiendo…'; li.className = 'q-item is-busy';
      try {
        const datos = await compress(files[i]);
        if (!url) { await new Promise(r => setTimeout(r, 500)); }
        else {
          // text/plain evita la verificación previa (CORS) de Apps Script
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ nombre, tipo: 'image/jpeg', datos }) });
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
  });
})();
