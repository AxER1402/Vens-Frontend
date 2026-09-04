import { useState } from 'react';
import './graficas.css';

/**
 * Columnas sobre los tramos de un período.
 *
 * Vive aparte porque la usan dos módulos —el centro de reportes para contar
 * consultas y facturación para sumar quetzales— y lo único que cambia entre
 * uno y otro es cómo se escribe el valor.
 */

function ColumnasEnElTiempo({ datos, vacio, formatear = (v) => v, pie }) {
  const [encima, setEncima] = useState(null);
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  if (total === 0) {
    return <p className="gr-vacio">{vacio}</p>;
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
                {d.etiquetaLarga}: <strong>{formatear(d.valor)}</strong>
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

      <p className="gr-pie">{pie(total, maximo)}</p>
    </div>
  );
}

export default ColumnasEnElTiempo;
