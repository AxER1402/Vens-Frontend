/**
 * Catálogo clínico del mapeo venoso: los tres ejes con los que se dibuja.
 *
 * La lámina de la clínica no describe "hallazgos" sino tres cosas independientes,
 * y el editor las respeta porque es así como el médico ya lee la hoja:
 *
 *   · el **color** dice en qué estado está el vaso (competente, refluyente,
 *     trombosado…). Es el diagnóstico, no un gusto;
 *   · el **trayecto** dice qué clase de recorrido es y en qué plano corre;
 *   · el **marcador** es lo que se señala en un punto y no a lo largo de una línea.
 *
 * Separarlos evita una lista de veinte combinaciones fijas: una safena
 * hipoplásica puede estar sana o refluyente, y son dos elecciones distintas.
 *
 * Cada entrada lleva `label` —el nombre tal cual aparece en la lámina impresa,
 * que es el que el médico reconoce— y `ayuda`, que lo explica. El editor los
 * muestra juntos al pasar el puntero por encima.
 *
 * Esta es una copia local del catálogo que sirve el backend en
 * GET /api/v1/venous-map/catalog; la copia autoritativa es la suya, y
 * venousMapService.avisarSiElCatalogoDivergió() avisa en desarrollo si las dos
 * se separan. Un id que el backend no conozca hace que el guardado devuelva 422.
 */

/* ── Colores: significado clínico del vaso ───────────────────────────────── */

export const COLORES = [
  // No está en la lámina impresa: es el azul de la interfaz (--brand-deep),
  // para trazar un recorrido como referencia anatómica sin afirmar todavía en
  // qué estado está la vena. Va primero y es el que trae el editor al abrirse,
  // porque empezar en azul «competente» pondría en el expediente un
  // diagnóstico que el médico no ha hecho.
  { id: 'auto',     label: 'Auto',     hex: '#243757', ayuda: 'Referencia anatómica, sin lectura clínica asignada.' },
  { id: 'azul',     label: 'Azul',     hex: '#1F6FB2', ayuda: 'Vena competente / flujo fisiológico.' },
  { id: 'rojo',     label: 'Rojo',     hex: '#C1272D', ayuda: 'Vena incompetente / reflujo patológico.' },
  { id: 'negro',    label: 'Negro',    hex: '#1A1A1A', ayuda: 'Vena trombosada.' },
  { id: 'gris',     label: 'Gris',     hex: '#8C8C8C', ayuda: 'Vena ablacionada (quirúrgica o térmica).' },
  { id: 'verde',    label: 'Verde',    hex: '#1E7A3C', ayuda: 'Estructuras linfáticas / ganglios.' },
  // Más saturado que el amarillo de la hoja impresa: sobre el blanco de la
  // pantalla el amarillo puro se pierde y el trazo deja de verse.
  { id: 'amarillo', label: 'Amarillo', hex: '#E0A800', ayuda: 'Estructuras no vasculares (nervios, quiste de Baker).' },
];

/* ── Trayectos: cómo se dibuja un recorrido venoso ───────────────────────── */

/**
 * Los dos troncos safenos y los dos primeros patrones se expresan con una línea
 * lisa o un stroke-dasharray, que es lo que entiende SVG directamente. Los
 * otros tres no —una onda, una cadena de equis y
 * una línea doble no son un patrón de guiones—, así que se dibujan con la
 * geometría que describe `render` + `parametros`, en trazos.js.
 *
 * Los `parametros` van en unidades del viewBox de la plantilla, igual que el
 * grosor: la onda es una propiedad del dibujo y no debe cambiar de tamaño según
 * el zoom que tenga el médico en pantalla.
 */
