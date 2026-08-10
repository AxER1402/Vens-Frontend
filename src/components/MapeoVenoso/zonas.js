/**
 * Zonas anatómicas de la plantilla de mapeo venoso.
 *
 * La plantilla (src/assets/mapeoVenoso.png) trae seis vistas de miembro
 * inferior repartidas en dos paneles. Cada objeto que el médico dibuja se
 * atribuye automáticamente a la vista donde cayó, y por eso el mapeo deja de
 * ser un dibujo y pasa a ser un dato: "perforante insuficiente en MII, cara
 * antero-interna" en vez de "una marca en el píxel 412,630".
 *
 * Los rectángulos están en coordenadas normalizadas (0-1) sobre la plantilla y
 * se calibraron midiendo dónde cae el contorno de cada silueta: el límite entre
 * dos vistas vecinas es el punto medio entre ellas, de modo que un marcador
 * puesto un poco fuera del contorno igual se atribuye bien.
 *
 * La franja central (0.480 - 0.530) separa los dos paneles y a propósito no
 * pertenece a ninguna zona: un clic ahí no está sobre ningún miembro.
 */

/**
 * Sistema de unidades del viewBox. **No** es el tamaño en píxeles del archivo:
 * es una rejilla propia con la misma relación de aspecto que la plantilla.
 *
 * Mantenerlo fijo es deliberado. Los grosores de trazo se guardan en estas
 * unidades, así que cambiar la plantilla por otra de distinta resolución no
 * altera el grosor de los mapeos ya archivados. Solo habría que tocarlo si
 * cambiara la relación de aspecto.
 */
export const PLANTILLA_ANCHO = 1450;
export const PLANTILLA_ALTO = 848;

/** Identificador de la plantilla que se guarda junto al mapeo. */
export const PLANTILLA_ID = 'merit-mmii-6-vistas';

export const MIEMBROS = {
  izq: { id: 'izq', abrev: 'MII', label: 'Miembro inferior izquierdo' },
  der: { id: 'der', abrev: 'MID', label: 'Miembro inferior derecho' },
};

/**
 * @typedef {Object} Zona
 * @property {string} id
 * @property {'izq'|'der'} miembro
 * @property {string} cara
 * @property {[number, number, number, number]} rect - [x0, y0, x1, y1] normalizado
 */

/** @type {Zona[]} */
export const ZONAS = [
  { id: 'izq_posterior',      miembro: 'izq', cara: 'Cara posterior',      rect: [0.000, 0.078, 0.162, 0.923] },
  { id: 'izq_antero_interna', miembro: 'izq', cara: 'Cara antero-interna', rect: [0.162, 0.078, 0.343, 0.923] },
  { id: 'izq_antero_externa', miembro: 'izq', cara: 'Cara antero-externa', rect: [0.343, 0.078, 0.480, 0.923] },
  { id: 'der_antero_externa', miembro: 'der', cara: 'Cara antero-externa', rect: [0.530, 0.078, 0.666, 0.923] },
  { id: 'der_antero_interna', miembro: 'der', cara: 'Cara antero-interna', rect: [0.666, 0.078, 0.847, 0.923] },
  { id: 'der_posterior',      miembro: 'der', cara: 'Cara posterior',      rect: [0.847, 0.078, 1.000, 0.923] },
];

/** Índice por id para no recorrer el arreglo en cada consulta. */
const POR_ID = Object.fromEntries(ZONAS.map(z => [z.id, z]));

/**
 * Zona que contiene un punto normalizado, o null si cayó fuera de las vistas
 * (franja divisoria, cabecera de títulos o pie de etiquetas).
 *
 * @param {number} x - 0-1
 * @param {number} y - 0-1
 * @returns {Zona|null}
 */
export const zonaDe = (x, y) =>
  ZONAS.find(({ rect: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1) || null;

/**
 * Etiqueta legible de una zona: "MII · Cara antero-interna".
 * Devuelve 'Sin zona' cuando el objeto no cayó sobre ninguna vista.
 */
export const etiquetaZona = (zonaId) => {
  const zona = POR_ID[zonaId];
  if (!zona) return 'Sin zona';
  return `${MIEMBROS[zona.miembro].abrev} · ${zona.cara}`;
};

/** Miembro ('izq' | 'der') al que pertenece una zona, o null. */
export const miembroDeZona = (zonaId) => POR_ID[zonaId]?.miembro || null;

/**
 * Encuadre de un miembro completo para el zoom rápido "ver MII / ver MID".
 * Se devuelve en unidades del viewBox, con un margen para que la pierna no
 * quede pegada al borde.
 *
 * @param {'izq'|'der'} miembro
 * @returns {{x: number, y: number, ancho: number, alto: number}}
 */
export const encuadreMiembro = (miembro) => {
  const zonas = ZONAS.filter(z => z.miembro === miembro);
  const x0 = Math.min(...zonas.map(z => z.rect[0]));
  const x1 = Math.max(...zonas.map(z => z.rect[2]));
  const margen = 0.012;

  return {
    x: Math.max(0, x0 - margen) * PLANTILLA_ANCHO,
    y: 0,
    ancho: Math.min(1, x1 - x0 + margen * 2) * PLANTILLA_ANCHO,
    alto: PLANTILLA_ALTO,
  };
};

/** Encuadre completo de la plantilla. */
export const ENCUADRE_COMPLETO = {
  x: 0,
  y: 0,
  ancho: PLANTILLA_ANCHO,
  alto: PLANTILLA_ALTO,
};
