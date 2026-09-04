import { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useAvisos } from '../../components/Avisos';
import * as profileService from '../../services/profileService';

const MINIMO = 8;

const VACIO = {
  passwordActual: '',
  password: '',
  passwordConfirmacion: '',
};

/**
 * Cambiar la contraseña sin salir de la sesión.
 *
 * Es distinto del enlace por correo de la pantalla de ingreso: aquel resuelve
 * el caso de quien no puede entrar, y este el de quien ya entró y quiere
 * cambiarla. Por eso aquí se pide la contraseña actual: una sesión abierta en
 * una computadora del mostrador no prueba quién está sentado delante.
 */
export default function CambiarPassword() {
  const avisos = useAvisos();

  const [form, setForm] = useState(VACIO);
  const [verClaves, setVerClaves] = useState(false);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const set = (campo) => (evento) => {
    setForm((previo) => ({ ...previo, [campo]: evento.target.value }));
  };

  const largoSuficiente = form.password.length >= MINIMO;
  const coinciden = form.password !== '' && form.password === form.passwordConfirmacion;
  const distinta = form.password !== '' && form.password !== form.passwordActual;

  const puedeGuardar =
    form.passwordActual !== '' && largoSuficiente && coinciden && distinta && !guardando;

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);

    const res = await profileService.cambiarPassword(form);

    if (res.success) {
      setForm(VACIO);
      avisos.exito(res.message, 'Las demás sesiones se cerraron.');
    } else {
      setErrores(res.errors ?? {});
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  const campo = (id, etiqueta, valor, alCambiar, autocompletado, error) => (
    <div className="hc-field">
      <label className="hc-field-label" htmlFor={id}>
        {etiqueta} <span className="req">*</span>
      </label>
      <div className="input-wrap">
        <span className="input-icon"><Lock size={15} /></span>
        <input
          id={id}
          type={verClaves ? 'text' : 'password'}
          className="form-control"
          value={valor}
          onChange={alCambiar}
          autoComplete={autocompletado}
          required
        />
      </div>
      {error && <span className="form-hint form-hint-danger">{error}</span>}
    </div>
  );

  return (
    <form onSubmit={guardar}>
      <section className="hc-section">
        <div className="hc-section-head">
          <KeyRound size={14} />
          <h2 className="hc-section-title">Cambiar contraseña</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-grid">
            {campo(
              'config-pass-actual',
              'Contraseña actual',
              form.passwordActual,
              set('passwordActual'),
              'current-password',
              errores.password_actual?.[0],
            )}

            {/* La casilla vecina no se deja vacía: explica por qué se pide la
                contraseña actual, que es la pregunta que se hace cualquiera
                al ver que ya inició sesión y aun así se la vuelven a pedir. */}
            <p className="config-nota">
              Se le pide para confirmar que es usted quien está frente a la
              pantalla, y no alguien que encontró la sesión abierta.
            </p>

            {campo(
              'config-pass-nueva',
              'Contraseña nueva',
              form.password,
              set('password'),
              'new-password',
              errores.password?.[0],
            )}

            {campo(
              'config-pass-confirmar',
              'Repita la contraseña nueva',
              form.passwordConfirmacion,
              set('passwordConfirmacion'),
              'new-password',
              null,
            )}
          </div>

          {/* Las condiciones se muestran mientras se escribe, no al enviar:
              enterarse de que faltaba un carácter después de pulsar guardar
              obliga a volver a teclear las tres casillas. */}
          <div className="config-pie-campos">
            <ul className="config-requisitos">
              <Requisito cumplido={largoSuficiente}>
                Al menos {MINIMO} caracteres
              </Requisito>
              <Requisito cumplido={coinciden}>
                Las dos casillas coinciden
              </Requisito>
              <Requisito cumplido={distinta}>
                Es distinta de la actual
              </Requisito>
            </ul>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setVerClaves((previo) => !previo)}
            >
              {verClaves ? <EyeOff size={14} /> : <Eye size={14} />}
              {verClaves ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <p className="hc-field-hint">
            Al cambiarla se cerrarán sus sesiones abiertas en otros equipos.
            Esta seguirá abierta.
          </p>

          <div className="config-acciones">
            <button type="submit" className="btn btn-primary" disabled={!puedeGuardar}>
              <KeyRound size={15} />
              {guardando ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

function Requisito({ cumplido, children }) {
  return (
    <li className={`config-requisito${cumplido ? ' cumplido' : ''}`}>
      {cumplido ? <Check size={13} /> : <AlertCircle size={13} />}
      <span>{children}</span>
    </li>
  );
}