export const TRAYECTOS = [
  // Los dos troncos con nombre propio van primero: son los que el médico nombra
  // en el informe y los que se correlacionan segmento a segmento con el
  // Ecodöppler. Se dibujan como línea continua, que es como corre una safena
  // por su compartimento fascial.
  {
    id: 'safena_interna',
    label: 'Safena interna (Mayor)',
    abrev: 'SI',
    grosor: 3,
    patron: null,
    render: 'linea',
    parametros: {},
    ayuda: 'Tronco safeno magno, de la cara interna del miembro.',
  },
  {
    id: 'safena_externa',
    label: 'Safena externa (Menor)',
    abrev: 'SE',
    grosor: 3,
    patron: null,
    render: 'linea',
    parametros: {},
    ayuda: 'Tronco safeno parvo, de la cara posterior de la pierna.',
  },
  {
    id: 'subfascial',
    label: 'Trayecto subfascial / intrafascial',
    abrev: 'SUB',
    grosor: 3,
    patron: null,                 // null = línea continua
    render: 'linea',
    parametros: {},
    ayuda: 'Vena dentro de su compartimento fascial.',
  },
  {
    id: 'epifascial',
    label: 'Trayecto epifascial (solo patológico)',
    abrev: 'EPI',
    grosor: 3,
    patron: null,
    render: 'ondulado',
    parametros: { amplitud: 3, longitud: 9 },
    // La lámina lo reserva a lo patológico, así que al elegirlo el editor
    // propone el rojo. No se impone: el médico puede cambiarlo.
    soloPatologico: true,
    ayuda: 'Vena por fuera de la fascia; en la lámina solo se traza cuando es patológica.',
  },
  {
    id: 'hipoplasico',
    label: 'Trayecto subfascial hipoplásico',
    abrev: 'HIPO',
    grosor: 3,
    patron: '9 7',
    render: 'linea',
    parametros: {},
    ayuda: 'Segmento de calibre reducido respecto al resto del trayecto.',
  },
  {
    id: 'aplasico',
    label: 'Trayecto subfascial aplásico o vena ablacionada',
    abrev: 'APL',
    grosor: 1.5,
    patron: '1 3',
    render: 'linea',
    parametros: {},
    ayuda: 'Segmento ausente, o abolido por ablación quirúrgica o térmica.',
  },
  {
    id: 'adherencias',
    label: 'Trayecto con adherencias',
    abrev: 'ADH',
    grosor: 1.5,
    patron: null,
    render: 'cruces',
    // Las equis se tocan punta con punta, como en la lámina impresa. El paso va
    // atado al alto: por debajo de ~5.5 se solapan y el trayecto pasa a leerse
    // como una cinta continua, y por encima de ~8 se separan tanto que se
    // confunden con la línea de puntos del trayecto aplásico.
    parametros: { paso: 6.5, alto: 8 },
    ayuda: 'Trayecto fijado a los planos vecinos por adherencias.',
  },
  {
    id: 'engrosamiento',
    label: 'Engrosamiento de pared',
    abrev: 'ENG',
    grosor: 1.5,
    patron: null,
    render: 'doble',
    // Con menos separación las dos líneas se tocan al engrosar el trazo y el
    // engrosamiento de pared se vuelve indistinguible de una línea gruesa.
    parametros: { separacion: 5 },
    ayuda: 'Pared engrosada respecto al resto del trayecto.',
  },
];

/* ── Marcadores: hallazgos puntuales ─────────────────────────────────────── */

/**
 * `simbolo` referencia una forma declarada en SimbolosMapeo.jsx, que se dibuja
 * con `currentColor`: así el mismo símbolo sirve para las seis lecturas
 * clínicas sin duplicar la lista.
 *
 * `tamano` va en unidades del viewBox y no lo elige el médico: en un mapeo el
 * tamaño de una marca no significa nada —la extensión se dibuja con un trazo, no
 * agrandando un círculo—, y dejarlo variable solo conseguiría que dos
 * perforantes iguales se leyeran como distintas.
 */
