import { useState } from 'react';
import './GraficasPeriodo.css';

/**
 * Las dos gráficas del centro de reportes.
 *
 * Cada una lleva una sola serie y por lo tanto un solo color: el largo de la
 * barra ya dice la magnitud, y pintar cada categoría de un color distinto
 * gastaría el único canal libre en repetir lo que la barra muestra. El color
 * aquí no significa nada y por eso no cambia.
 *
 * Las dos son de barras y no de líneas a propósito: una línea entre dos días
 * promete una continuidad que no existe: entre el lunes y el miércoles no hay
 * media consulta, hay lo que se atendió cada día.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ── Barras horizontales: magnitud entre categorías con nombre ──────────── */

function BarrasPorEstado({ datos }) {
  const [encima, setEncima] = useState(null);
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  if (total === 0) {
    return <p className="gr-vacio">No hubo citas en el período elegido.</p>;
  }

  return (
    <div className="gr-barras">
      {datos.map((d) => (
        <div
          className="gr-fila"
          key={d.etiqueta}
          onMouseEnter={() => setEncima(d.etiqueta)}
          onMouseLeave={() => setEncima(null)}
        >
          <span className="gr-fila-nombre">{d.etiqueta}</span>
          <span className="gr-fila-pista">
            <span
              className="gr-fila-barra"
              style={{ width: `${Math.max(d.valor === 0 ? 0 : 2, (d.valor / maximo) * 100)}%` }}
            />
          </span>
          <span className={`gr-fila-valor${encima === d.etiqueta ? ' on' : ''}`}>
            {d.valor}
            {encima === d.etiqueta && total > 0 && (
              <span className="gr-fila-porcentaje">
                {Math.round((d.valor / total) * 100)}%
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Columnas: cuánto trabajo hubo en cada tramo del período ────────────── */

function ColumnasEnElTiempo({ datos }) {
  const [encima, setEncima] = useState(null);
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  if (total === 0) {
    return <p className="gr-vacio">No hubo consultas registradas en el período elegido.</p>;
  }

  // Con muchos tramos las etiquetas se pisan: se rotula uno de cada tantos y
  // el resto lo cuenta el globo al pasar por encima. El tramo más alto lleva
  // rótulo siempre: es el que se busca al mirar la gráfica.
  const cada = Math.ceil(datos.length / 8);
  const cumbre = datos.findIndex((d) => d.valor === maximo);

  return (
    <div className="gr-columnas">
      <div className="gr-plano">
        {datos.map((d, i) => (
          <div
            className="gr-col"
            key={d.clave}
            onMouseEnter={() => setEncima(i)}
            onMouseLeave={() => setEncima(null)}
          >
            {encima === i && (
              <span className="gr-globo">
                {d.etiquetaLarga}: <strong>{d.valor}</strong>
              </span>
            )}
            {d.valor > 0 && (
              <span
                className="gr-col-barra"
                style={{ height: `${(d.valor / maximo) * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="gr-eje">
        {datos.map((d, i) => (
          <span className="gr-eje-marca" key={d.clave}>
            {i % cada === 0 || i === cumbre ? d.etiqueta : ''}
          </span>
        ))}
      </div>

      <p className="gr-pie">
        {total} en total · máximo de {maximo} en un mismo tramo
      </p>
    </div>
  );
}

/* ── Reparto de las fechas en tramos ────────────────────────────────────── */

/**
 * El tamaño del tramo lo decide el largo del rango: treinta barras diarias en
 * un trimestre no se leen, y una sola barra mensual en una semana no dice nada.
 */
function tramosDelPeriodo(desde, hasta) {
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
    return { paso: 'dia', tramos: [] };
  }

  const dias = Math.round((fin - inicio) / 86400000) + 1;
  const paso = dias <= 21 ? 'dia' : dias <= 120 ? 'semana' : 'mes';
  const tramos = [];

  const cursor = new Date(inicio);
  if (paso === 'semana') {
    // Se arranca el lunes de la semana en que cae el inicio del rango
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  } else if (paso === 'mes') {
    cursor.setDate(1);
  }

  while (cursor <= fin) {
    const arranque = new Date(cursor);
    let etiqueta;
    let etiquetaLarga;

    if (paso === 'dia') {
      etiqueta = String(arranque.getDate());
      etiquetaLarga = `${arranque.getDate()} de ${MESES[arranque.getMonth()]}`;
      cursor.setDate(cursor.getDate() + 1);
    } else if (paso === 'semana') {
      etiqueta = `${arranque.getDate()} ${MESES[arranque.getMonth()]}`;
      etiquetaLarga = `Semana del ${arranque.getDate()} de ${MESES[arranque.getMonth()]}`;
      cursor.setDate(cursor.getDate() + 7);
    } else {
      etiqueta = MESES[arranque.getMonth()];
      etiquetaLarga = `${MESES[arranque.getMonth()]} ${arranque.getFullYear()}`;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    tramos.push({
      clave: arranque.toISOString().slice(0, 10),
      desde: arranque,
      hasta: new Date(cursor),
      etiqueta,
      etiquetaLarga,
      valor: 0,
    });
  }

  return { paso, tramos };
}

const NOMBRE_PASO = { dia: 'por día', semana: 'por semana', mes: 'por mes' };

function GraficasPeriodo({ desde, hasta, citasPorEstado, fechasDeConsulta, cargando }) {
  const { paso, tramos } = tramosDelPeriodo(desde, hasta);

  for (const fecha of fechasDeConsulta) {
    const dia = new Date(`${String(fecha).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(dia.getTime())) continue;
    const tramo = tramos.find((t) => dia >= t.desde && dia < t.hasta);
    if (tramo) tramo.valor += 1;
  }

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
          <ColumnasEnElTiempo datos={tramos} />
        )}
      </figure>
    </div>
  );
}

export default GraficasPeriodo;
