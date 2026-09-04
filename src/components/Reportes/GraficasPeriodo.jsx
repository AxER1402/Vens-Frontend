import BarrasPorEstado from '../graficas/BarrasPorEstado';
import ColumnasEnElTiempo from '../graficas/ColumnasEnElTiempo';
import { NOMBRE_PASO, repartir, tramosDelPeriodo } from '../graficas/tramos';

/**
 * Las dos lecturas del período que ninguna cifra suelta da: en qué terminaron
 * las citas y en qué tramos se concentró el trabajo clínico.
 *
 * Lo cobrado se dejó fuera a propósito: vive en Facturación, que es donde se
 * cobra y donde alguien hace esa pregunta.
 */
function GraficasPeriodo({ desde, hasta, citasPorEstado, fechasDeConsulta, cargando }) {
  const { paso } = tramosDelPeriodo(desde, hasta);

  const consultas = repartir(
    tramosDelPeriodo(desde, hasta).tramos,
    fechasDeConsulta,
    (f) => f,
    () => 1
  );

  return (
    <div className="gr-par">
      <figure className="gr-figura">
        <figcaption className="gr-titulo">
          En qué terminaron las citas
          <span className="gr-subtitulo">Citas del período, por estado</span>
        </figcaption>
        {cargando ? (
          <p className="gr-vacio">Contando…</p>
        ) : (
          <BarrasPorEstado datos={citasPorEstado} />
        )}
      </figure>

      <figure className="gr-figura">
        <figcaption className="gr-titulo">
          Consultas registradas
          <span className="gr-subtitulo">Reparto del período {NOMBRE_PASO[paso]}</span>
        </figcaption>
        {cargando ? (
          <p className="gr-vacio">Contando…</p>
        ) : (
          <ColumnasEnElTiempo
            datos={consultas}
            vacio="No hubo consultas registradas en el período elegido."
            pie={(total, maximo) => `${total} en total · máximo de ${maximo} en un mismo tramo`}
          />
        )}
      </figure>
    </div>
  );
}

export default GraficasPeriodo;
