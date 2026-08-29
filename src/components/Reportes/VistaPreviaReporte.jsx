import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { guardarArchivo, obtenerReporte } from '../../services/reporteService';

/**
 * Vista previa de un informe clínico antes de descargarlo.
 *
 * Se abre pasando un descriptor de `reporteService` (o null para cerrarla):
 *
 *   const [vista, setVista] = useState(null);
 *   <VistaPreviaReporte reporte={vista} onCerrar={() => setVista(null)} />
 *
 * Cuando el informe admite partes —la consulta, el mapeo venoso y el
 * Ecodöppler— se pasa además `partes`, y los selectores salen **dentro** del
 * visor: marcar o desmarcar rehace el documento ahí mismo. Elegir antes de ver,
 * en un diálogo aparte, obliga a decidir a ciegas; aquí se ve el efecto.
 *
 *   partes = {
 *     disponibles: ['historia', 'mapeo', 'doppler'],
 *     construir: (seleccionadas) => descriptorDeReporte,
 *   }
 *
 * Lo que se muestra es **siempre el PDF**, incluso cuando el informe también se
 * emite en Word: ningún navegador sabe representar un .docx, así que
 * previsualizar el Word obligaría a descargarlo para verlo, que es justo lo que
 * la vista previa viene a evitar. Los dos formatos salen del mismo contenido.
 */

/** Etiquetas de las partes, en el orden en que se imprimen. */
const ETIQUETAS = {
  historia: 'Historia clínica',
  mapeo: 'Mapeo venoso',
  doppler: 'Ecodöppler',
};

const ORDEN = ['historia', 'mapeo', 'doppler'];

/** Espera antes de pedir el informe, para que marcar varias casillas seguidas
 *  no dispare una generación por clic. */
const ESPERA_MS = 300;

