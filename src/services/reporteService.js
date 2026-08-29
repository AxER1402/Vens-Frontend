import api from './api';

/**
 * Informes clínicos imprimibles: vista previa y descarga.
 *
 * La API se autentica con un token Bearer, así que un <a href> pelado **no**
 * sirve: el navegador pediría la URL sin la cabecera Authorization y recibiría
 * un 401. Todo pasa por axios como blob, y de ahí sale tanto el archivo
 * guardado como la URL temporal que alimenta la vista previa.
 */

/* ── Descriptores ─────────────────────────────────────────────────────────
 *
 * Cada informe se describe una sola vez —ruta, formatos y cómo se titula— y
 * ese descriptor es lo que viaja al diálogo de vista previa. Así el diálogo no
 * sabe nada de rutas y añadir un informe nuevo no lo obliga a cambiar.
 */

/** Nombre legible de cada parte, para describir el informe compuesto. */
const NOMBRE_PARTE = {
  historia: 'la consulta',
  mapeo: 'el mapeo venoso',
  doppler: 'el Ecodöppler',
};

/**
 * Informe de una consulta con las partes elegidas.
 *
 * Se emite **un solo documento** con lo que se pida —la consulta, el mapeo
 * venoso y el Ecodöppler— en lugar de tres descargas que después habría que
 * juntar a mano. Sin `partes` se incluye todo lo que la consulta tenga.
 *
 * @param {number} historiaId
 * @param {{partes?: Array<'historia'|'mapeo'|'doppler'>}} opciones
 */
export const reporteHistoriaClinica = (historiaId, { partes } = {}) => {
  const lista = partes?.length ? partes : null;
  const nombres = (lista ?? ['historia']).map((p) => NOMBRE_PARTE[p] ?? p);
  const ultimo = nombres.pop();

  // El mapeo en solitario se emite apaisado y con su propio título; el resto de
  // combinaciones salen como informe de la consulta.
  const soloMapeo = lista?.length === 1 && lista[0] === 'mapeo';
  const soloDoppler = lista?.length === 1 && lista[0] === 'doppler';

  return {
    clave: `informe-${historiaId}-${(lista ?? ['todo']).join('-')}`,
    titulo: soloMapeo ? 'Mapeo venoso' : soloDoppler ? 'Reporte de Ecodöppler' : 'Historia clínica',
    descripcion: lista
      ? `Incluye ${nombres.length ? `${nombres.join(', ')} y ${ultimo}` : ultimo}.`
      : 'Incluye todo lo registrado en la consulta.',
    ruta: `/clinical-histories/${historiaId}/reporte`,
    params: lista ? { partes: lista.join(',') } : {},
    formatos: ['pdf', 'docx'],
  };
};

/**
 * Mapeo venoso de una consulta. Solo PDF: es una lámina a escala con su
 * leyenda, y en Word la imagen se convierte en un objeto flotante que se
 * desplaza al primer retoque y pierde la proporción con la que se imprime.
 */
export const reporteMapeoVenoso = (historiaId) => ({
  clave: `mapeo-${historiaId}`,
  titulo: 'Mapeo venoso',
  descripcion: 'Lámina del mapeo con su leyenda y la tabla de hallazgos numerados.',
  ruta: `/clinical-histories/${historiaId}/mapeo-venoso/reporte`,
  params: {},
  formatos: ['pdf'],
});

/** Reporte de Ecodöppler venoso de miembros inferiores. */
export const reporteEcodoppler = (estudioId) => ({
  clave: `doppler-${estudioId}`,
  titulo: 'Reporte de Ecodöppler',
  descripcion: 'Hallazgos de ambos miembros inferiores y conclusión del estudio.',
  ruta: `/doppler-reports/${estudioId}/reporte`,
  params: {},
  formatos: ['pdf', 'docx'],
});

/* ── Descarga y vista previa ─────────────────────────────────────────────── */

const TIPOS = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const NOMBRES_POR_DEFECTO = {
  pdf: 'reporte.pdf',
  docx: 'reporte.docx',
};

/**
 * Nombre con el que el servidor bautiza el archivo.
 *
 * Viaja en Content-Disposition, cabecera que el navegador solo deja leer si el
 * backend la expone en CORS (config/cors.php → exposed_headers). Si no llega, se
 * usa un nombre genérico antes que fallar.
 */
const nombreDeLaRespuesta = (respuesta, formato) => {
  const cabecera = respuesta.headers['content-disposition'] ?? '';
  const coincidencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecera);

  return coincidencia ? decodeURIComponent(coincidencia[1]) : NOMBRES_POR_DEFECTO[formato];
};

/**
 * Cuando la petición se pide como blob, el cuerpo de un error también llega
 * como blob: sin esto, un 404 «esta consulta no tiene mapeo» se mostraría como
 * "[object Blob]" en lugar del mensaje que escribió el backend.
 */
const mensajeDelError = async (error) => {
  const cuerpo = error?.response?.data;

  if (cuerpo instanceof Blob) {
    try {
      const { message } = JSON.parse(await cuerpo.text());
      if (message) return message;
    } catch {
      // El cuerpo no era JSON; se cae al mensaje genérico de abajo
    }
  }

  if (error?.response?.status === 404) return 'El informe pedido no está disponible.';
  if (error?.response?.status === 403) return 'No tiene permiso para emitir este informe.';

  return 'No se pudo generar el informe. Intente de nuevo.';
};

/**
 * Pedir un informe al servidor.
 *
 * @returns {Promise<{blob: Blob, nombre: string, url: string}>} `url` es una URL
 *   de objeto que **debe** liberarse con URL.revokeObjectURL cuando se deje de
 *   usar: mientras viva, el navegador retiene el archivo entero en memoria.
 */
export const obtenerReporte = async (reporte, formato = 'pdf') => {
  try {
    const respuesta = await api.get(reporte.ruta, {
      params: { formato, ...reporte.params },
      responseType: 'blob',
    });

    // El tipo se fuerza porque algunos servidores devuelven el blob sin él, y
    // sin un type correcto el visor del navegador no reconoce el PDF.
    const blob = new Blob([respuesta.data], { type: TIPOS[formato] });

    return {
      blob,
      nombre: nombreDeLaRespuesta(respuesta, formato),
      url: URL.createObjectURL(blob),
    };
  } catch (error) {
    throw new Error(await mensajeDelError(error));
  }
};

/** Entregar un blob al navegador como descarga. */
export const guardarArchivo = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // Liberar en el siguiente ciclo: revocarla de inmediato cancela la descarga
  // en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Pedir un informe y guardarlo, sin pasar por la vista previa. */
export const descargarReporte = async (reporte, formato = 'pdf') => {
  const { blob, nombre, url } = await obtenerReporte(reporte, formato);

  URL.revokeObjectURL(url);   // aquí solo interesa el archivo
  guardarArchivo(blob, nombre);

  return nombre;
};

/* ── Atajos por informe ───────────────────────────────────────────────────── */

export const descargarHistoriaClinica = (historiaId, { formato = 'pdf', partes } = {}) =>
  descargarReporte(reporteHistoriaClinica(historiaId, { partes }), formato);

export const descargarMapeoVenoso = (historiaId) =>
  descargarReporte(reporteMapeoVenoso(historiaId), 'pdf');

export const descargarEcodoppler = (estudioId, { formato = 'pdf' } = {}) =>
  descargarReporte(reporteEcodoppler(estudioId), formato);
