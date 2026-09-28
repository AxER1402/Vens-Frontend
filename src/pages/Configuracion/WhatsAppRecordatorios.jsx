import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Smartphone, AlertCircle, CheckCircle2, Unlink, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAvisos } from '../../components/Avisos';
import * as whatsappService from '../../services/whatsappService';

/**
 * Cada cuánto se vuelve a preguntar por la conexión mientras no está lista.
 *
 * El QR de WhatsApp caduca a los veinte segundos y se reemplaza por otro, y
 * al escanearlo la pantalla tiene que enterarse sola de que ya quedó
 * vinculado. Una vez conectado ya no hace falta insistir.
 */
const SONDEO_MS = 3000;

/** Cómo se nombra cada estado del servicio de cara al usuario. */
const ESTADOS = {
  conectado: 'Vinculado',
  esperando_qr: 'Esperando que se escanee el código',
  iniciando: 'Iniciando…',
  desconectado: 'Reconectando…',
  sin_servicio: 'El servicio de WhatsApp no responde',
};

/** +50255512345 → +502 5551 2345, para que se lea de un vistazo. */
const formatearNumero = (numero) => {
  if (!numero) return '';
  const local = numero.slice(-8);
  const pais = numero.slice(0, -8);
  return `${pais ? `+${pais} ` : ''}${local.slice(0, 4)} ${local.slice(4)}`;
};

/**
 * Los recordatorios de citas por WhatsApp.
 *
 * Un día antes de cada cita, a la misma hora, el paciente recibe un mensaje
 * desde el WhatsApp de la clínica: la cita del jueves a las cinco de la tarde
 * se recuerda el miércoles a las cinco.
 */
export default function WhatsAppRecordatorios() {
  const avisos = useAvisos();

  const [recordatorios, setRecordatorios] = useState(false);
  const [conexion, setConexion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);

  // Una respuesta del sondeo puede llegar cuando ya se cambió de sección; en
  // ese caso se descarta en vez de tocar el estado de un componente que ya no
  // está en pantalla.
  const montado = useRef(true);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    const res = await whatsappService.getWhatsApp();
    if (!montado.current) return;

    if (res.success) {
      setRecordatorios(res.recordatorios);
      setConexion(res.conexion);
    } else if (!silencioso) {
      avisos.error(res.message);
    }

    setCargando(false);
  }, [avisos]);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => { montado.current = false; };
  }, [cargar]);

  const conectado = conexion?.estado === 'conectado';

  useEffect(() => {
    if (cargando || conectado) return undefined;

    const intervalo = setInterval(() => cargar({ silencioso: true }), SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [cargando, conectado, cargar]);

  const cambiarRecordatorios = async (activar) => {
    setGuardando(true);
    // Se mueve el interruptor al instante: esperar la respuesta haría que
    // pareciera que el clic no funcionó.
    setRecordatorios(activar);

    const res = await whatsappService.actualizarRecordatorios(activar);

    if (res.success) {
      setRecordatorios(res.recordatorios);
      setConexion(res.conexion);
      avisos.exito(res.message);
    } else {
      setRecordatorios(!activar);
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  const desvincular = async () => {
    setDesvinculando(true);
    const res = await whatsappService.cerrarSesion();

    if (res.success) {
      setConexion(res.conexion);
      avisos.exito(res.message);
    } else {
      avisos.error(res.message);
    }

    setDesvinculando(false);
    setConfirmando(false);
  };

  if (cargando) {
    return (
      <section className="hc-section">
        <div className="hc-section-body">
          <p className="hc-field-hint">Consultando WhatsApp…</p>
        </div>
      </section>
    );
  }

  const estado = conexion?.estado ?? 'sin_servicio';

  return (
    <>
      {/* ── El interruptor ───────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <BellRing size={14} />
          <h2 className="hc-section-title">Recordatorios de citas</h2>
        </div>

        <div className="hc-section-body">
          <label className="config-interruptor">
            <input
              type="checkbox"
              role="switch"
              checked={recordatorios}
              disabled={guardando}
              onChange={(e) => cambiarRecordatorios(e.target.checked)}
            />
            <span className="config-interruptor-pista" aria-hidden="true" />
            <span className="config-interruptor-texto">
              <span className="config-interruptor-titulo">
                Avisar por WhatsApp 24 horas antes de la cita
              </span>
              <span className="config-interruptor-descripcion">
                El paciente recibe el mensaje un día antes, a la misma hora: si
                su cita es el jueves a las 5:00 PM, el aviso le llega el
                miércoles a las 5:00 PM. Las citas canceladas no se recuerdan.
              </span>
            </span>
          </label>

          {recordatorios && !conectado && (
            <p className="config-advertencia">
              <AlertCircle size={15} />
              <span>
                Los recordatorios están activados, pero no saldrá ningún mensaje
                hasta que vincule el teléfono de la clínica aquí abajo.
              </span>
            </p>
          )}
        </div>
      </section>

      {/* ── El teléfono vinculado ────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Smartphone size={14} />
          <h2 className="hc-section-title">Teléfono de la clínica</h2>
        </div>

        <div className="hc-section-body">
          <p className={`config-whatsapp-estado config-whatsapp-${estado}`}>
            {conectado
              ? <CheckCircle2 size={15} />
              : estado === 'sin_servicio'
                ? <AlertCircle size={15} />
                : <Loader2 size={15} className="config-girando" />}
            <span>{ESTADOS[estado] ?? estado}</span>
          </p>

          {conectado && (
            <>
              <p className="hc-field-hint">
                Los recordatorios salen desde el número{' '}
                <strong>{formatearNumero(conexion.numero)}</strong>.
              </p>
              <div className="config-acciones config-acciones-izquierda">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmando(true)}
                >
                  <Unlink size={15} />
                  Desvincular teléfono
                </button>
              </div>
            </>
          )}

          {estado === 'esperando_qr' && conexion?.qr && (
            <div className="config-whatsapp-vincular">
              <img
                src={conexion.qr}
                alt="Código QR para vincular WhatsApp"
                className="config-whatsapp-qr"
              />
              <ol className="config-whatsapp-pasos">
                <li>Abra WhatsApp en el teléfono de la clínica.</li>
                <li>Toque <strong>Menú</strong> o <strong>Configuración</strong> y elija <strong>Dispositivos vinculados</strong>.</li>
                <li>Toque <strong>Vincular un dispositivo</strong> y apunte la cámara a este código.</li>
              </ol>
            </div>
          )}

          {estado === 'sin_servicio' && (
            <p className="config-advertencia">
              <AlertCircle size={15} />
              <span>
                No se pudo contactar al servicio de WhatsApp. Revise que el
                contenedor <strong>whatsapp</strong> esté encendido
                (<code>docker compose up -d whatsapp</code>).
              </span>
            </p>
          )}
        </div>
      </section>

      {/* ── Confirmar la desvinculación ──────────────────────────────── */}
      <AlertDialog
        open={confirmando}
        onOpenChange={(abierto) => { if (!abierto) setConfirmando(false); }}
      >
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon"><Unlink size={17} /></span>
            <AlertDialogTitle className="confirm-title">Desvincular teléfono</AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            El sistema deja de poder mandar mensajes desde{' '}
            <strong>{formatearNumero(conexion?.numero)}</strong>. Mientras no se
            vincule otro teléfono, los recordatorios no saldrán aunque sigan
            activados.
          </AlertDialogDescription>

          <div className="confirm-actions dialog-sep">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmando(false)}
              disabled={desvinculando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={desvincular}
              disabled={desvinculando}
            >
              {desvinculando ? 'Desvinculando…' : 'Sí, desvincular'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