function VistaPreviaReporte({ reporte, onCerrar, partes = null }) {
  const [estado, setEstado] = useState('cargando');   // cargando | recargando | listo | error
  const [mensaje, setMensaje] = useState('');
  const [documento, setDocumento] = useState(null);   // { blob, nombre, url }
  const [descargando, setDescargando] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [abiertoPrevio, setAbiertoPrevio] = useState(false);

  // La URL de objeto vive en una referencia además del estado para poder
  // liberarla desde la limpieza del efecto sin volver a dispararlo.
  const urlRef = useRef(null);

  const abierto = reporte !== null && reporte !== undefined;
  const disponibles = partes?.disponibles ?? [];

  // Al abrir se parte de todo lo disponible: es lo que se entrega la mayoría de
  // las veces, y quitar una casilla cuesta menos que acordarse de ponerlas.
  //
  // Se ajusta durante el render y no en un efecto: hacerlo después del pintado
  // deja un fotograma con la selección vacía, y el visor parpadea el aviso de
  // «marque al menos una parte» cada vez que se abre.
  if (abierto !== abiertoPrevio) {
    setAbiertoPrevio(abierto);
    if (abierto) setSeleccion(disponibles);
  }

  // Descriptor efectivo: con selectores lo arma la página a partir de lo
  // marcado; sin ellos, es el que llegó por props.
  const vacia = partes !== null && seleccion.length === 0;
  const descriptor = partes && ! vacia ? partes.construir(seleccion) : reporte;

  useEffect(() => {
    if (! abierto || vacia) return undefined;

    let cancelado = false;

    // Mientras se rehace se conserva el documento anterior a la vista: vaciar el
    // visor en cada clic haría que marcar una casilla pareciera un error.
    setEstado((previo) => (previo === 'listo' ? 'recargando' : 'cargando'));
    setMensaje('');

    const temporizador = setTimeout(() => {
      obtenerReporte(descriptor, 'pdf')
        .then((doc) => {
          // Si el diálogo se cerró —o se cambió la selección— mientras el
          // informe se generaba, el archivo ya no le sirve a nadie: liberarlo
          // evita retener en memoria un PDF que puede pesar varios MB.
          if (cancelado) {
            URL.revokeObjectURL(doc.url);
            return;
          }

          if (urlRef.current) URL.revokeObjectURL(urlRef.current);

          urlRef.current = doc.url;
          setDocumento(doc);
          setEstado('listo');
        })
        .catch((error) => {
          if (cancelado) return;
          setMensaje(error.message);
          setEstado('error');
        });
    }, ESPERA_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
    // `clave` identifica el informe pedido; el descriptor se reconstruye en cada
    // render y usarlo como dependencia recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, vacia, descriptor?.clave]);

  // Liberar el último documento al cerrar
  useEffect(() => {
    if (abierto) return undefined;

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [abierto]);

  const alternar = (id) => setSeleccion((previas) =>
    previas.includes(id) ? previas.filter((p) => p !== id) : [...previas, id]
  );

  /** El PDF ya está en memoria: descargarlo no vuelve a pedirlo al servidor. */
  const descargarFormato = async (formato) => {
    if (formato === 'pdf') {
      if (documento) guardarArchivo(documento.blob, documento.nombre);
      return;
    }

    // El Word sí hay que pedirlo: es otro archivo, no otra vista del mismo.
    setDescargando(formato);

    try {
      const { blob, nombre, url } = await obtenerReporte(descriptor, formato);
      URL.revokeObjectURL(url);
      guardarArchivo(blob, nombre);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setDescargando(null);
    }
  };

  if (! abierto) return null;

  const cargando = estado === 'cargando';
  const recargando = estado === 'recargando';

  return (
    <Dialog open onOpenChange={(valor) => { if (! valor) onCerrar(); }}>
      <DialogContent className="flat-page hc-page flex h-[92vh] w-[min(96vw,1080px)] max-w-[96vw] flex-col gap-3 rounded-none bg-brand-surface p-4 sm:max-w-[min(96vw,1080px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-text">
            <FileText size={16} /> {descriptor?.titulo ?? reporte.titulo}
          </DialogTitle>
          <DialogDescription>
            {partes
              ? 'Marque qué lleva el informe: el documento se rehace al momento.'
              : reporte.descripcion}
          </DialogDescription>
        </DialogHeader>

        {/* Selectores de contenido */}
        {partes && (
          <div className="hc-chips">
            {ORDEN.filter((id) => disponibles.includes(id)).map((id) => {
              const marcada = seleccion.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  className={`hc-chip${marcada ? ' on' : ''}`}
                  aria-pressed={marcada}
                  onClick={() => alternar(id)}
                >
                  {marcada && <Check size={12} strokeWidth={3} className="mr-1.5" />}
                  {ETIQUETAS[id]}
                </button>
              );
            })}
          </div>
        )}

        {/* El informe se arma con lo que hay en la base, no con lo que hay en
            pantalla. Si el formulario tiene cambios sin guardar, decirlo evita
            que el médico crea que la vista previa está rota. */}
        {reporte.aviso && (
          <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle size={14} className="mt-px shrink-0" />
            <span>{reporte.aviso}</span>
          </div>
        )}

        {/* Visor */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-brand-border bg-neutral-100">
          {documento && ! vacia && (
            <iframe
              src={documento.url}
              title={`Vista previa · ${descriptor?.titulo ?? ''}`}
              className="h-full w-full border-0"
            />
          )}

          {vacia && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <AlertCircle size={22} className="text-amber-600" />
              <span className="text-sm text-brand-text">
                Marque al menos una parte para ver el informe.
              </span>
            </div>
          )}

          {(cargando || recargando) && ! vacia && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-text-light ${recargando ? 'bg-white/70' : ''}`}>
              <RefreshCw size={22} className="animate-spin" />
              <span className="text-sm">{recargando ? 'Rehaciendo el informe…' : 'Generando el informe…'}</span>
            </div>
          )}

          {estado === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100 px-6 text-center">
              <AlertCircle size={22} className="text-red-600" />
              <span className="text-sm text-brand-text">{mensaje}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-brand-text-light">
            {estado === 'listo' && documento ? documento.nombre : ' '}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {documento && ! vacia && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Útil si el visor incrustado aparece en blanco"
                onClick={() => window.open(documento.url, '_blank', 'noopener')}
              >
                <ExternalLink size={14} /> Abrir en pestaña nueva
              </button>
            )}

            <button type="button" className="btn btn-secondary btn-sm" onClick={onCerrar}>
              Cerrar
            </button>

            {(descriptor?.formatos ?? reporte.formatos).map((formato) => (
              <button
                key={formato}
                type="button"
                className={`btn btn-sm ${formato === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={estado !== 'listo' || descargando !== null || vacia}
                onClick={() => descargarFormato(formato)}
              >
                <Download size={14} />
                {descargando === formato
                  ? 'Generando…'
                  : `Descargar ${formato === 'pdf' ? 'PDF' : 'Word'}`}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VistaPreviaReporte;
