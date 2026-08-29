import { Pencil, Trash2, MessageSquareOff } from 'lucide-react';
import { anotacionesDe, marcadoresDe, resumenPorMiembro } from './objetos';
import { etiquetaZona, MIEMBROS } from './zonas';
import { descripcionDe, simboloDe, estiloDe, significadoDe } from './catalogo';
import { FormaMarcador } from './SimbolosMapeo';

/**
 * Columna derecha: lista de anotaciones y marcadores del mapeo.
 *
 * Es la contraparte legible del dibujo. Cada entrada lleva su número —el mismo
 * que se ve en el alfiler sobre la pierna— y la vista anatómica en la que cayó,
 * de modo que el mapeo se pueda leer sin mirar la imagen.
 */
export default function PanelAnotaciones({
  objetos,
  seleccion,
  soloLectura = false,
  onIr,
  onEditar,
  onEliminar,
}) {
  const anotaciones = anotacionesDe(objetos);
  const marcadores = marcadoresDe(objetos);
  const resumen = resumenPorMiembro(objetos);

  return (
    <aside className="mv-panel" aria-label="Anotaciones del mapeo">
      <div className="mv-panel-grupo">
        <span className="mv-barra-titulo">
          Anotaciones {anotaciones.length > 0 && `(${anotaciones.length})`}
        </span>

        {anotaciones.length === 0 ? (
          <p className="mv-vacio">
            <MessageSquareOff size={15} />
            {soloLectura
              ? 'Este mapeo no tiene anotaciones.'
              : 'Elija «Comentario» y haga clic sobre la pierna para anclar una nota.'}
          </p>
        ) : (
          <ul className="mv-lista">
            {anotaciones.map(a => (
              <li key={a.id}>
                <div className={`mv-item${seleccion === a.id ? ' on' : ''}`}>
                  <button
                    type="button"
                    className="mv-item-cuerpo"
                    onClick={() => onIr(a.id)}
                    title="Ir a la anotación en el mapa"
                  >
                    <span className="mv-item-num">{a.numero}</span>
                    <span className="mv-item-texto">
                      <span className="mv-item-zona">{etiquetaZona(a.zona)}</span>
                      <span className="mv-item-detalle">{a.texto}</span>
                    </span>
                  </button>

                  {!soloLectura && (
                    <span className="mv-item-acciones">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Editar la anotación"
                        onClick={() => onEditar(a)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Eliminar la anotación"
                        onClick={() => onEliminar(a.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {marcadores.length > 0 && (
        <div className="mv-panel-grupo">
          <span className="mv-barra-titulo">Marcadores ({marcadores.length})</span>
          <ul className="mv-lista mv-lista-compacta">
            {marcadores.map(m => {
              const lectura = significadoDe(m.color);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`mv-item mv-item-cuerpo${seleccion === m.id ? ' on' : ''}`}
                    onClick={() => onIr(m.id)}
                    title={`Ir al marcador en el mapa${lectura ? ` — ${lectura}` : ''}`}
                  >
                    <span className="mv-item-simbolo">
                      <FormaMarcador simbolo={simboloDe(m)} color={estiloDe(m).color} tamano={15} />
                    </span>
                    <span className="mv-item-texto">
                      <span className="mv-item-zona">
                        {descripcionDe(m)} {m.numero}
                      </span>
                      {/* La zona dice dónde está; la lectura del color, qué es.
                          Sin ella la lista sería una fila de nombres iguales. */}
                      <span className="mv-item-detalle">
                        {[etiquetaZona(m.zona), lectura].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mv-panel-grupo">
        <span className="mv-barra-titulo">Resumen</span>
        <ul className="mv-resumen">
          {Object.values(MIEMBROS).map(m => (
            <li key={m.id}>
              <span>{m.abrev} · {m.label.replace('Miembro inferior ', '')}</span>
              <strong>{resumen[m.id]}</strong>
            </li>
          ))}
          {resumen.sin > 0 && (
            <li className="mv-resumen-aviso">
              <span>Fuera de las vistas</span>
              <strong>{resumen.sin}</strong>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
