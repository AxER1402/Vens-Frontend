import { useEffect, useState } from 'react';
import { CalendarDays, Download, Eye, TrendingUp } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import * as reporteService from '../../services/reporteService';
import './ReporteIngresos.css';

const aISO = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Los tres rangos que se piden en el mostrador. */
const ATAJOS = [
  {
    clave: 'hoy',
    etiqueta: 'Hoy',
    calcular: () => {
      const hoy = aISO(new Date());
      return { desde: hoy, hasta: hoy };
    },
  },
  {
    clave: 'mes',
    etiqueta: 'Este mes',
    calcular: () => {
      const ahora = new Date();
      return {
        desde: aISO(new Date(ahora.getFullYear(), ahora.getMonth(), 1)),
        hasta: aISO(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
      };
    },
  },
  {
    clave: 'mes-anterior',
    etiqueta: 'Mes anterior',
    calcular: () => {
      const ahora = new Date();
      return {
        desde: aISO(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)),
        hasta: aISO(new Date(ahora.getFullYear(), ahora.getMonth(), 0)),
      };
    },
  },
];

/**
 * Emisión del reporte de ingresos.
 *
 * Vive aquí y no en el centro de reportes porque es la pregunta que se hace
 * quien cobra —cuánto entró hoy, cuánto va del mes— y hacerla desde otra
 * pantalla obliga a cambiar de sitio para responder algo que se pregunta con
 * la caja delante.
 *
 * El rango se elige aquí mismo: el reporte lo aceptan día, mes o dos fechas
 * cualesquiera, así que los atajos resuelven lo habitual y los selectores lo
 * demás.
 */
function ReporteIngresos({ onVistaPrevia }) {
  const [catalogo, setCatalogo] = useState([]);
  const [rango, setRango] = useState(ATAJOS[1].calcular());
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await reporteService.getCatalogoReportes('facturacion');
      if (res.success) setCatalogo(res.data);
    })();
  }, []);

  const reporte = catalogo.find((r) => r.clave === 'ingresos');

  // Sin el reporte en el catálogo, el usuario no tiene permiso para emitirlo.
  if (!reporte) return null;

  const descriptor = () => reporteService.reportePeriodo(reporte, rango);

  const descargar = async () => {
    setDescargando(true);
    setError('');

    const res = await reporteService.descargarReportePeriodo(reporte, rango, 'pdf');
    if (!res?.success && res?.message) setError(res.message);

    setDescargando(false);
  };

  return (
    <div className="ri-bloque">
      <p className="ri-nota">
        {reporte.descripcion}
      </p>

      <div className="ri-controles">
        <div className="hc-field">
          <label className="hc-field-label">Desde</label>
          <DatePicker
            value={rango.desde}
            onChange={(valor) => setRango((prev) => ({ ...prev, desde: valor }))}
            placeholder="Fecha inicial"
          />
        </div>

        <div className="hc-field">
          <label className="hc-field-label">Hasta</label>
          <DatePicker
            value={rango.hasta}
            onChange={(valor) => setRango((prev) => ({ ...prev, hasta: valor }))}
            placeholder="Fecha final"
          />
        </div>

        <div className="ri-atajos">
          <span className="ri-atajos-rotulo">
            <CalendarDays size={13} /> Rangos rápidos
          </span>
          {ATAJOS.map(({ clave, etiqueta, calcular }) => (
            <button
              key={clave}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setRango(calcular())}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="notice notice-danger">
          <span className="notice-body">{error}</span>
        </div>
      )}

      <div className="ri-acciones">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onVistaPrevia(descriptor())}
        >
          <Eye size={14} /> Vista previa
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={descargar}
          disabled={descargando}
        >
          <Download size={14} />
          {descargando ? 'Generando…' : 'Descargar PDF'}
        </button>
        <span className="ri-pista">
          <TrendingUp size={13} />
          Lo cobrado por día, por método de pago y por concepto, sin los anulados.
        </span>
      </div>
    </div>
  );
}

export default ReporteIngresos;
