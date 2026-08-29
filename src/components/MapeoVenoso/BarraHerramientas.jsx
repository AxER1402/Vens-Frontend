import {
  MousePointer2, Pencil, Spline, MapPin, MessageSquarePlus, Type, Eraser,
} from 'lucide-react';
import {
  HERRAMIENTAS, COLORES, TRAYECTOS, MARCADORES, GROSORES,
  colorDe, hexDe,
} from './catalogo';
import { FormaMarcador, MuestraTrayecto } from './SimbolosMapeo';

/**
 * Columna de herramientas del editor.
 *
 * Se ordena como la lámina impresa, y por el mismo motivo: primero el **color**,
 * que es la lectura clínica del vaso y se aplica a todo lo que se dibuje
 * después; luego el recorrido o el marcador, según la herramienta activa.
 *
 * El significado del color va escrito bajo la paleta además de en el título
 * emergente. Un cuadro azul no dice nada por sí solo, y el médico no debería
 * tener que recordar la equivalencia ni ir a buscar la hoja.
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

/** Herramientas que dibujan un recorrido. */
const DIBUJA_TRAZO = ['trazo', 'trayecto'];

/** Herramientas en las que el color elegido se aplica a lo que se va a dibujar. */
const USA_COLOR = ['trazo', 'trayecto', 'marcador', 'texto'];

export default function BarraHerramientas({ estilo, onEstilo, soloLectura = false }) {
  const { herramienta } = estilo;
  const eligiendoTrazo = DIBUJA_TRAZO.includes(herramienta);
  const eligiendoMarcador = herramienta === 'marcador';
  const eligiendoColor = USA_COLOR.includes(herramienta);

  const color = colorDe(estilo.color);
  const tono = hexDe(estilo.color);

  /**
   * Elegir un trayecto ajusta el grosor al suyo, que es el que la lámina le
   * da. El epifascial además propone el rojo: la hoja lo reserva a lo
   * patológico, aunque el médico puede cambiarlo después.
   */
  const elegirTrayecto = (t) => onEstilo({
    trayecto: t.id,
    grosor: t.grosor,
    ...(t.soloPatologico && estilo.color === 'azul' ? { color: 'rojo' } : {}),
  });

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

      {!soloLectura && eligiendoColor && (
        <div className="mv-barra-grupo">
          <span className="mv-barra-titulo">Color · lectura del vaso</span>
          <div className="mv-colores">
            {COLORES.map(c => (
              <button
                key={c.id}
                type="button"
                className={`mv-color${estilo.color === c.id ? ' on' : ''}`}
                style={{ background: c.hex }}
                title={`${c.label}: ${c.ayuda}`}
                aria-label={`${c.label}: ${c.ayuda}`}
                aria-pressed={estilo.color === c.id}
                onClick={() => onEstilo({ color: c.id })}
              />
            ))}
          </div>
          {color && (
            <p className="mv-color-significado">
              <strong>{color.label}:</strong> {color.ayuda}
            </p>
          )}
        </div>
      )}

      {!soloLectura && (eligiendoTrazo || eligiendoMarcador) && (
        <div className="mv-barra-grupo">
          <span className="mv-barra-titulo">
            {eligiendoTrazo ? 'Recorrido venoso' : 'Hallazgo puntual'}
          </span>
          <div className="mv-leyenda">
            {eligiendoTrazo
              ? TRAYECTOS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`mv-hallazgo${estilo.trayecto === t.id ? ' on' : ''}`}
                  aria-pressed={estilo.trayecto === t.id}
                  title={`${t.label} — ${t.ayuda}`}
                  onClick={() => elegirTrayecto(t)}
                >
                  <span className="mv-hallazgo-muestra">
                    {/* Con el color activo: la muestra enseña exactamente lo
                        que va a quedar dibujado en la lámina. */}
                    <MuestraTrayecto trayecto={t} color={tono} ancho={54} />
                  </span>
                  <span className="mv-hallazgo-label">{t.label}</span>
                </button>
              ))
              : MARCADORES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`mv-hallazgo${estilo.marcador === m.id ? ' on' : ''}`}
                  aria-pressed={estilo.marcador === m.id}
                  title={`${m.label} — ${m.ayuda}`}
                  onClick={() => onEstilo({ marcador: m.id })}
                >
                  <span className="mv-hallazgo-muestra">
                    <FormaMarcador simbolo={m.simbolo} color={tono} />
                  </span>
                  <span className="mv-hallazgo-label">{m.label}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {!soloLectura && eligiendoTrazo && (
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
      )}

      {soloLectura && <Leyenda />}
    </aside>
  );
}

/**
 * Leyenda completa para el modo lectura, con los tres ejes tal y como están en
 * la lámina impresa. Al no poder dibujar, lo que hace falta es poder interpretar
 * lo que ya está dibujado.
 */
function Leyenda() {
  return (
    <>
      <div className="mv-barra-grupo">
        <span className="mv-barra-titulo">Color · lectura del vaso</span>
        <div className="mv-leyenda">
          {COLORES.map(c => (
            <div key={c.id} className="mv-hallazgo mv-hallazgo-lectura" title={`${c.label}: ${c.ayuda}`}>
              <span className="mv-hallazgo-muestra">
                <span className="mv-color mv-color-muestra" style={{ background: c.hex }} />
              </span>
              <span className="mv-hallazgo-label">{c.ayuda}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mv-barra-grupo">
        <span className="mv-barra-titulo">Recorrido venoso</span>
        <div className="mv-leyenda">
          {TRAYECTOS.map(t => (
            <div key={t.id} className="mv-hallazgo mv-hallazgo-lectura" title={t.ayuda}>
              <span className="mv-hallazgo-muestra">
                <MuestraTrayecto trayecto={t} color="var(--brand-text)" ancho={54} />
              </span>
              <span className="mv-hallazgo-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mv-barra-grupo">
        <span className="mv-barra-titulo">Hallazgo puntual</span>
        <div className="mv-leyenda">
          {MARCADORES.map(m => (
            <div key={m.id} className="mv-hallazgo mv-hallazgo-lectura" title={m.ayuda}>
              <span className="mv-hallazgo-muestra">
                <FormaMarcador simbolo={m.simbolo} color={hexDe(m.colorPorDefecto)} />
              </span>
              <span className="mv-hallazgo-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}