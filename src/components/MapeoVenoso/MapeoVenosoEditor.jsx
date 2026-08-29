import { useCallback, useEffect, useRef, useState } from 'react';
import plantilla from '../../assets/mapeoVenoso.png';
import SimbolosMapeo, { Marcador, TAMANO_MARCADOR } from './SimbolosMapeo';
import { estiloDe, descripcionDe, simboloDe, tamanoDe, hexDe, trayectoDe } from './catalogo';
import { camino, caminosDe, esPunteadoDeCruces } from './trazos';
import { PLANTILLA_ANCHO, PLANTILLA_ALTO, ZONAS, etiquetaZona } from './zonas';
import {
  aVistaX, aVistaY, aNormDX, aNormDY,
  crearTrazo, crearMarcador,
} from './objetos';

/**
 * Lienzo del mapeo venoso.
 *
 * Se dibuja en SVG y no en canvas a propósito: cada objeto es un nodo del DOM,
 * así que seleccionar, arrastrar y borrar salen del propio evento del elemento;
 * el zoom y la pantalla completa son un cambio de viewBox sin volver a escalar
 * nada; y deshacer es manipular un arreglo, no repintar mapas de bits.
 *
 * El componente no sabe nada de red ni de historial: recibe los objetos y avisa
 * de las mutaciones. Quien decide qué hacer con ellas es la página.
 */

/** Separación mínima entre puntos de un trazo libre, en unidades del viewBox. */
const DISTANCIA_MINIMA = 2.5;

/** Límites del zoom, como fracción del ancho de la plantilla. */
const ZOOM_MIN = 0.08;
const ZOOM_MAX = 1.6;

const acotar = (n, min, max) => Math.min(max, Math.max(min, n));

/** Herramientas en las que los objetos ya dibujados responden al puntero. */
const HERRAMIENTAS_INTERACTIVAS = ['seleccionar', 'borrar'];

/** Cuerpo de un objeto de texto, con respaldo por si el documento llega incompleto. */
const TAMANO_TEXTO = (objeto) => Number(objeto.tamano) || 16;

/** Partir un texto largo en líneas para el globo de la anotación. */
const envolverTexto = (texto, maximo = 34) => {
  const lineas = [];
  let actual = '';

  for (const palabra of String(texto).split(/\s+/)) {
    if (!actual.length) actual = palabra;
    else if (actual.length + palabra.length + 1 <= maximo) actual += ` ${palabra}`;
    else {
      lineas.push(actual);
      actual = palabra;
      if (lineas.length === 5) { actual = `${actual}…`; break; }
    }
  }
  if (actual) lineas.push(actual);

  return lineas;
};

/** Caja envolvente de un objeto, en unidades del viewBox. */
const cajaDe = (objeto, escala) => {
  if (objeto.tipo === 'trazo') {
    const xs = objeto.puntos.map(p => aVistaX(p[0]));
    const ys = objeto.puntos.map(p => aVistaY(p[1]));
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
  }

  const lado = (objeto.tipo === 'marcador' ? tamanoDe(objeto) : TAMANO_MARCADOR) * escala;
  const x = aVistaX(objeto.x);
  const y = aVistaY(objeto.y);

  if (objeto.tipo === 'anotacion') {
    return { x: x - lado, y: y - lado * 2.1, ancho: lado * 2, alto: lado * 2.4 };
  }
  if (objeto.tipo === 'texto') {
    const cuerpo = TAMANO_TEXTO(objeto) * escala;
    return { x, y: y - cuerpo, ancho: String(objeto.texto).length * cuerpo * 0.55, alto: cuerpo * 1.3 };
  }
  return { x: x - lado / 2, y: y - lado / 2, ancho: lado, alto: lado };
};

