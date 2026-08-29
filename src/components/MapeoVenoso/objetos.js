/**
 * Modelo de datos del mapeo venoso.
 *
 * En el documento guardado las coordenadas van **normalizadas 0-1** respecto a
 * la plantilla, no en píxeles: así cambiar la plantilla por una versión de
 * mayor resolución (o vectorizada) no invalida los mapeos ya archivados.
 * El editor trabaja en unidades del viewBox y convierte en la frontera.
 *
 * Tipos de objeto. `color`, `trayecto` y `marcador` son referencias al
 * catálogo ('rojo', 'epifascial', 'perforante'), no valores de dibujo: lo que
 * se archiva es la lectura clínica, y el hexadecimal con que se pinta puede
 * afinarse después sin reinterpretar los mapeos ya guardados.
 *
 *   trazo      { puntos: [[x,y], …], color, trayecto, grosor? }
 *   marcador   { x, y, color, marcador, numero, zona }
 *   anotacion  { x, y, texto, numero, zona }
 *   texto      { x, y, texto, tamano, color? }
 *
 * Los mapeos anteriores a la separación en tres ejes traen en su lugar un
 * `hallazgo` y un `color` hexadecimal. Se leen tal cual y se vuelven a guardar
 * tal cual: reescribirlos al vocabulario nuevo cambiaría lo que el médico firmó.
 */

import { PLANTILLA_ANCHO, PLANTILLA_ALTO, PLANTILLA_ID, zonaDe } from './zonas';

/** Versión del formato. Si algún día cambia la forma, se migra al leer. */
export const VERSION_DOCUMENTO = 1;

/** Tope defensivo: coincide con la validación del backend. */
export const MAX_OBJETOS = 500;

const redondear = (n) => Math.round(n * 10000) / 10000;
const acotar01 = (n) => Math.min(1, Math.max(0, n));

/* ── Conversión entre unidades del viewBox y coordenadas normalizadas ────── */

export const aVistaX = (n) => n * PLANTILLA_ANCHO;
export const aVistaY = (n) => n * PLANTILLA_ALTO;

/** Posición absoluta: se acota al lienzo para no perder objetos fuera del papel. */
export const aNormX = (v) => acotar01(v / PLANTILLA_ANCHO);
export const aNormY = (v) => acotar01(v / PLANTILLA_ALTO);

/**
 * Desplazamiento relativo. A diferencia de las posiciones, un delta **no** se
 * acota: puede ser negativo, y recortarlo a 0-1 impediría mover un objeto
 * hacia la izquierda o hacia arriba.
 */
export const aNormDX = (v) => v / PLANTILLA_ANCHO;
export const aNormDY = (v) => v / PLANTILLA_ALTO;

/* ── Creación ────────────────────────────────────────────────────────────── */

let contador = 0;
/** Id corto y único dentro de la sesión; no necesita ser global. */
export const crearId = () => `o${Date.now().toString(36)}${(contador++).toString(36)}`;

/**
 * Objetos que llevan numeración correlativa visible. Marcadores y anotaciones
 * se numeran por separado para que el médico pueda decir "perforante 2" y
 * "nota 2" sin ambigüedad.
 */
const NUMERADOS = ['marcador', 'anotacion'];

/** Siguiente número libre para un tipo dentro de la colección. */
const siguienteNumero = (objetos, tipo) =>
  objetos.reduce((max, o) => (o.tipo === tipo && o.numero > max ? o.numero : max), 0) + 1;

/**
 * Renumera marcadores y anotaciones de forma estable (por orden de creación)
 * para que al borrar el nº 1 no queden huecos en la lista lateral.
 */
export const renumerar = (objetos) => {
  const contadores = {};
  return objetos.map(o => {
    if (!NUMERADOS.includes(o.tipo)) return o;
    contadores[o.tipo] = (contadores[o.tipo] || 0) + 1;
    return o.numero === contadores[o.tipo] ? o : { ...o, numero: contadores[o.tipo] };
  });
};

/**
 * Añadir un objeto: asigna id, número correlativo y zona anatómica.
 * Devuelve la misma colección si ya se alcanzó el tope de objetos.
 */
export const agregar = (objetos, objeto) => {
  if (objetos.length >= MAX_OBJETOS) return objetos;

  const completo = { id: crearId(), ...objeto };

  if (NUMERADOS.includes(completo.tipo)) {
    completo.numero = siguienteNumero(objetos, completo.tipo);
  }
  if (completo.x != null && completo.y != null) {
    completo.zona = zonaDe(completo.x, completo.y)?.id || null;
  }

  return [...objetos, completo];
};

