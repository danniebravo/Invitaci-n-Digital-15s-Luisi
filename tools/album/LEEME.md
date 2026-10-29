# Álbum de recuerdos → Google Drive

Los invitados escanean el QR (`QR-album-imprimir.png`), abren `/album` y suben fotos.
Cada foto llega a la carpeta **"XV Luisa María · Fotos de invitados"** de tu Google Drive.
Solo funciona el **5 y 6 de diciembre de 2026** (hora de Colombia); antes y después la página lo avisa.

## Opción A · Automática (con Claude)
1. Abre https://script.google.com/home/usersettings y activa **Google Apps Script API**.
2. Dile a Claude "listo". Él ejecuta `npx @google/clasp login`: se abre tu navegador, entras con tu cuenta de Google y das **Permitir**.
3. Claude sube el script, lo publica y pega la URL en `js/album-config.js`.
4. La primera vez Google te pedirá autorizar acceso a Drive: **Permitir** (si dice "app no verificada": *Configuración avanzada → Ir al proyecto*; es tu propio script).

## Opción B · Manual (5 minutos)
1. Entra a https://script.google.com → **Nuevo proyecto**. Ponle de nombre "Álbum XV Luisa".
2. Borra lo que haya y pega todo el contenido de `Code.gs`.
3. Arriba elige la función **setup** y pulsa **Ejecutar**. Autoriza el acceso a Drive. Se crea la carpeta.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
5. Copia la URL que termina en `/exec` y pégala en `js/album-config.js`:
   ```js
   window.ALBUM_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
6. Publica de nuevo la invitación (`vercel deploy --prod`).

## Probar antes del día
- `…/album?estado=abierto` muestra el formulario aunque no sea 5 o 6 de diciembre
  (el servidor igual rechaza fotos fuera de esas fechas, así que no se llena la carpeta de pruebas).
- Para una prueba real de subida, cambia temporalmente `OPEN_FROM` en `Code.gs` a la fecha de hoy y vuelve a implementar.

## Después de la fiesta
En Drive, clic derecho sobre la carpeta → **Descargar**: te llega un .zip con todas las fotos para armar el álbum.
