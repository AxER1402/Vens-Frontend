import { useState } from 'react';
import './graficas.css';

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

export default BarrasPorEstado;