export const eliminar = (objetos, id) => renumerar(objetos.filter(o => o.id !== id));

export const actualizar = (objetos, id, cambios) =>
  objetos.map(o => (o.id === id ? { ...o, ...cambios } : o));

/**
 * Desplazar un objeto. Los trazos mueven todos sus puntos; el resto, su ancla.
 * La zona se recalcula porque mover un marcador puede cambiarlo de vista.
 */
export const mover = (objetos, id, dx, dy) =>
  objetos.map(o => {
    if (o.id !== id) return o;

    if (o.tipo === 'trazo') {
      return {
        ...o,
        puntos: o.puntos.map(([x, y]) => [redondear(acotar01(x + dx)), redondear(acotar01(y + dy))]),
      };
    }

    const x = redondear(acotar01(o.x + dx));
    const y = redondear(acotar01(o.y + dy));
    return { ...o, x, y, zona: zonaDe(x, y)?.id || null };
  });

/* ── Fábricas de cada tipo ───────────────────────────────────────────────── */

/**
 * Trazo a partir de puntos en unidades del viewBox.
 * Devuelve null si el trazo no llegó a tener dos puntos distintos.
 */
export const crearTrazo = (puntosVista, { color, trayecto, grosor }) => {
  if (!puntosVista || puntosVista.length < 2) return null;
  return {
    tipo: 'trazo',
    color,
    trayecto,
    grosor,
    puntos: puntosVista.map(p => [redondear(aNormX(p.x)), redondear(aNormY(p.y))]),
  };
};

export const crearMarcador = (puntoVista, marcador, color) => ({
  tipo: 'marcador',
  marcador,
  color,
  x: redondear(aNormX(puntoVista.x)),
  y: redondear(aNormY(puntoVista.y)),
});

export const crearAnotacion = (puntoVista, texto) => ({
  tipo: 'anotacion',
  texto,
  x: redondear(aNormX(puntoVista.x)),
  y: redondear(aNormY(puntoVista.y)),
});

export const crearTexto = (puntoVista, texto, { color, tamano = 16 } = {}) => ({
  tipo: 'texto',
  texto,
  tamano,
  color,
  x: redondear(aNormX(puntoVista.x)),
  y: redondear(aNormY(puntoVista.y)),
});

/* ── Documento persistido ────────────────────────────────────────────────── */

/** Envolver los objetos en el documento que viaja al backend. */
export const crearDocumento = (objetos) => ({
  version: VERSION_DOCUMENTO,
  plantilla: PLANTILLA_ID,
  objetos,
});

const TIPOS = ['trazo', 'marcador', 'anotacion', 'texto'];

/**
 * Leer el documento guardado. Tolera `null` (historias anteriores a esta
 * función, que solo tienen el PNG) y descarta objetos con forma inesperada en
 * lugar de romper el editor: perder un trazo es preferible a dejar al médico
 * sin poder abrir el expediente.
 */
export const leerDocumento = (datos) => {
  if (!datos || !Array.isArray(datos.objetos)) return [];

  const validos = datos.objetos.filter(o => {
    if (!o || !TIPOS.includes(o.tipo)) return false;
    if (o.tipo === 'trazo') return Array.isArray(o.puntos) && o.puntos.length >= 2;
    return Number.isFinite(o.x) && Number.isFinite(o.y);
  });

  return renumerar(validos.slice(0, MAX_OBJETOS).map(o => ({ ...o, id: o.id || crearId() })));
};

/* ── Consultas para el panel lateral ─────────────────────────────────────── */

/** Anotaciones ordenadas por su número, para la lista lateral. */
export const anotacionesDe = (objetos) =>
  objetos.filter(o => o.tipo === 'anotacion').sort((a, b) => a.numero - b.numero);

/** Marcadores ordenados por su número. */
export const marcadoresDe = (objetos) =>
  objetos.filter(o => o.tipo === 'marcador').sort((a, b) => a.numero - b.numero);

/** Cuántos hallazgos (trazos + marcadores) hay en cada miembro. */
export const resumenPorMiembro = (objetos) => {
  const cuenta = { izq: 0, der: 0, sin: 0 };

  for (const o of objetos) {
    if (o.tipo === 'texto') continue;

    const zona = o.tipo === 'trazo'
      ? zonaDe(o.puntos[0][0], o.puntos[0][1])
      : zonaDe(o.x, o.y);

    if (zona) cuenta[zona.miembro] += 1;
    else cuenta.sin += 1;
  }

  return cuenta;
};
