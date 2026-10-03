import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let cargaDelScript = null;

/**
 * Carga una sola vez la librería de Google Identity Services. Se trae del
 * dominio de Google en lugar de instalar un paquete: Google pide expresamente
 * que no se copie ni se empaquete, porque la actualiza por su cuenta.
 */
function cargarGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  cargaDelScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      cargaDelScript = null;
      reject(new Error('No se pudo cargar Google.'));
    };
    document.head.appendChild(script);
  });

  return cargaDelScript;
}

/** La «G» de Google, en sus colores oficiales. */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * El botón «Continuar con Google» de la pantalla de ingreso.
 *
 * Es un botón propio y no el que dibuja Google, porque el de Google muestra
 * el nombre, el correo y la foto de la última cuenta usada en el navegador, y
 * en un equipo compartido de la clínica eso no debe quedar a la vista. Al
 * pulsarlo se abre el selector de cuentas de Google y el access token que
 * devuelve se le pasa a `onCredencial`; quién puede entrar lo decide el
 * backend.
 *
 * Sin VITE_GOOGLE_CLIENT_ID no se muestra nada: la pantalla queda como antes.
 */
function BotonGoogle({ onCredencial, onError, deshabilitado = false }) {
  const cliente = useRef(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);

  // El cliente de Google se crea una sola vez; la referencia permite que
  // siempre llame a la versión más reciente de las props.
  const callbacks = useRef({ onCredencial, onError });
  callbacks.current = { onCredencial, onError };

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelado = false;

    cargarGoogle()
      .then(() => {
        if (cancelado) return;

        cliente.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'openid email profile',
          // Siempre se pregunta qué cuenta usar, aunque haya una sola abierta.
          prompt: 'select_account',
          callback: (respuesta) => {
            if (respuesta?.access_token) {
              callbacks.current.onCredencial(respuesta.access_token);
            } else {
              callbacks.current.onError?.('Google no devolvió una credencial.');
            }
          },
          error_callback: (error) => {
            // Cerrar la ventana de Google no es un error que haya que mostrar.
            if (error?.type !== 'popup_closed') {
              callbacks.current.onError?.('No se pudo abrir la ventana de Google. Revise que el navegador permita ventanas emergentes.');
            }
          },
        });

        setListo(true);
      })
      .catch(() => {
        if (!cancelado) setFallo(true);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="login-google">
      <div className="login-divider">
        <span>o</span>
      </div>

      {fallo ? (
        <p className="login-google-fallo">
          No se pudo cargar el inicio de sesión con Google. Revise su conexión a internet.
        </p>
      ) : (
        <button
          type="button"
          id="btn-login-google"
          className="btn-google"
          onClick={() => cliente.current?.requestAccessToken()}
          disabled={!listo || deshabilitado}
        >
          <LogoGoogle />
          Continuar con Google
        </button>
      )}
    </div>
  );
}

export default BotonGoogle;
