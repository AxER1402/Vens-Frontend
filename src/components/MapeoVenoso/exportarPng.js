import plantilla from '../../assets/mapeoVenoso.png';
import { PLANTILLA_ANCHO, PLANTILLA_ALTO } from './zonas';

/**
 * Rasterizar el mapeo a PNG.
 *
 * El PNG es lo que se archiva para imprimir y lo que se muestra cuando la
 * consulta queda finalizada; el dibujo editable viaja aparte como JSON.
 *
 * Dos detalles que hacen falta para que la imagen salga completa:
 *
 *  1. Un SVG serializado se rasteriza en un contexto aislado que **no** carga
 *     recursos externos: si la plantilla se dejara como <image href="/assets/…">
 *     el PNG saldría con los trazos flotando sobre un fondo vacío. Por eso se
 *     incrusta antes como data URI.
 *  2. Las clases CSS de la página tampoco viajan, así que la tipografía se
 *     escribe en línea sobre el clon.
 *
 * La plantilla no lleva ningún filtro: viene ya limpia como asset. Cuando el
 * realce se hacía con `filter` en CSS había que repetirlo aquí, y bastaba con
 * que las dos copias se desincronizaran para que lo guardado no coincidiera
 * con lo que el médico veía en pantalla.
 */

/** Sin dependencias: 5 MB es el tope que valida el backend. */
const TOPE_BYTES = 5 * 1024 * 1024;

/** Margen respecto al tope, para no quedar al filo. */
const OBJETIVO_BYTES = 4.2 * 1024 * 1024;

let plantillaEnCache = null;

/** Plantilla como data URI, pedida una sola vez por sesión. */
const plantillaIncrustada = async () => {
  if (plantillaEnCache) return plantillaEnCache;

  plantillaEnCache = (async () => {
    const respuesta = await fetch(plantilla);
    const blob = await respuesta.blob();

    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = () => reject(new Error('No se pudo leer la plantilla del mapeo.'));
      lector.readAsDataURL(blob);
    });
  })().catch(error => {
    plantillaEnCache = null;   // que un fallo de red no deje la caché envenenada
    throw error;
  });

  return plantillaEnCache;
};

/** Clon del SVG listo para rasterizar: encuadre completo y recursos en línea. */
const prepararClon = async (svg) => {
  const clon = svg.cloneNode(true);

  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clon.setAttribute('viewBox', `0 0 ${PLANTILLA_ANCHO} ${PLANTILLA_ALTO}`);
  clon.setAttribute('width', PLANTILLA_ANCHO);
  clon.setAttribute('height', PLANTILLA_ALTO);
  clon.removeAttribute('style');

  const fondo = clon.querySelector('image');
  if (fondo) {
    fondo.setAttribute('href', await plantillaIncrustada());
  }

  // La fuente de la página no viaja con el SVG: se fija una genérica para que
  // los números de los marcadores no cambien de tamaño en el archivo.
  const estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  estilo.textContent = 'text { font-family: system-ui, "Helvetica Neue", Arial, sans-serif; }';
  clon.insertBefore(estilo, clon.firstChild);

  return clon;
};

/** Cargar una cadena SVG como <img>, resolviendo cuando esté decodificada. */
const comoImagen = (textoSvg) => new Promise((resolve, reject) => {
  const blob = new Blob([textoSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo rasterizar el mapeo.')); };
  img.src = url;
});

/** Peso aproximado en bytes de una data URL base64. */
const pesoDe = (dataUrl) => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

/**
 * Exportar el lienzo a un PNG en data URL.
 *
 * @param {SVGSVGElement} svg - nodo del lienzo (conviene uno con el encuadre completo)
 * @param {number} [escala] - multiplicador de resolución
 * @returns {Promise<string>} data URL `data:image/png;base64,…`
 */
export const exportarPng = async (svg, escala = 2) => {
  if (!svg) throw new Error('No hay lienzo que exportar.');

  const clon = await prepararClon(svg);
  const texto = new XMLSerializer().serializeToString(clon);
  const imagen = await comoImagen(texto);

  const pintar = (factor) => {
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(PLANTILLA_ANCHO * factor);
    lienzo.height = Math.round(PLANTILLA_ALTO * factor);

    const ctx = lienzo.getContext('2d');
    // El escaneo trae zonas transparentes; sin fondo blanco el PNG sale oscuro
    // sobre cualquier visor que use un tema oscuro.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    return lienzo.toDataURL('image/png');
  };

  let dataUrl = pintar(escala);

  // El fondo es un escaneo con ruido y comprime mal: si el archivo se acerca al
  // tope del backend se rebaja la resolución antes de intentar subirlo.
  for (let factor = escala; pesoDe(dataUrl) > OBJETIVO_BYTES && factor > 0.75; ) {
    factor = factor <= 1 ? 0.75 : factor - 0.5;
    dataUrl = pintar(factor);
  }

  if (pesoDe(dataUrl) > TOPE_BYTES) {
    throw new Error('La imagen del mapeo resultó demasiado pesada para guardarse.');
  }

  return dataUrl;
};

/** Descargar el mapeo como archivo, sin pasar por el servidor. */
export const descargarPng = async (svg, nombre = 'mapeo-venoso.png') => {
  const dataUrl = await exportarPng(svg);
  const enlace = document.createElement('a');
  enlace.href = dataUrl;
  enlace.download = nombre;
  enlace.click();
};
