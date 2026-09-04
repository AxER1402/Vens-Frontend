import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, Save, User, Phone, Mail, ShieldCheck, IdCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../components/Avisos';
import AvatarUsuario from '../../components/AvatarUsuario';
import { soloDigitos, TELEFONO_MAXIMO } from '../../lib/telefono';
import { ETIQUETAS_ROL } from './secciones';
import * as profileService from '../../services/profileService';

/** Peso máximo de la foto. El mismo que valida el backend. */
const MAXIMO_BYTES = 2 * 1024 * 1024;

/**
 * Los datos propios: nombre, teléfono y foto.
 *
 * El correo y el rol se muestran pero no se editan, y no es un olvido: el
 * correo es con lo que se inicia sesión y por donde llega el enlace de
 * recuperación, y el rol es el permiso. Cambiárselos uno mismo sería abrirse
 * una puerta, no editar su perfil; eso pasa por el administrador.
 */
export default function MiCuenta() {
  const { user, refrescarUsuario } = useAuth();
  const avisos = useAvisos();

  const [nombre, setNombre] = useState(user?.name ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [ocupadaFoto, setOcupadaFoto] = useState(false);

  const selectorArchivo = useRef(null);

  // Si la sesión se refresca desde fuera, el formulario se pone al día con lo
  // que quedó guardado en el servidor.
  useEffect(() => {
    setNombre(user?.name ?? '');
    setTelefono(user?.telefono ?? '');
  }, [user?.name, user?.telefono]);

  const sinCambios =
    nombre.trim() === (user?.name ?? '').trim()
    && telefono === (user?.telefono ?? '');

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);

    const res = await profileService.actualizarPerfil({
      name: nombre.trim(),
      telefono,
    });

    if (res.success) {
      await refrescarUsuario();
      avisos.exito(res.message);
    } else {
      setErrores(res.errors ?? {});
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  const elegirFoto = async (evento) => {
    const archivo = evento.target.files?.[0];

    // El input se limpia siempre: si no, volver a elegir el mismo archivo tras
    // un error no dispara el evento y parecería que el botón dejó de servir.
    evento.target.value = '';
    if (!archivo) return;

    // Se mide antes de subir. Enviar dos megas para que el servidor conteste
    // que son demasiados es hacer esperar por una respuesta que ya se sabía.
    if (archivo.size > MAXIMO_BYTES) {
      avisos.error('La imagen no puede pesar más de 2 MB.');
      return;
    }

    setOcupadaFoto(true);
    const res = await profileService.subirFoto(archivo);

    if (res.success) {
      await refrescarUsuario();
      avisos.exito(res.message);
    } else {
      avisos.error(res.message, res.errors?.foto?.[0]);
    }

    setOcupadaFoto(false);
  };

  const quitarFoto = async () => {
    setOcupadaFoto(true);
    const res = await profileService.quitarFoto();

    if (res.success) {
      await refrescarUsuario();
      avisos.exito(res.message);
    } else {
      avisos.error(res.message);
    }

    setOcupadaFoto(false);
  };

  return (
    <>
      {/* ── Foto de perfil ──────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Camera size={14} />
          <h2 className="hc-section-title">Foto de perfil</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-foto">
            <AvatarUsuario nombre={user?.name} fotoUrl={user?.foto_url} tamano={88} />

            <div className="config-foto-lado">
              <p className="hc-field-hint">
                JPG, PNG o WEBP, hasta 2 MB. Mientras no suba ninguna se
                muestran sus iniciales.
              </p>

              <div className="config-foto-acciones">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => selectorArchivo.current?.click()}
                  disabled={ocupadaFoto}
                >
                  <Camera size={15} />
                  {user?.foto_url ? 'Cambiar foto' : 'Subir foto'}
                </button>

                {user?.foto_url && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={quitarFoto}
                    disabled={ocupadaFoto}
                  >
                    <Trash2 size={15} />
                    Quitar
                  </button>
                )}
              </div>

              <input
                ref={selectorArchivo}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirFoto}
                hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Datos personales ────────────────────────────────────────── */}
      <form onSubmit={guardar}>
        <section className="hc-section">
          <div className="hc-section-head">
            <IdCard size={14} />
            <h2 className="hc-section-title">Datos personales</h2>
          </div>

          <div className="hc-section-body">
            <div className="config-grid">
              <div className="hc-field">
                <label className="hc-field-label" htmlFor="config-nombre">
                  Nombre completo <span className="req">*</span>
                </label>
                <div className="input-wrap">
                  <span className="input-icon"><User size={15} /></span>
                  <input
                    id="config-nombre"
                    type="text"
                    className="form-control"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={255}
                    required
                  />
                </div>
                {errores.name && (
                  <span className="form-hint form-hint-danger">{errores.name[0]}</span>
                )}
              </div>

              <div className="hc-field">
                <label className="hc-field-label" htmlFor="config-telefono">
                  Teléfono
                </label>
                <div className="input-wrap">
                  <span className="input-icon"><Phone size={15} /></span>
                  <input
                    id="config-telefono"
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={TELEFONO_MAXIMO}
                    className="form-control"
                    placeholder="22222222"
                    value={telefono}
                    onChange={(e) => setTelefono(soloDigitos(e.target.value))}
                  />
                </div>
                {errores.telefono && (
                  <span className="form-hint form-hint-danger">{errores.telefono[0]}</span>
                )}
              </div>

              <div className="hc-field">
                <label className="hc-field-label">Correo electrónico</label>
                <div className="config-dato-fijo">
                  <Mail size={15} />
                  <span>{user?.email}</span>
                </div>
                <span className="form-hint">
                  Es con lo que inicia sesión. Solo el administrador puede cambiarlo.
                </span>
              </div>

              <div className="hc-field">
                <label className="hc-field-label">Rol de acceso</label>
                <div className="config-dato-fijo">
                  <ShieldCheck size={15} />
                  <span>{ETIQUETAS_ROL[user?.rol] || user?.rol}</span>
                </div>
                <span className="form-hint">
                  Define a qué módulos entra. Lo asigna el administrador.
                </span>
              </div>
            </div>

            <div className="config-acciones">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={guardando || sinCambios || !nombre.trim()}
              >
                <Save size={15} />
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