export const MARCADORES = [
  {
    id: 'perforante',
    label: 'Vena perforante',
    abrev: 'PERF',
    simbolo: 'circulo',
    colorPorDefecto: 'azul',
    tamano: 16,
    ayuda: 'Se numera para correlacionarla con el Ecodöppler.',
  },
  {
    id: 'golfo_venoso',
    label: 'Golfo venoso',
    abrev: 'GV',
    simbolo: 'golfo',
    colorPorDefecto: 'negro',
    tamano: 18,
    ayuda: 'Dilatación sacular sobre el trayecto venoso.',
  },
  {
    id: 'no_venosa',
    label: 'Estructura no venosa',
    abrev: 'ENV',
    simbolo: 'elipse',
    colorPorDefecto: 'azul',
    tamano: 18,
    ayuda: 'Nervio, quiste de Baker, adenopatía u otra estructura no venosa.',
  },
  {
    id: 'safenectomia',
    label: 'Safenectomía / Crosectomía',
    abrev: 'SAF',
    simbolo: 'escalera',
    colorPorDefecto: 'negro',
    tamano: 22,
    ayuda: 'Segmento resecado o cayado ligado en una cirugía previa.',
  },
  {
    id: 'ulcera',
    label: 'Úlcera',
    abrev: 'ULC',
    simbolo: 'ulcera',
    colorPorDefecto: 'negro',
    tamano: 24,
    ayuda: 'Úlcera venosa activa o cicatrizada.',
  },
];

/* ── Vocabulario heredado ────────────────────────────────────────────────── */

/**
 * Antes de separar los tres ejes, un solo `hallazgo` mezclaba color, patrón y
 * símbolo. El editor ya no lo ofrece, pero sigue sabiendo leerlo: los mapeos
 * archivados con él tienen que poder reabrirse y reimprimirse tal y como se
 * firmaron. Borrar esta lista no borraría esos documentos, los dejaría sin
 * nombre y sin color.
 *
 * No añadir entradas aquí.
 */
export const HALLAZGOS_LEGACY = [
  { id: 'safena_interna', tipo: 'trazo',    label: 'Safena interna (Mayor)',                     color: '#0C7D8C', grosor: 3, patron: null,  simbolo: null },
  { id: 'safena_externa', tipo: 'trazo',    label: 'Safena externa (Menor)',                     color: '#243757', grosor: 3, patron: null,  simbolo: null },
  { id: 'colateral',      tipo: 'trazo',    label: 'Colateral / tributaria',                     color: '#3A5F6F', grosor: 2, patron: null,  simbolo: null },
  { id: 'varice',         tipo: 'trazo',    label: 'Vena varicosa',                              color: '#B43C32', grosor: 5, patron: null,  simbolo: null },
  { id: 'reticular',      tipo: 'trazo',    label: 'Reticulares / telangiectasias',              color: '#8E5AA8', grosor: 2, patron: '5 4', simbolo: null },
  { id: 'perforante',     tipo: 'marcador', label: 'Perforante insuficiente',                    color: '#B43C32', grosor: null, patron: null, simbolo: 'aspa' },
  { id: 'cayado',         tipo: 'marcador', label: 'Cayado (unión safeno-femoral / poplítea)',   color: '#243757', grosor: null, patron: null, simbolo: 'doble-circulo' },
  { id: 'trombo',         tipo: 'marcador', label: 'Trombo / trombosis',                         color: '#1B2A42', grosor: null, patron: null, simbolo: 'rombo' },
  { id: 'ulcera',         tipo: 'marcador', label: 'Úlcera',                                     color: '#B43C32', grosor: null, patron: null, simbolo: 'circulo-relleno' },
  { id: 'puncion',        tipo: 'marcador', label: 'Punto de punción / escleroterapia',          color: '#6B8F71', grosor: null, patron: null, simbolo: 'punto' },
];

/* ── Índices y consultas ─────────────────────────────────────────────────── */

const indexar = (lista) => Object.fromEntries(lista.map(e => [e.id, e]));

const COLOR_POR_ID = indexar(COLORES);
const TRAYECTO_POR_ID = indexar(TRAYECTOS);
const MARCADOR_POR_ID = indexar(MARCADORES);
const LEGACY_POR_ID = indexar(HALLAZGOS_LEGACY);

export const colorDe = (id) => COLOR_POR_ID[id] || null;
export const trayectoDe = (id) => TRAYECTO_POR_ID[id] || null;
export const marcadorDe = (id) => MARCADOR_POR_ID[id] || null;
export const hallazgoLegacyDe = (id) => LEGACY_POR_ID[id] || null;

/** Tono con el que se pinta un color del catálogo. */
export const hexDe = (id) => COLOR_POR_ID[id]?.hex || null;