export default function MapeoVenosoEditor({
  objetos,
  estilo,
  seleccion = null,
  resaltado = null,
  encuadre,
  soloLectura = false,
  debugZonas = false,
  paneoConRueda = false,
  svgRef,
  onAgregar,
  onMover,
  onEliminar,
  onSeleccionar,
  onPedirAnotacion,
  onPedirTexto,
  onEncuadre,
}) {
  const propioRef = useRef(null);
  const svg = svgRef || propioRef;

  const [trazoActivo, setTrazoActivo] = useState(null);  // puntos en unidades de vista
  const [trayecto, setTrayecto] = useState(null);         // trayecto por clics
  const [cursor, setCursor] = useState(null);             // solo para previsualizar el trayecto
  const [arrastre, setArrastre] = useState(null);         // { id, desde, dx, dy }
  const [paneo, setPaneo] = useState(null);
  const [espacio, setEspacio] = useState(false);

  const escala = encuadre.ancho / PLANTILLA_ANCHO;
  const herramienta = soloLectura ? 'seleccionar' : estilo.herramienta;
  const interactivo = !soloLectura && HERRAMIENTAS_INTERACTIVAS.includes(herramienta);
  const colorTrazo = hexDe(estilo.color) || '#243757';
  const trayectoElegido = trayectoDe(estilo.trayecto);

  /* ── Conversión de coordenadas ──────────────────────────────────────────
   * getScreenCTM() traduce del píxel de pantalla a la unidad del viewBox sin
   * que importen el zoom, el desplazamiento ni el tamaño CSS del elemento.
   */
  const puntoDe = useCallback((evento) => {
    const nodo = svg.current;
    if (!nodo) return null;

    const ctm = nodo.getScreenCTM();
    if (!ctm) return null;

    const p = nodo.createSVGPoint();
    p.x = evento.clientX;
    p.y = evento.clientY;
    const q = p.matrixTransform(ctm.inverse());

    return { x: q.x, y: q.y };
  }, [svg]);

  /* ── Trayecto por clics ──────────────────────────────────────────────── */
  // El trayecto se lee del cierre y no dentro de un updater: avisar de un
  // objeto nuevo desde ahí sería un efecto colateral en una función que React
  // puede volver a ejecutar, y el trazo se añadiría dos veces.
  const cerrarTrayecto = useCallback(() => {
    if (trayecto && trayecto.length >= 2) {
      const nuevo = crearTrazo(trayecto, {
        color: estilo.color,
        trayecto: estilo.trayecto,
        grosor: estilo.grosor,
      });
      if (nuevo) onAgregar(nuevo);
    }
    setTrayecto(null);
    setCursor(null);
  }, [trayecto, estilo.color, estilo.trayecto, estilo.grosor, onAgregar]);

  /* ── Zoom anclado en el puntero ──────────────────────────────────────── */
  const zoomEn = useCallback((punto, factor) => {
    const ancho = acotar(
      encuadre.ancho * factor,
      PLANTILLA_ANCHO * ZOOM_MIN,
      PLANTILLA_ANCHO * ZOOM_MAX,
    );
    const k = ancho / encuadre.ancho;

    onEncuadre({
      x: punto.x - (punto.x - encuadre.x) * k,
      y: punto.y - (punto.y - encuadre.y) * k,
      ancho,
      alto: encuadre.alto * k,
    });
  }, [encuadre, onEncuadre]);

  /* ── Rueda y trackpad ─────────────────────────────────────────────────
   * El listener va a mano y no como onWheel porque React lo registra como
   * pasivo y entonces no se podría cancelar el desplazamiento de la página.
   *
   * En un trackpad, **pellizcar** llega como `wheel` con `ctrlKey` y **deslizar
   * con dos dedos** llega sin él. Por eso el zoom se ata al pellizco: atarlo a
   * la rueda a secas hacía que mover la página con el cursor encima del lienzo
   * lo acercara sin querer, que es justo lo que molestaba.
   */
  useEffect(() => {
    const nodo = svg.current;
    if (!nodo) return undefined;

    const alGirar = (evento) => {
      if (evento.ctrlKey || evento.metaKey) {
        evento.preventDefault();
        const punto = puntoDe(evento);
        if (punto) zoomEn(punto, evento.deltaY > 0 ? 1.12 : 1 / 1.12);
        return;
      }

      // A pantalla completa no hay página que desplazar, así que el
      // deslizamiento mueve el lienzo. Empotrado en el formulario se deja
      // pasar, para que la página se desplace como en cualquier otra pantalla.
      if (!paneoConRueda) return;

      const caja = nodo.getBoundingClientRect();
      if (!caja.width) return;

      evento.preventDefault();
      const unidades = encuadre.ancho / caja.width;
      onEncuadre({
        ...encuadre,
        x: encuadre.x + evento.deltaX * unidades,
        y: encuadre.y + evento.deltaY * unidades,
      });
    };

    nodo.addEventListener('wheel', alGirar, { passive: false });
    return () => nodo.removeEventListener('wheel', alGirar);
  }, [svg, puntoDe, zoomEn, paneoConRueda, encuadre, onEncuadre]);

  /* ── Teclado propio del lienzo ────────────────────────────────────────
   * Espacio = desplazar en vez de dibujar; Esc / Enter cierran el trayecto.
   * Los atajos de herramienta y el deshacer los maneja la página.
   */
  useEffect(() => {
    const editable = (destino) =>
      destino instanceof HTMLElement &&
      (destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName));

    const abajo = (e) => {
      if (editable(e.target)) return;
      if (e.code === 'Space') { e.preventDefault(); setEspacio(true); }
      if ((e.key === 'Escape' || e.key === 'Enter') && trayecto) {
        e.preventDefault();
        cerrarTrayecto();
      }
    };
    const arriba = (e) => { if (e.code === 'Space') setEspacio(false); };

    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
    };
  }, [trayecto, cerrarTrayecto]);

  // Cambiar de herramienta abandona el trayecto a medias en vez de dejarlo colgado
  useEffect(() => {
    if (estilo.herramienta !== 'trayecto') {
      setTrayecto(null);
      setCursor(null);
    }
  }, [estilo.herramienta]);

  /* ── Puntero ─────────────────────────────────────────────────────────── */

  const alPresionar = (evento) => {
    const punto = puntoDe(evento);
    if (!punto) return;

    // Desplazamiento: botón central, o barra espaciadora con cualquier botón
    if (evento.button === 1 || espacio) {
      evento.preventDefault();
      evento.currentTarget.setPointerCapture(evento.pointerId);
      setPaneo({ desde: punto, encuadre });
      return;
    }
    if (evento.button !== 0 || soloLectura) return;

    evento.currentTarget.setPointerCapture(evento.pointerId);

    switch (herramienta) {
      case 'trazo':
        setTrazoActivo([punto]);
        break;

      case 'trayecto':
        setTrayecto(prev => (prev ? [...prev, punto] : [punto]));
        setCursor(punto);
        break;

      case 'marcador':
        onAgregar(crearMarcador(punto, estilo.marcador, estilo.color));
        break;

      case 'anotacion':
        onPedirAnotacion(punto);
        break;

      case 'texto':
        onPedirTexto(punto);
        break;

      case 'seleccionar':
        // El clic llegó al fondo y no a un objeto: se deselecciona
        onSeleccionar(null);
        break;

      default:
        break;
    }
  };

  const alMover = (evento) => {
    // Fuera de estos tres casos no hace falta recalcular nada en cada píxel
    if (!paneo && !arrastre && !trazoActivo && !trayecto) return;

    const punto = puntoDe(evento);
    if (!punto) return;

    if (paneo) {
      onEncuadre({
        ...paneo.encuadre,
        x: paneo.encuadre.x - (punto.x - paneo.desde.x),
        y: paneo.encuadre.y - (punto.y - paneo.desde.y),
      });
      return;
    }

    if (arrastre) {
      setArrastre(a => ({ ...a, dx: punto.x - a.desde.x, dy: punto.y - a.desde.y }));
      return;
    }

    if (trazoActivo) {
      const ultimo = trazoActivo[trazoActivo.length - 1];
      if (Math.hypot(punto.x - ultimo.x, punto.y - ultimo.y) >= DISTANCIA_MINIMA * escala) {
        setTrazoActivo(p => [...p, punto]);
      }
      return;
    }

    setCursor(punto);
  };

  const alSoltar = (evento) => {
    if (evento.currentTarget.hasPointerCapture?.(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }

    if (paneo) { setPaneo(null); return; }

    // El arrastre se confirma una sola vez al soltar: así deshacer retrocede el
    // movimiento completo y no cada paso intermedio del puntero.
    if (arrastre) {
      if (arrastre.dx || arrastre.dy) {
        onMover(arrastre.id, aNormDX(arrastre.dx), aNormDY(arrastre.dy));
      }
      setArrastre(null);
      return;
    }

    if (trazoActivo) {
      const nuevo = crearTrazo(trazoActivo, {
        color: estilo.color,
        trayecto: estilo.trayecto,
        grosor: estilo.grosor,
      });
      if (nuevo) onAgregar(nuevo);
      setTrazoActivo(null);
    }
  };

  /** Clic sobre un objeto ya dibujado (solo con seleccionar o borrar). */
  const alTocarObjeto = (evento, objeto) => {
    if (!interactivo) return;
    evento.stopPropagation();

    if (herramienta === 'borrar') {
      onEliminar(objeto.id);
      return;
    }

    onSeleccionar(objeto.id);

    const punto = puntoDe(evento);
    if (punto) {
      svg.current?.setPointerCapture?.(evento.pointerId);
      setArrastre({ id: objeto.id, desde: punto, dx: 0, dy: 0 });
    }
  };

  /* ── Render de un objeto ─────────────────────────────────────────────── */
  const dibujar = (objeto) => {
    const { color, grosor, patron, render, parametros } = estiloDe(objeto);
    const arrastrando = arrastre?.id === objeto.id;

    const comunes = {
      transform: arrastrando ? `translate(${arrastre.dx} ${arrastre.dy})` : undefined,
      onPointerDown: interactivo ? (e) => alTocarObjeto(e, objeto) : undefined,
      pointerEvents: interactivo ? 'auto' : 'none',
      style: interactivo
        ? { cursor: herramienta === 'borrar' ? 'crosshair' : 'move' }
        : undefined,
    };

    if (objeto.tipo === 'trazo') {
      const vista = objeto.puntos.map(([x, y]) => [aVistaX(x), aVistaY(y)]);
      const caminos = caminosDe(vista, render, parametros);

      return (
        <g key={objeto.id} {...comunes}>
          {/* Copia invisible y más gruesa sobre el recorrido liso: hace clicable
              un trazo fino, y también uno de equis, que casi no tiene tinta. */}
          {interactivo && (
            <path
              d={camino(vista)}
              fill="none"
              stroke="transparent"
              strokeWidth={grosor + 14 * escala}
              strokeLinecap="round"
              pointerEvents="stroke"
            />
          )}
          <title>{descripcionDe(objeto)}</title>
          {caminos.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={grosor}
              strokeDasharray={patron || undefined}
              // Las equis son aspas sueltas: redondearles las puntas las
              // convierte en manchas cuando el trazo es grueso.
              strokeLinecap={esPunteadoDeCruces(render) ? 'butt' : 'round'}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
        </g>
      );
    }

    if (objeto.tipo === 'marcador') {
      const lado = tamanoDe(objeto);
      return (
        <g key={objeto.id} {...comunes}>
          <title>
            {`${descripcionDe(objeto)} ${objeto.numero} — ${etiquetaZona(objeto.zona)}`}
          </title>
          <circle
            cx={aVistaX(objeto.x)}
            cy={aVistaY(objeto.y)}
            r={lado * escala * 0.7}
            fill="transparent"
            pointerEvents={interactivo ? 'all' : 'none'}
          />
          <Marcador
            x={aVistaX(objeto.x)}
            y={aVistaY(objeto.y)}
            simbolo={simboloDe(objeto)}
            color={color}
            numero={objeto.numero}
            tamano={lado}
            escala={escala}
          />
        </g>
      );
    }

    if (objeto.tipo === 'anotacion') {
      return (
        <PinAnotacion
          key={objeto.id}
          {...comunes}
          objeto={objeto}
          escala={escala}
          interactivo={interactivo}
          abierta={resaltado === objeto.id || seleccion === objeto.id}
        />
      );
    }

    return (
      <g key={objeto.id} {...comunes}>
        <text
          x={aVistaX(objeto.x)}
          y={aVistaY(objeto.y)}
          fontSize={TAMANO_TEXTO(objeto) * escala}
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={3.5 * escala}
          paintOrder="stroke"
          fontWeight="600"
          pointerEvents={interactivo ? 'all' : 'none'}
        >
          {objeto.texto}
        </text>
      </g>
    );
  };

  const seleccionado = objetos.find(o => o.id === seleccion);
  const caja = seleccionado ? cajaDe(seleccionado, escala) : null;
  const margen = 8 * escala;

  const cursorCss = espacio || paneo
    ? (paneo ? 'grabbing' : 'grab')
    : (soloLectura || herramienta === 'seleccionar') ? 'default'
    : 'crosshair';

  return (
    <svg
      ref={svg}
      className="mv-lienzo"
      viewBox={`${encuadre.x} ${encuadre.y} ${encuadre.ancho} ${encuadre.alto}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onDoubleClick={() => { if (trayecto) cerrarTrayecto(); }}
      style={{ cursor: cursorCss, touchAction: 'none' }}
    >
      <SimbolosMapeo />

      {/* Plantilla institucional, ya limpiada como asset: se dibuja tal cual.
          No lleva filtro CSS a propósito, para que lo que se ve en pantalla y
          lo que se rasteriza al guardar sean exactamente lo mismo. */}
      <image
        href={plantilla}
        x={0}
        y={0}
        width={PLANTILLA_ANCHO}
        height={PLANTILLA_ALTO}
        pointerEvents="none"
      />

      {debugZonas && ZONAS.map(z => (
        <g key={z.id} pointerEvents="none">
          <rect
            x={z.rect[0] * PLANTILLA_ANCHO}
            y={z.rect[1] * PLANTILLA_ALTO}
            width={(z.rect[2] - z.rect[0]) * PLANTILLA_ANCHO}
            height={(z.rect[3] - z.rect[1]) * PLANTILLA_ALTO}
            fill="rgba(36,55,87,0.08)"
            stroke="rgba(36,55,87,0.6)"
            strokeWidth={2}
          />
          <text x={z.rect[0] * PLANTILLA_ANCHO + 8} y={z.rect[1] * PLANTILLA_ALTO + 20} fontSize={14} fill="#243757">
            {z.id}
          </text>
        </g>
      ))}

      {objetos.map(dibujar)}

      {/* Trazo en curso, ya con su patrón: el médico ve la onda o las equis
          mientras dibuja y no solo al soltar. */}
      {trazoActivo && trazoActivo.length > 1 && (
        <PatronEnCurso puntos={trazoActivo} trayecto={trayectoElegido} color={colorTrazo} grosor={estilo.grosor} />
      )}

      {/* Trayecto por clics: los tramos ya fijados con su patrón, y el segmento
          que sigue al cursor de guía discontinua, que aún no está puesto. */}
      {trayecto && (
        <g pointerEvents="none">
          {trayecto.length > 1 && (
            <PatronEnCurso puntos={trayecto} trayecto={trayectoElegido} color={colorTrazo} grosor={estilo.grosor} />
          )}
          {cursor && (
            <line
              x1={trayecto[trayecto.length - 1].x}
              y1={trayecto[trayecto.length - 1].y}
              x2={cursor.x}
              y2={cursor.y}
              stroke={colorTrazo}
              strokeWidth={estilo.grosor}
              strokeDasharray={`${6 * escala} ${4 * escala}`}
              strokeLinecap="round"
              opacity="0.7"
            />
          )}
          {trayecto.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5 * escala} fill="#243757" />
          ))}
        </g>
      )}

      {/* Contorno de selección */}
      {caja && (
        <rect
          x={caja.x - margen}
          y={caja.y - margen}
          width={caja.ancho + margen * 2}
          height={caja.alto + margen * 2}
          fill="none"
          stroke="#3A5F6F"
          strokeWidth={1.5 * escala}
          strokeDasharray={`${6 * escala} ${4 * escala}`}
          pointerEvents="none"
          transform={arrastre?.id === seleccion ? `translate(${arrastre.dx} ${arrastre.dy})` : undefined}
        />
      )}
    </svg>
  );
}

/**
 * Previsualización de un trazo mientras se dibuja, con el patrón del trayecto
 * elegido. Comparte la geometría con el dibujo definitivo, así que lo que se ve
 * al arrastrar es exactamente lo que queda al soltar.
 */
function PatronEnCurso({ puntos, trayecto, color, grosor }) {
  const vista = puntos.map(p => [p.x, p.y]);
  const caminos = caminosDe(vista, trayecto?.render, trayecto?.parametros);

  return (
    <>
      {caminos.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeDasharray={trayecto?.patron || undefined}
          strokeLinecap={esPunteadoDeCruces(trayecto?.render) ? 'butt' : 'round'}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ))}
    </>
  );
}

/**
 * Anotación anclada: un alfiler numerado unido por un tallo al punto exacto que
 * el médico señaló. El texto completo aparece al pasar el cursor (título nativo)
 * y en un globo cuando está seleccionada o resaltada desde la lista lateral.
 */
function PinAnotacion({ objeto, escala, interactivo, abierta, ...props }) {
  const x = aVistaX(objeto.x);
  const y = aVistaY(objeto.y);
  const radio = 13 * escala;
  const cy = y - 26 * escala;

  const lineas = abierta ? envolverTexto(objeto.texto) : [];
  const anchoGlobo = 210 * escala;
  const altoGlobo = (lineas.length * 15 + 16) * escala;

  // Si el alfiler está en la mitad derecha, el globo se abre hacia la izquierda
  const aLaIzquierda = objeto.x > 0.62;
  const xGlobo = aLaIzquierda
    ? x - radio - 6 * escala - anchoGlobo
    : x + radio + 6 * escala;

  return (
    <g {...props}>
      <title>{`Nota ${objeto.numero} — ${etiquetaZona(objeto.zona)}: ${objeto.texto}`}</title>

      <line x1={x} y1={y} x2={x} y2={cy} stroke="#243757" strokeWidth={1.5 * escala} pointerEvents="none" />
      <circle cx={x} cy={y} r={3 * escala} fill="#243757" pointerEvents="none" />
      <circle
        cx={x}
        cy={cy}
        r={radio}
        fill="#243757"
        stroke="#FFFFFF"
        strokeWidth={2 * escala}
        pointerEvents={interactivo ? 'all' : 'none'}
      />
      <text
        x={x}
        y={cy + 4.5 * escala}
        fontSize={13 * escala}
        fontWeight="700"
        fill="#FFFFFF"
        textAnchor="middle"
        pointerEvents="none"
      >
        {objeto.numero}
      </text>

      {abierta && lineas.length > 0 && (
        <g pointerEvents="none">
          <rect
            x={xGlobo}
            y={cy - altoGlobo / 2}
            width={anchoGlobo}
            height={altoGlobo}
            rx={4 * escala}
            fill="#FAFAF7"
            stroke="#243757"
            strokeWidth={1.2 * escala}
          />
          {lineas.map((linea, i) => (
            <text
              key={i}
              x={xGlobo + 8 * escala}
              y={cy - altoGlobo / 2 + (17 + i * 15) * escala}
              fontSize={11.5 * escala}
              fill="#243757"
            >
              {linea}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}
