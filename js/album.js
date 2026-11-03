(() => {
  'use strict';
  const OPEN_FROM = new Date('2026-11-02T00:00:00-05:00'); // PRUEBA: restaurar a 2026-12-05
  const OPEN_UNTIL = new Date('2026-11-06T00:00:00-05:00'); // PRUEBA: restaurar a 2026-12-07
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
    if (ok) loadGallery();
  });

  /* Galería: fotos que ya subieron los invitados (miniaturas de Drive) */
  const gallery = $('#gallery'), grid = $('#galleryGrid'), gmsg = $('#galleryMsg');
  // Drive limita las miniaturas cuando se piden muchas juntas: se reintenta alternando las dos direcciones
  const THUMBS = [id => `https://drive.google.com/thumbnail?id=${id}&sz=w500`, id => `https://lh3.googleusercontent.com/d/${id}=w500`];
  function thumb(img, id, n = 0) {
    img.onerror = () => { if (n < 5) setTimeout(() => thumb(img, id, n + 1), 500 + n * 700); };
    img.src = THUMBS[n % 2](id) + (n && n % 2 === 0 ? '&r=' + n : '');
  }
  async function loadGallery() {
    if (!url) return;
    try {
      const res = await fetch(url + '?accion=lista');
      const out = await res.json();
      if (!out.ok) return;
      gallery.hidden = false;
      grid.replaceChildren(...out.fotos.map(id => {
        const a = document.createElement('a');
        a.href = `https://drive.google.com/file/d/${id}/view`; a.target = '_blank'; a.rel = 'noopener';
        const img = new Image();
        img.alt = 'Foto de la fiesta'; img.decoding = 'async';
        thumb(img, id); a.append(img); return a;
      }));
      gmsg.textContent = out.fotos.length ? '' : 'Aún no hay fotos. ¡Sé la primera persona en compartir un recuerdo!';
    } catch (e) { /* sin conexión: la galería simplemente no aparece */ }
  }
  loadGallery();
})();
