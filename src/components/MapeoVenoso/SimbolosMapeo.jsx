import { caminosDe, esPunteadoDeCruces } from './trazos';

/**
 * Símbolos y muestras del mapeo venoso.
 *
 * La geometría de cada marcador se declara una sola vez en FORMAS y se usa por
 * dos vías:
 *   - <SimbolosMapeo/> la publica como <symbol> dentro del <defs> del lienzo,
 *     para dibujarla con <use> las veces que haga falta;
 *   - <FormaMarcador/> la pinta suelta en la barra lateral y en la lista.
 *
 * Cada forma se dibuja en una caja de 24x24 centrada en (12,12) y hereda el
 * color con `currentColor`, de modo que el mismo símbolo sirva para las seis
 * lecturas clínicas sin duplicar la lista.
 *
 * La forma importa tanto como el color: el mapeo se imprime a menudo en blanco
 * y negro, y el color por sí solo tampoco sirve a un médico con daltonismo.
 */

export const ID_SIMBOLO = (nombre) => `mv-sim-${nombre}`;

/** Lado con que se dibuja un marcador que no declara el suyo. */
export const TAMANO_MARCADOR = 26;

const FORMAS = {
  /* ── Marcadores de la lámina ─────────────────────────────────────────── */

  // Vena perforante: círculo abierto
  circulo: (
    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
  ),
  // Golfo venoso: círculo relleno atravesado por el trayecto
  golfo: (
    <>
      <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="6.5" fill="currentColor" />
    </>
  ),
  // Estructura no venosa: elipse abierta
  elipse: (
    <ellipse cx="12" cy="12" rx="9" ry="4.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
  ),
  // Safenectomía / crosectomía: trayecto seccionado
  escalera: (
    <path
      d="M1 12 h22 M5 4.5 v15 M10 4.5 v15 M15 4.5 v15 M20 4.5 v15"
      fill="none" stroke="currentColor" strokeWidth="2"
    />
  ),
  // Úlcera: contorno irregular con trama
  ulcera: (
    <>
      <path
        d="M8 3.5 Q3.5 5 4.5 9 Q1.5 12 4 14.5 Q3 18.5 7 19.5 Q7.5 22.5 11 21 Q14.5 23 16.5 19.5 Q20.5 19 20 15.5 Q23 12.5 20 9.5 Q20.5 5 16.5 4.5 Q13.5 1.5 10.5 3 Z"
        fill="none" stroke="currentColor" strokeWidth="2"
      />
      {/* La trama sobresale un poco del contorno, como en la lámina dibujada
          a mano; es lo que distingue la úlcera de un contorno cualquiera. */}
      <path
        d="M8 3 v18.5 M12.5 2 v20.5 M17 4 v16 M3 8.5 h18 M2 13 h20.5 M3.5 17.5 h17"
        fill="none" stroke="currentColor" strokeWidth="1.4"
      />
    </>
  ),

  /* ── Vocabulario heredado ────────────────────────────────────────────────
   * Formas del catálogo anterior. El editor ya no las ofrece, pero un mapeo
   * archivado con ellas tiene que seguir viéndose como se dibujó.
   */

  aspa: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'doble-circulo': (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  rombo: (
    <path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  'circulo-relleno': (
    <circle cx="12" cy="12" r="8.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
  ),
  punto: (
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
  ),
};

/** Definiciones reutilizables; se monta una sola vez dentro del lienzo. */
export default function SimbolosMapeo() {
  return (
    <defs>
      {Object.entries(FORMAS).map(([nombre, forma]) => (
        <symbol key={nombre} id={ID_SIMBOLO(nombre)} viewBox="0 0 24 24">
          {forma}
        </symbol>
      ))}
    </defs>
  );
}

/** Muestra suelta de un símbolo, para la barra lateral y la lista de marcadores. */
export function FormaMarcador({ simbolo, color, tamano = 18 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" style={{ color }} aria-hidden="true">
      {FORMAS[simbolo] || FORMAS.punto}
    </svg>
  );
}

/**
 * Muestra de un trayecto para la barra lateral y la leyenda.
 *
 * Se dibuja con la misma geometría que el lienzo y en las mismas unidades del
 * viewBox: la onda y las equis de la muestra son exactamente las que va a
 * trazar el editor, no una imitación que pueda quedar desfasada.
 */
export function MuestraTrayecto({ trayecto, color, ancho = 60 }) {
  const puntos = [[2, 7], [ancho - 2, 7]];
  const caminos = caminosDe(puntos, trayecto?.render, trayecto?.parametros);
  const grosor = Math.min(trayecto?.grosor ?? 3, 4);

  return (
    <svg width={ancho} height={14} viewBox={`0 0 ${ancho} 14`} style={{ color }} aria-hidden="true">
      {caminos.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={grosor}
          strokeDasharray={trayecto?.patron || undefined}
          strokeLinecap={esPunteadoDeCruces(trayecto?.render) ? 'butt' : 'round'}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/**
 * Marcador dibujado sobre el lienzo: halo blanco translúcido para que el
 * símbolo se lea aunque caiga sobre trazos, y número correlativo al lado.
 *
 * @param {Object} props
 * @param {number} props.x - unidades del viewBox
 * @param {number} props.y - unidades del viewBox
 * @param {string} props.simbolo
 * @param {string} props.color
 * @param {number} [props.numero]
 * @param {number} [props.tamano] - lado del símbolo en unidades del viewBox
 * @param {number} [props.escala] - 1 = tamaño natural; crece al alejar el zoom
 */
export function Marcador({ x, y, simbolo, color, numero, tamano = TAMANO_MARCADOR, escala = 1 }) {
  const lado = tamano * escala;

  return (
    <g style={{ color }} pointerEvents="none">
      <circle cx={x} cy={y} r={lado * 0.62} fill="#FFFFFF" opacity="0.78" />
      <use
        href={`#${ID_SIMBOLO(simbolo)}`}
        x={x - lado / 2}
        y={y - lado / 2}
        width={lado}
        height={lado}
      />
      {numero != null && (
        <text
          x={x + lado * 0.62}
          y={y - lado * 0.42}
          fontSize={12 * escala}
          fontWeight="600"
          fill="currentColor"
          stroke="#FFFFFF"
          strokeWidth={3 * escala}
          paintOrder="stroke"
        >
          {numero}
        </text>
      )}
    </g>
  );
}
