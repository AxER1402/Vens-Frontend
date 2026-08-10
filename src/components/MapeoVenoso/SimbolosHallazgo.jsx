/**
 * Símbolos de los marcadores clínicos.
 *
 * La geometría se declara una sola vez en FORMAS y se usa por dos vías:
 *   - <SimbolosHallazgo/> la publica como <symbol> dentro del <defs> del
 *     lienzo, para dibujarla con <use> las veces que haga falta;
 *   - <FormaHallazgo/> la pinta suelta en la leyenda de la barra lateral.
 *
 * Cada forma se dibuja en una caja de 24x24 centrada en (12,12) y hereda el
 * color del hallazgo mediante `currentColor`, de modo que hallazgos.js siga
 * siendo la única fuente de verdad del color.
 *
 * La forma importa tanto como el color: el mapeo se imprime a menudo en blanco
 * y negro, y el color por sí solo tampoco sirve a un médico con daltonismo.
 */

export const ID_SIMBOLO = (nombre) => `mv-sim-${nombre}`;

/** Lado del marcador en unidades del viewBox del editor. */
export const TAMANO_MARCADOR = 26;

const FORMAS = {
  // Perforante insuficiente: círculo con aspa
  aspa: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Cayado safeno-femoral / safeno-poplíteo: doble círculo
  'doble-circulo': (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // Trombo: rombo relleno
  rombo: (
    <path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  // Úlcera: círculo relleno
  'circulo-relleno': (
    <circle cx="12" cy="12" r="8.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
  ),
  // Punto de punción: punto pequeño
  punto: (
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
  ),
};

/** Definiciones reutilizables; se monta una sola vez dentro del lienzo. */
export default function SimbolosHallazgo() {
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

/** Muestra suelta del símbolo, para la leyenda de la barra de herramientas. */
export function FormaHallazgo({ simbolo, color, tamano = 18 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" style={{ color }} aria-hidden="true">
      {FORMAS[simbolo] || FORMAS.punto}
    </svg>
  );
}

/** Muestra de un trazo, con su color y su patrón de línea. */
export function MuestraTrazo({ color, grosor = 3, patron = null, ancho = 34 }) {
  return (
    <svg width={ancho} height={14} viewBox={`0 0 ${ancho} 14`} aria-hidden="true">
      <line
        x1="1" y1="7" x2={ancho - 1} y2="7"
        stroke={color}
        strokeWidth={Math.min(grosor, 5)}
        strokeDasharray={patron || undefined}
        strokeLinecap="round"
      />
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
 * @param {number} [props.escala] - 1 = tamaño natural; crece al alejar el zoom
 */
export function Marcador({ x, y, simbolo, color, numero, escala = 1 }) {
  const lado = TAMANO_MARCADOR * escala;

  return (
    <g style={{ color }} pointerEvents="none">
      <circle cx={x} cy={y} r={lado * 0.55} fill="#FFFFFF" opacity="0.78" />
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
