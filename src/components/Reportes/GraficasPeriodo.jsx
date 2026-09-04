import BarrasPorEstado from '../graficas/BarrasPorEstado';
import ColumnasEnElTiempo from '../graficas/ColumnasEnElTiempo';
import { NOMBRE_PASO, quetzalesCortos, repartir, tramosDelPeriodo } from '../graficas/tramos';

/**
 * Las tres lecturas del período que ninguna cifra suelta da: en qué terminaron
 * las citas, en qué tramos se concentró el trabajo clínico y cuánto entró.
 */
function GraficasPeriodo({ desde, hasta, citasPorEstado, fechasDeConsulta, cobros = [], cargando }) {
  const { paso } = tramosDelPeriodo(desde, hasta);

  const consultas = repartir(
    tramosDelPeriodo(desde, hasta).tramos,
    fechasDeConsulta,
    (f) => f,
    () => 1
  );

  const entradas = repartir(
    tramosDelPeriodo(desde, hasta).tramos,
    cobros,
    (c) => c.fecha,
    (c) => c.monto
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

      <figure className="gr-figura">
        <figcaption className="gr-titulo">
          Entradas por cobros
          <span className="gr-subtitulo">Lo cobrado {NOMBRE_PASO[paso]}, sin los documentos anulados</span>
        </figcaption>
        {cargando ? (
          <p className="gr-vacio">Sumando…</p>
        ) : (
          <ColumnasEnElTiempo
            datos={entradas}
            vacio="No se registraron cobros en el período elegido."
            formatear={quetzalesCortos}
            pie={(total, maximo) =>
              `${quetzalesCortos(total)} en total · máximo de ${quetzalesCortos(maximo)} en un mismo tramo`}
          />
        )}
      </figure>
    </div>
  );
}

export default GraficasPeriodo;
