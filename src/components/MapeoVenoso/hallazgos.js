/**
 * Catálogo clínico del mapeo venoso: fuente única de verdad para las
 * herramientas, los colores y los símbolos.
 *
 * El médico elige el *hallazgo*, no el color. Así el mapeo genera información
 * estructurada ("perforante insuficiente en MII cara antero-interna") en lugar
 * de un dibujo cuya lectura dependa de quién lo trazó.
 *
 * Cada hallazgo se distingue por color **y** por forma o patrón de línea: el
 * mapeo se imprime a menudo en blanco y negro y debe seguir siendo legible,
 * y el color por sí solo tampoco sirve para un médico con daltonismo.
 *
 * Los colores salen de la paleta de marca declarada en src/index.css
 * (--brand-deep, --brand-slate, --color-danger, --color-success) más dos tonos
 * añadidos para completar la leyenda sin repetir matices.
 */

/** Trazos: recorridos venosos que se dibujan a mano alzada o por puntos. */
const TRAZOS = [
  {
    id: 'safena_interna',
    label: 'Safena interna (Mayor)',
    abrev: 'SI',
    color: '#0C7D8C',
    grosor: 3,
    // `null` = línea continua; el resto son patrones de stroke-dasharray
    patron: null,
    ayuda: 'Trayecto de la vena safena mayor.',
  },
  {
    id: 'safena_externa',
    label: 'Safena externa (Menor)',
    abrev: 'SE',
    color: '#243757',
    grosor: 3,
    patron: null,
    ayuda: 'Trayecto de la vena safena menor, cara posterior.',
  },
  {
    id: 'colateral',
    label: 'Colateral / tributaria',
    abrev: 'COL',
    color: '#3A5F6F',
    grosor: 2,
    patron: null,
    ayuda: 'Ramas tributarias que drenan a los troncos safenos.',
  },
  {
    id: 'varice',
    label: 'Vena varicosa',
    abrev: 'VAR',
    color: '#B43C32',
    grosor: 5,
    patron: null,
    ayuda: 'Dilatación varicosa visible o palpable.',
  },
  {
    id: 'reticular',
    label: 'Reticulares / telangiectasias',
    abrev: 'RET',
    color: '#8E5AA8',
    grosor: 2,
    patron: '5 4',
    ayuda: 'Red reticular y telangiectasias.',
  },
];

/**
 * Marcadores: hallazgos puntuales. `simbolo` referencia un <symbol> definido
 * en SimbolosHallazgo.jsx.
 */
const MARCADORES = [
  {
    id: 'perforante',
    label: 'Perforante insuficiente',
    abrev: 'P',
    color: '#B43C32',
    simbolo: 'aspa',
    ayuda: 'Perforante con reflujo. Se numera para correlacionar con el Ecodöppler.',
  },
  {
    id: 'cayado',
    label: 'Cayado (unión safeno-femoral / poplítea)',
    abrev: 'CAY',
    color: '#243757',
    simbolo: 'doble-circulo',
    ayuda: 'Unión safeno-femoral o safeno-poplítea.',
  },
  {
    id: 'trombo',
    label: 'Trombo / trombosis',
    abrev: 'TR',
    color: '#1B2A42',
    simbolo: 'rombo',
    ayuda: 'Segmento trombosado.',
  },
  {
    id: 'ulcera',
    label: 'Úlcera',
    abrev: 'ULC',
    color: '#B43C32',
    simbolo: 'circulo-relleno',
    ayuda: 'Úlcera venosa activa o cicatrizada.',
  },
  {
    id: 'puncion',
    label: 'Punto de punción / escleroterapia',
    abrev: 'PN',
    color: '#6B8F71',
    simbolo: 'punto',
    ayuda: 'Sitio de punción previsto o ya tratado.',
  },
];

export const HALLAZGOS_TRAZO = TRAZOS.map(h => ({ ...h, tipo: 'trazo' }));
export const HALLAZGOS_MARCADOR = MARCADORES.map(h => ({ ...h, tipo: 'marcador' }));

/** Todos los hallazgos de la leyenda, en el orden en que se muestran. */
export const HALLAZGOS = [...HALLAZGOS_TRAZO, ...HALLAZGOS_MARCADOR];

const POR_ID = Object.fromEntries(HALLAZGOS.map(h => [h.id, h]));

/** Hallazgo por id, o `null` si el objeto usa color libre. */
export const hallazgoDe = (id) => POR_ID[id] || null;

/** Hallazgo por defecto de cada herramienta al abrir el editor. */
export const HALLAZGO_TRAZO_INICIAL = 'safena_interna';
export const HALLAZGO_MARCADOR_INICIAL = 'perforante';

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

/** Colores libres para lo que no encaje en la leyenda clínica. */
export const COLORES_LIBRES = [
  '#243757', '#3A5F6F', '#0C7D8C', '#6B8F71',
  '#B8963E', '#B43C32', '#8E5AA8', '#1B2A42',
];

/** Color y grosor con que se dibuja un objeto, según su hallazgo o su color libre. */
export const estiloDe = (objeto) => {
  const hallazgo = hallazgoDe(objeto.hallazgo);
  return {
    color: objeto.color || hallazgo?.color || '#243757',
    grosor: objeto.grosor ?? hallazgo?.grosor ?? 3,
    patron: hallazgo?.patron || null,
  };
};
