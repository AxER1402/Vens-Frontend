import {
  MousePointer2, Pencil, Spline, MapPin, MessageSquarePlus, Type, Eraser,
} from 'lucide-react';
import {
  HERRAMIENTAS, HALLAZGOS_TRAZO, HALLAZGOS_MARCADOR, GROSORES, COLORES_LIBRES,
} from './hallazgos';
import { FormaHallazgo, MuestraTrazo } from './SimbolosHallazgo';

/**
 * Columna de herramientas del editor.
 *
 * La leyenda cambia según la herramienta activa: al dibujar se ofrecen los
 * hallazgos de trazo, al marcar los puntuales. El médico elige el hallazgo y el
 * color viene dado; el selector de color libre queda abajo, para lo que no
 * encaje en la leyenda clínica.
 */

const ICONOS = {
  seleccionar: MousePointer2,
  trazo: Pencil,
  trayecto: Spline,
  marcador: MapPin,
  anotacion: MessageSquarePlus,
  texto: Type,
  borrar: Eraser,
};

/** Con qué herramientas tiene sentido cada parte de la leyenda. */
const DIBUJA_TRAZO = ['trazo', 'trayecto'];

export default function BarraHerramientas({ estilo, onEstilo, soloLectura = false }) {
  const { herramienta } = estilo;
  const eligiendoTrazo = DIBUJA_TRAZO.includes(herramienta);
  const eligiendoMarcador = herramienta === 'marcador';

  return (
    <aside className="mv-barra" aria-label="Herramientas de mapeo">
      <div className="mv-barra-grupo">
        <span className="mv-barra-titulo">Herramientas</span>
        <div className="mv-herramientas">
          {HERRAMIENTAS.map(h => {
            const Icono = ICONOS[h.id];
            const activa = herramienta === h.id;
            // En solo lectura únicamente queda navegar y consultar
            const inhabilitada = soloLectura && h.id !== 'seleccionar';

            return (
              <button
                key={h.id}
                type="button"
                className={`mv-herramienta${activa ? ' on' : ''}`}
                disabled={inhabilitada}
                aria-pressed={activa}
                title={`${h.label} (${h.atajo.toUpperCase()}) — ${h.ayuda}`}
                onClick={() => onEstilo({ herramienta: h.id })}
              >
                <Icono size={15} />
                <span className="mv-herramienta-label">{h.label}</span>
                <kbd className="mv-atajo">{h.atajo.toUpperCase()}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {!soloLectura && (eligiendoTrazo || eligiendoMarcador) && (
        <div className="mv-barra-grupo">
          <span className="mv-barra-titulo">
            {eligiendoTrazo ? 'Recorrido venoso' : 'Hallazgo puntual'}
          </span>
          <div className="mv-leyenda">
            {(eligiendoTrazo ? HALLAZGOS_TRAZO : HALLAZGOS_MARCADOR).map(h => {
              const activo = eligiendoTrazo
                ? estilo.hallazgoTrazo === h.id
                : estilo.hallazgoMarcador === h.id;

              return (
                <button
                  key={h.id}
                  type="button"
                  className={`mv-hallazgo${activo ? ' on' : ''}`}
                  aria-pressed={activo}
                  title={h.ayuda}
                  onClick={() => onEstilo(
                    eligiendoTrazo
                      // Elegir un hallazgo devuelve el mando al color de la
                      // leyenda: si no, un color libre anterior lo enmascararía.
                      ? { hallazgoTrazo: h.id, color: null, grosor: h.grosor }
                      : { hallazgoMarcador: h.id },
                  )}
                >
                  <span className="mv-hallazgo-muestra">
                    {eligiendoTrazo
                      ? <MuestraTrazo color={h.color} grosor={h.grosor} patron={h.patron} />
                      : <FormaHallazgo simbolo={h.simbolo} color={h.color} />}
                  </span>
                  <span className="mv-hallazgo-label">{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!soloLectura && eligiendoTrazo && (
        <>
          <div className="mv-barra-grupo">
            <span className="mv-barra-titulo">Grosor</span>
            <div className="mv-grosores">
              {GROSORES.map(g => (
                <button
                  key={g}
                  type="button"
                  className={`mv-grosor${estilo.grosor === g ? ' on' : ''}`}
                  aria-pressed={estilo.grosor === g}
                  title={`Grosor ${g}`}
                  onClick={() => onEstilo({ grosor: g })}
                >
                  <span className="mv-grosor-punto" style={{ width: g * 2.2, height: g * 2.2 }} />
                </button>
              ))}
            </div>
          </div>

          <div className="mv-barra-grupo">
            <span className="mv-barra-titulo">Color libre</span>
            <div className="mv-colores">
              <button
                type="button"
                className={`mv-color mv-color-auto${estilo.color ? '' : ' on'}`}
                title="Usar el color del hallazgo elegido"
                aria-pressed={!estilo.color}
                onClick={() => onEstilo({ color: null })}
              >
                Auto
              </button>
              {COLORES_LIBRES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`mv-color${estilo.color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={estilo.color === c}
                  onClick={() => onEstilo({ color: c })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {soloLectura && (
        <div className="mv-barra-grupo">
          <span className="mv-barra-titulo">Leyenda</span>
          <div className="mv-leyenda">
            {[...HALLAZGOS_TRAZO, ...HALLAZGOS_MARCADOR].map(h => (
              <div key={h.id} className="mv-hallazgo mv-hallazgo-lectura">
                <span className="mv-hallazgo-muestra">
                  {h.tipo === 'trazo'
                    ? <MuestraTrazo color={h.color} grosor={h.grosor} patron={h.patron} />
                    : <FormaHallazgo simbolo={h.simbolo} color={h.color} />}
                </span>
                <span className="mv-hallazgo-label">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
