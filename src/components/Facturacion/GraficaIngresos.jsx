import { useCallback, useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import ColumnasEnElTiempo from '../graficas/ColumnasEnElTiempo';
import { NOMBRE_PASO, quetzalesCortos, repartir, tramosDelPeriodo } from '../graficas/tramos';
import * as facturacionService from '../../services/facturacionService';
import './GraficaIngresos.css';

const { quetzales } = facturacionService;

const aISO = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Rangos que se piden en el mostrador. El de hoy es el que más se usa —«cuánto
 * llevamos»— y por eso arranca abierto en el mes, que es el que da contexto.
 */
const RANGOS = {
  hoy: {
    etiqueta: 'Hoy',
    calcular: () => {
      const hoy = aISO(new Date());
      return { desde: hoy, hasta: hoy };
    },
  },
  mes: {
    etiqueta: 'Este mes',
    calcular: () => {
      const ahora = new Date();
      return {
        desde: aISO(new Date(ahora.getFullYear(), ahora.getMonth(), 1)),
        hasta: aISO(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
      };
    },
  },
  trimestre: {
    etiqueta: 'Últimos 3 meses',
    calcular: () => {
      const ahora = new Date();
      return {
        desde: aISO(new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1)),
        hasta: aISO(ahora),
      };
    },
  },
};

/**
 * Lo que ha entrado, en la pantalla donde se cobra.
 *
 * Pide sus propios documentos y no reutiliza los del historial: el historial
 * muestra los últimos, incluidos los anulados, y aquí hace falta un rango
 * completo y solo lo vigente. Mezclar las dos listas daría un total que no
 * cuadra con ninguna de las dos.
 */
function GraficaIngresos({ recargar }) {
  const [rango, setRango] = useState('mes');
  const [cobros, setCobros] = useState([]);
  const [cargando, setCargando] = useState(true);

  const { desde, hasta } = RANGOS[rango].calcular();

  const consultar = useCallback(async (desdeISO, hastaISO) => {
    setCargando(true);
    const res = await facturacionService.getInvoices({ from_date: desdeISO, to_date: hastaISO });
    setCobros(res.success
      ? res.data.map((doc) => ({ fecha: doc.fecha_emision, monto: Number(doc.total) || 0 }))
      : []);
    setCargando(false);
  }, []);

  useEffect(() => { consultar(desde, hasta); }, [consultar, desde, hasta, recargar]);

  const { paso } = tramosDelPeriodo(desde, hasta);
  const tramos = repartir(
    tramosDelPeriodo(desde, hasta).tramos,
    cobros,
    (c) => c.fecha,
    (c) => c.monto
  );

  const total = cobros.reduce((suma, c) => suma + c.monto, 0);

  return (
    <div className="gi-bloque">
      <div className="gi-cabecera">
        <div>
          <span className="gi-rotulo">
            <TrendingUp size={13} /> Entró en el período
          </span>
          <p className="gi-total">{cargando ? '—' : quetzales(total)}</p>
          <p className="gi-detalle">
            {cobros.length} documento(s) · reparto {NOMBRE_PASO[paso]} · sin los anulados
          </p>
        </div>

        <div className="gi-rangos">
          {Object.entries(RANGOS).map(([clave, { etiqueta }]) => (
            <button
              key={clave}
              type="button"
              className={`btn btn-sm ${rango === clave ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRango(clave)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="gr-vacio">Sumando…</p>
      ) : (
        <ColumnasEnElTiempo
          datos={tramos}
          vacio="No se registraron cobros en este rango."
          formatear={quetzalesCortos}
          pie={(suma, maximo) =>
            `${quetzalesCortos(suma)} en total · máximo de ${quetzalesCortos(maximo)} en un mismo tramo`}
        />
      )}
    </div>
  );
}

export default GraficaIngresos;
