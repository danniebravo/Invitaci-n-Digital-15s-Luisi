/**
 * Álbum de invitados · XV Luisa María
 * Recibe fotos desde album.html y las guarda en una carpeta de Google Drive.
 * Solo acepta fotos del 5 y 6 de diciembre de 2026 (hora de Colombia).
 */
const FOLDER_NAME = 'XV Luisa María · Fotos de invitados';
const OPEN_FROM = new Date('2026-12-05T00:00:00-05:00');
const OPEN_UNTIL = new Date('2026-12-07T00:00:00-05:00'); // hasta el 6 de dic a las 23:59
const MAX_BYTES = 12 * 1024 * 1024;

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: crear otra */ }
  }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function status_() {
  const now = new Date();
  if (now < OPEN_FROM) return 'antes';
  if (now >= OPEN_UNTIL) return 'cerrado';
  return 'abierto';
}

/** GET: la página pregunta si el álbum está abierto. */
function doGet() {
  return json_({ ok: true, estado: status_() });
}

/** POST: { nombre, archivo, tipo, datos (base64) } */
function doPost(e) {
  try {
    const estado = status_();
    if (estado !== 'abierto') return json_({ ok: false, estado: estado, error: 'El álbum no está abierto en este momento.' });

    const body = JSON.parse(e.postData.contents);
    const tipo = String(body.tipo || 'image/jpeg');
    if (!/^image\//.test(tipo)) return json_({ ok: false, error: 'Solo se aceptan fotos.' });

    const bytes = Utilities.base64Decode(body.datos);
    if (bytes.length > MAX_BYTES) return json_({ ok: false, error: 'La foto es demasiado grande.' });

    const nombre = String(body.nombre || 'Invitado').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 40) || 'Invitado';
    const stamp = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd_HH-mm-ss');
    const ext = tipo === 'image/png' ? 'png' : 'jpg';
    const fileName = nombre + '_' + stamp + '_' + Math.floor(Math.random() * 1000) + '.' + ext;

    getFolder_().createFile(Utilities.newBlob(bytes, tipo, fileName));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'No se pudo guardar la foto. Intenta de nuevo.' });
  }
}

/** Ejecútala una vez desde el editor para crear la carpeta y autorizar el acceso a Drive. */
function setup() {
  const f = getFolder_();
  Logger.log('Carpeta lista: ' + f.getUrl());
}