/** Lo que el color significa, para el rótulo bajo la paleta y los títulos. */
export const significadoDe = (id) => COLOR_POR_ID[id]?.ayuda || '';

const esHex = (valor) => typeof valor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(valor);

/**
 * Con qué empieza el editor. El color arranca en «Auto» a propósito: es el
 * único que no afirma nada, y dibujar sin haber elegido no debe archivar un
 * diagnóstico que el médico no ha hecho.
 */
export const COLOR_INICIAL = 'auto';
export const TRAYECTO_INICIAL = 'safena_interna';
export const MARCADOR_INICIAL = 'perforante';

/** Respaldo cuando un objeto llega sin color reconocible. */
const COLOR_POR_OMISION = '#243757';

/**
 * Cómo se pinta un objeto: color, grosor y patrón de línea.
 *
 * Resuelve los dos vocabularios. En el nuevo el color es una referencia al
 * catálogo ('rojo') y el patrón sale del trayecto; en el heredado el color era
 * un hexadecimal suelto y todo lo demás venía del propio hallazgo.
 */
export const estiloDe = (objeto) => {
  const legado = hallazgoLegacyDe(objeto.hallazgo);
  const trayecto = trayectoDe(objeto.trayecto);
  const marcador = marcadorDe(objeto.marcador);

  const color =
    hexDe(objeto.color ?? marcador?.colorPorDefecto)
    ?? (esHex(objeto.color) ? objeto.color : null)
    ?? legado?.color
    ?? COLOR_POR_OMISION;

  return {
    color,
    grosor: objeto.grosor ?? trayecto?.grosor ?? legado?.grosor ?? 3,
    patron: trayecto?.patron ?? legado?.patron ?? null,
    render: trayecto?.render ?? 'linea',
    parametros: trayecto?.parametros ?? {},
  };
};

/** Nombre legible de un objeto, para los títulos y la lista lateral. */
export const descripcionDe = (objeto) => {
  if (objeto.tipo === 'trazo') {
    return trayectoDe(objeto.trayecto)?.label
      ?? hallazgoLegacyDe(objeto.hallazgo)?.label
      ?? 'Trazo';
  }

  return marcadorDe(objeto.marcador)?.label
    ?? hallazgoLegacyDe(objeto.hallazgo)?.label
    ?? 'Marcador';
};

/** Forma con la que se dibuja un marcador, resolviendo el vocabulario heredado. */
export const simboloDe = (objeto) =>
  marcadorDe(objeto.marcador)?.simbolo
  ?? hallazgoLegacyDe(objeto.hallazgo)?.simbolo
  ?? 'punto';

/** Lado del marcador en unidades del viewBox. */
export const tamanoDe = (objeto) => marcadorDe(objeto.marcador)?.tamano ?? 26;

/* ── Barra de herramientas ───────────────────────────────────────────────── */

/**
 * Herramientas de la barra lateral.
 * `atajo` es la tecla suelta que la activa (sin modificadores).
 */
export const HERRAMIENTAS = [
  { id: 'seleccionar', label: 'Seleccionar',  atajo: 'v', ayuda: 'Mover o borrar objetos ya dibujados.' },
  { id: 'trazo',       label: 'Trazo libre',  atajo: 'b', ayuda: 'Dibujar a mano alzada.' },
  { id: 'trayecto',    label: 'Trayecto',     atajo: 'l', ayuda: 'Clic a clic para un recorrido limpio. Esc o doble clic para cerrar.' },
  { id: 'marcador',    label: 'Marcador',     atajo: 'm', ayuda: 'Colocar un hallazgo puntual numerado.' },
  { id: 'anotacion',   label: 'Comentario',   atajo: 'c', ayuda: 'Anclar una nota escrita a un punto del mapa.' },
  { id: 'texto',       label: 'Texto',        atajo: 't', ayuda: 'Escribir una etiqueta corta sobre el mapa.' },
  { id: 'borrar',      label: 'Borrar',       atajo: 'e', ayuda: 'Clic sobre un objeto para eliminarlo.' },
];

/** Grosores ofrecidos en la barra (unidades del viewBox). */
export const GROSORES = [1.5, 3, 5, 8];
