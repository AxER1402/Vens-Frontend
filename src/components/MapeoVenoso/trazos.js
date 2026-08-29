/**
 * Geometría de los patrones de trayecto que SVG no sabe dibujar solo.
 *
 * Tres de los seis trayectos de la lámina no son un patrón de guiones y por
 * tanto no caben en un `stroke-dasharray`: la onda del epifascial, la cadena de
 * equis de las adherencias y la línea doble del engrosamiento de pared. Aquí se
 * convierten los puntos del trazo en el `d` de un <path>.
 *
 * Todo trabaja en unidades del viewBox de la plantilla, las mismas del grosor.
 * La onda y las equis son propiedades del dibujo, no de la pantalla: si se
 * escalaran con el zoom, un mismo trazo se leería distinto según cómo tuviera
 * el médico la vista, y el PNG archivado no coincidiría con lo que vio.
 *
 * Las funciones devuelven `null` cuando el trazo es demasiado corto para que el
 * patrón se distinga; quien llama pinta entonces la línea lisa, que es
 * preferible a no pintar nada.
 */

const r = (n) => Math.round(n * 100) / 100;

/**
 * Puntos repartidos cada `paso` a lo largo de la polilínea, con el vector
 * unitario de avance en cada uno y `s`, la distancia recorrida **desde el
 * principio del trazo**.
 *
 * Se recorre por longitud de arco y no por vértices porque los vértices de un
 * trazo a mano alzada están tan juntos y tan desigualmente repartidos que
 * apoyarse en ellos daría una onda que se comprime en las curvas.
 *
 * Que `s` sea acumulada y no relativa al segmento es lo que hace que la onda
 * tenga onda. Midiéndola dentro del segmento, la fase se reinicia en cada
 * vértice: al dibujar despacio el editor va dejando puntos cada dos o tres
 * unidades, la fase nunca llega a completar un período de nueve, y el trayecto
 * epifascial sale casi recto.
 */
const muestrear = (puntos, paso) => {
  const muestras = [];
  if (!Array.isArray(puntos) || puntos.length < 2 || !(paso > 0)) return muestras;

  let restante = 0;    // distancia que falta hasta la próxima muestra
  let recorrido = 0;   // longitud acumulada hasta el inicio de este segmento

  for (let i = 1; i < puntos.length; i += 1) {
    const [x0, y0] = puntos[i - 1];
    const [x1, y1] = puntos[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const largo = Math.hypot(dx, dy);

    if (largo === 0) continue;

    const ux = dx / largo;
    const uy = dy / largo;

    let d = restante;
    while (d < largo) {
      muestras.push({ x: x0 + ux * d, y: y0 + uy * d, ux, uy, s: recorrido + d });
      d += paso;
    }

    restante = d - largo;
    recorrido += largo;
  }

  return muestras;
};

/** Longitud total de la polilínea. */
const longitudDe = (puntos) => {
  let total = 0;
  for (let i = 1; i < puntos.length; i += 1) {
    total += Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]);
  }
  return total;
};

/**
 * Normal unitaria en cada vértice, promediando la de los segmentos que llegan
 * y salen. Promediar es lo que evita que la línea doble se abra en las esquinas.
 */
const normalesDe = (puntos) => puntos.map((punto, i) => {
  const previo = puntos[i - 1] || punto;
  const siguiente = puntos[i + 1] || punto;

  const dx = siguiente[0] - previo[0];
  const dy = siguiente[1] - previo[1];
  const largo = Math.hypot(dx, dy);

  return largo === 0 ? { x: 0, y: 0 } : { x: -dy / largo, y: dx / largo };
});

/** Polilínea como `d` de un <path>. */
export const camino = (puntos) =>
  puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)} ${r(y)}`).join(' ');

/**
 * Onda del trayecto epifascial: el recorrido desplazado a un lado y a otro de
 * su propia normal siguiendo un seno.
 */
export const caminoOndulado = (puntos, { amplitud = 3, longitud = 9 } = {}) => {
  const paso = longitud / 8;
  const muestras = muestrear(puntos, paso);

  if (muestras.length < 4) return null;

  return muestras.map((m, i) => {
    const f = Math.sin((2 * Math.PI * m.s) / longitud) * amplitud;
    return `${i ? 'L' : 'M'}${r(m.x - m.uy * f)} ${r(m.y + m.ux * f)}`;
  }).join(' ');
};

/**
 * Cadena de equis del trayecto con adherencias: dos aspas cruzadas a 45° del
 * avance, repetidas a lo largo del recorrido. No lleva línea de base, igual que
 * en la lámina impresa.
 */
export const caminoCruces = (puntos, { paso = 6, alto = 4 } = {}) => {
  const muestras = muestrear(puntos, paso);

  if (muestras.length < 2) return null;

  const k = (alto / 2) / Math.SQRT2;
  const partes = [];

  for (const m of muestras) {
    // Los dos brazos son la tangente girada ±45°
    const ax = (m.ux - m.uy) * k;
    const ay = (m.uy + m.ux) * k;
    const bx = (m.ux + m.uy) * k;
    const by = (m.uy - m.ux) * k;

    partes.push(`M${r(m.x - ax)} ${r(m.y - ay)}L${r(m.x + ax)} ${r(m.y + ay)}`);
    partes.push(`M${r(m.x - bx)} ${r(m.y - by)}L${r(m.x + bx)} ${r(m.y + by)}`);
  }

  return partes.join(' ');
};

/** Las dos líneas paralelas del engrosamiento de pared. */
export const caminosDobles = (puntos, { separacion = 3 } = {}) => {
  if (!Array.isArray(puntos) || puntos.length < 2) return null;

  const normales = normalesDe(puntos);
  const mitad = separacion / 2;

  const lado = (signo) => puntos
    .map(([x, y], i) => {
      const n = normales[i];
      return `${i ? 'L' : 'M'}${r(x + n.x * signo * mitad)} ${r(y + n.y * signo * mitad)}`;
    })
    .join(' ');

  return [lado(1), lado(-1)];
};

/**
 * Los `d` con que se pinta un trazo, según su tipo de trayecto.
 *
 * Devuelve siempre una lista de caminos —el engrosamiento son dos— y si el
 * patrón no se puede construir cae a la línea lisa: un trayecto demasiado corto
 * para que se le note la onda se sigue viendo.
 */
export const caminosDe = (puntos, render, parametros = {}) => {
  if (render === 'ondulado') {
    return [caminoOndulado(puntos, parametros) || camino(puntos)];
  }
  if (render === 'cruces') {
    return [caminoCruces(puntos, parametros) || camino(puntos)];
  }
  if (render === 'doble') {
    return caminosDobles(puntos, parametros) || [camino(puntos)];
  }
  return [camino(puntos)];
};

/** ¿El patrón se dibuja como aspas sueltas en vez de como una línea seguida? */
export const esPunteadoDeCruces = (render) => render === 'cruces';

export { longitudDe };
