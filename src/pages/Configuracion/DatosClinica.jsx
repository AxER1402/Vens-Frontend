import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2, Save, Image as ImagenIcono, Upload, Receipt, Stethoscope, AlertCircle,
} from 'lucide-react';
import { useAvisos } from '../../components/Avisos';
import { soloDigitos, TELEFONO_MAXIMO } from '../../lib/telefono';
import * as ajusteService from '../../services/ajusteService';

/** Peso máximo del logo. El mismo que valida el backend. */
const MAXIMO_BYTES = 2 * 1024 * 1024;

/**
 * Los datos de la clínica.
 *
 * De aquí salen el membrete de los informes clínicos, los datos fiscales de
 * los recibos y la firma de los documentos. Antes vivían en el .env, así que
 * corregir un NIT obligaba a editar un archivo y volver a desplegar.
 */
export default function DatosClinica() {
  const avisos = useAvisos();

  const [valores, setValores] = useState(null);
  const [originales, setOriginales] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const selectorLogo = useRef(null);

  const cargar = useCallback(async () => {
    const res = await ajusteService.getAjustes();

    if (res.success) {
      // El backend devuelve null en lo que nunca se llenó; el formulario
      // necesita cadenas o React protesta por un input no controlado.
      const texto = Object.fromEntries(
        Object.entries(res.data).map(([k, v]) => [k, v ?? '']),
      );
      setValores(texto);
      setOriginales(texto);
      setLogoUrl(res.logoUrl);
    } else {
      avisos.error(res.message);
    }

    setCargando(false);
  }, [avisos]);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (clave) => (evento) => {
    setValores((previo) => ({ ...previo, [clave]: evento.target.value }));
  };

  const sinCambios = valores !== null && originales !== null
    && Object.keys(valores).every((k) => valores[k] === originales[k]);

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);

    // El logo no se teclea, se sube: va aparte y no en este formulario.
    const { 'clinica.logo': _logo, ...editables } = valores;

    const res = await ajusteService.actualizarAjustes(editables);

    if (res.success) {
      const texto = Object.fromEntries(
        Object.entries(res.data).map(([k, v]) => [k, v ?? '']),
      );
      setValores(texto);
      setOriginales(texto);
      avisos.exito(res.message);
    } else {
      setErrores(res.errors ?? {});
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  const elegirLogo = async (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    if (archivo.size > MAXIMO_BYTES) {
      avisos.error('La imagen no puede pesar más de 2 MB.');
      return;
    }

    setSubiendoLogo(true);
    const res = await ajusteService.subirLogo(archivo);

    if (res.success) {
      setLogoUrl(res.logoUrl);
      avisos.exito(res.message);
    } else {
      avisos.error(res.message, res.errors?.logo?.[0]);
    }

    setSubiendoLogo(false);
  };

  if (cargando) {
    return (
      <section className="hc-section">
        <div className="hc-section-body">
          <p className="hc-field-hint">Cargando los datos de la clínica…</p>
        </div>
      </section>
    );
  }

  if (!valores) return null;

  const campo = (clave, etiqueta, extras = {}) => (
    <div className="hc-field">
      <label className="hc-field-label" htmlFor={`aj-${clave}`}>{etiqueta}</label>
      <input
        id={`aj-${clave}`}
        type="text"
        className="form-control"
        value={valores[clave] ?? ''}
        onChange={extras.onChange ?? set(clave)}
        {...extras.input}
      />
      {extras.ayuda && <span className="form-hint">{extras.ayuda}</span>}
      {errores[clave] && (
        <span className="form-hint form-hint-danger">{errores[clave][0]}</span>
      )}
    </div>
  );

  return (
    <form onSubmit={guardar}>
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <ImagenIcono size={14} />
          <h2 className="hc-section-title">Logo del membrete</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-foto">
            <div className="config-logo-marco">
              {logoUrl
                ? <img src={logoUrl} alt="Logo de la clínica" />
                : <span className="hc-field-hint">Sin logo</span>}
            </div>

            <div className="config-foto-lado">
              <p className="hc-field-hint">
                Encabeza los informes clínicos y los recibos, en PDF y en Word.
                PNG o JPG, hasta 2 MB.
              </p>
              <p className="hc-field-hint">
                No se acepta WEBP: el logo no lo dibuja un navegador, lo
                incrusta el generador de PDF, y ese formato no le entra.
              </p>

              <div className="config-foto-acciones">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => selectorLogo.current?.click()}
                  disabled={subiendoLogo}
                >
                  <Upload size={15} />
                  {subiendoLogo ? 'Subiendo…' : 'Cambiar logo'}
                </button>
              </div>

              <input
                ref={selectorLogo}
                type="file"
                accept="image/png,image/jpeg"
                onChange={elegirLogo}
                hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Membrete ─────────────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Building2 size={14} />
          <h2 className="hc-section-title">Datos del centro</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-grid">
            {campo('clinica.nombre', 'Nombre del centro', {
              ayuda: 'Encabeza los informes clínicos.',
            })}
            {campo('clinica.especialidad', 'Especialidad')}
            {campo('clinica.direccion', 'Dirección')}
            {campo('clinica.telefono', 'Teléfono', {
              onChange: (e) => setValores((p) => ({
                ...p, 'clinica.telefono': soloDigitos(e.target.value),
              })),
              input: { inputMode: 'numeric', maxLength: TELEFONO_MAXIMO, placeholder: '22222222' },
            })}
            {campo('clinica.correo', 'Correo de contacto', {
              input: { type: 'email', placeholder: 'contacto@clinica.gt' },
            })}
          </div>
        </div>
      </section>

      {/* ── Facturación ──────────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Receipt size={14} />
          <h2 className="hc-section-title">Datos fiscales</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-grid">
            {campo('facturacion.emisor', 'Razón social')}
            {campo('facturacion.nit', 'NIT')}
            {campo('facturacion.direccion', 'Dirección fiscal')}
            {campo('facturacion.serie', 'Serie de los recibos', {
              ayuda: 'El correlativo propio de la clínica, aparte del que asigna la SAT.',
            })}
            {campo('facturacion.moneda', 'Moneda', {
              input: { maxLength: 3, placeholder: 'GTQ' },
              ayuda: 'Código de tres letras.',
            })}
            {campo('facturacion.iva', 'Porcentaje de IVA', {
              input: { inputMode: 'decimal', placeholder: '12' },
            })}
          </div>

          <p className="config-advertencia">
            <AlertCircle size={15} />
            <span>
              La serie y el porcentaje de IVA solo afectan a lo que se emita de
              aquí en adelante. Cada recibo guarda los suyos, así que cambiarlos
              no reescribe ningún documento ya emitido.
            </span>
          </p>
        </div>
      </section>

      {/* ── Médico responsable ───────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Stethoscope size={14} />
          <h2 className="hc-section-title">Médico responsable</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-grid">
            {campo('medico.nombre', 'Nombre para la firma')}
            {campo('medico.colegiado', 'Número de colegiado')}
          </div>

          <span className="hc-field-hint">
            Se imprime al pie de los informes. Si se deja vacío, cada informe
            firma con el usuario que registró la consulta.
          </span>

          <div className="config-acciones">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando || sinCambios}
            >
              <Save size={15} />
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
