import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Aviso único para las pantallas que se pueden dejar a medias.
 *
 * La historia clínica, el Ecodöppler y el mapeo venoso se llenan en tres
 * pantallas distintas y se salta entre ellas todo el tiempo. Cada una avisaba
 * de sus cambios sin guardar a su manera —una con un diálogo propio, otra con
 * el confirm() del navegador, la tercera con nada— y el menú lateral no avisaba
 * en absoluto: pulsar «Citas» con la consulta a medias la borraba en silencio.
 *
 * El aviso no se pone en los botones sino en la navegación misma, con el
 * bloqueador del router. Interceptar los clics dejaba fuera la mitad de las
 * salidas: las flechas de atrás y adelante del navegador se saltaban el aviso y
 * perdían la consulta igual que antes, y de cada botón nuevo habría que
 * acordarse de conectarlo. Aquí no se sale de la pantalla sin pasar por esto,
 * venga la salida de donde venga.
 *
 * Cada pantalla declara dos cosas con `useAvisarCambiosSinGuardar`: si tiene
 * algo sin guardar y cómo guardarlo.
 *
 * Las dos salidas son a propósito: guardar el borrador y continuar, o quedarse.
 * No se ofrece «salir sin guardar» porque lo que se pierde no se recupera, y el
 * borrador está justamente para no tener que elegir entre las dos cosas.
 *
 * La excepción es un guardado que falla —un mapeo cuya consulta todavía no
 * existe, una sesión vencida—. Ahí sí aparece la salida a secas: sin ella, la
 * pantalla no tendría ninguna y quedaría cerrada con el usuario dentro.
 */
const Contexto = createContext(null);

/** Cómo se llama cada destino dentro del aviso. */
const DESTINOS = {
  '/dashboard': 'ir a Inicio',
  '/pacientes': 'ir a Pacientes',
  '/citas': 'ir a Citas',
  '/historia-clinica': 'volver a la historia clínica',
  '/facturacion': 'ir a Facturación',
  '/reportes': 'ir a Reportes',
  '/usuarios': 'ir a Usuarios',
  '/configuracion': 'ir a Configuración',
  '/reporte-doppler': 'abrir el reporte de Ecodöppler',
  '/mapeo-venoso': 'abrir el mapeo venoso',
};

export function ProveedorCambiosSinGuardar({ children }) {
  /* La pantalla abierta, si es de las que se pueden dejar a medias. Va en una
     referencia y no en el estado porque cambia en cada tecleo del formulario y
     nadie tiene que repintarse por eso: solo se lee al intentar salir. */
  const pantallaRef = useRef(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const registrar = useCallback((pantalla) => {
    pantallaRef.current = pantalla;
  }, []);

  const olvidar = useCallback(() => {
    pantallaRef.current = null;
  }, []);

  /*
     Se frena la salida a otra pantalla, no cada navegación: la historia clínica
     reescribe su propia dirección al abrir una consulta (?historiaId=), y
     frenar eso sería frenarla contra sí misma.

     Cerrar sesión se deja pasar: para cuando llega aquí el token ya se anuló,
     así que ofrecer guardar el borrador sería ofrecer algo que va a fallar. Ese
     aviso lo da su propia confirmación, antes de cerrar nada.
  */
  const bloqueo = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => (
      Boolean(pantallaRef.current?.hayCambios)
      && currentLocation.pathname !== nextLocation.pathname
      && nextLocation.pathname !== '/login'
    ), []),
  );

  const bloqueado = bloqueo.state === 'blocked';

  // Al abrirse el aviso se parte de cero: el error del intento anterior no
  // tiene por qué seguir en pantalla.
  useEffect(() => {
    if (bloqueado) setError('');
  }, [bloqueado]);

  /* Cerrar la pestaña o recargar no lo ve el router, así que ahí solo queda el
     aviso del navegador. Es feo y no se puede redactar, pero es eso o perder la
     consulta sin una palabra. */
  useEffect(() => {
    const alDescargar = (evento) => {
      if (!pantallaRef.current?.hayCambios) return;

      evento.preventDefault();
      evento.returnValue = '';
    };

    window.addEventListener('beforeunload', alDescargar);

    return () => window.removeEventListener('beforeunload', alDescargar);
  }, []);

  const guardarYContinuar = async () => {
    const guardar = pantallaRef.current?.guardar;

    if (!guardar) {
      setError('Esta pantalla no puede guardar ahora mismo.');
      return;
    }

    setGuardando(true);
    setError('');

    const guardado = await guardar();

    setGuardando(false);

    // Si el guardado falló, el aviso se queda abierto: continuar ahora
    // perdería justo lo que se quiso salvar.
    if (!guardado) {
      setError('No se pudo guardar. La pantalla dice por qué, detrás de este aviso.');
      return;
    }

    bloqueo.proceed();
  };

  const motivo = bloqueado
    ? DESTINOS[bloqueo.location?.pathname] ?? 'salir de esta pantalla'
    : 'salir de esta pantalla';

  return (
    <Contexto.Provider value={{ registrar, olvidar }}>
      {children}

      <AlertDialog
        open={bloqueado}
        onOpenChange={(abierto) => { if (!abierto && !guardando) bloqueo.reset(); }}
      >
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon"><AlertCircle size={17} /></span>
            <AlertDialogTitle className="confirm-title">
              Hay cambios sin guardar
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            Está por {motivo} y lo escrito todavía no está guardado.
            <br />
            Puede guardarlo como borrador y continuar: queda tal como está y podrá
            terminarlo al volver.
          </AlertDialogDescription>

          {error && (
            <div className="notice notice-danger">
              <span className="notice-body">{error}</span>
            </div>
          )}

          <div className="confirm-actions dialog-sep">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => bloqueo.reset()}
              disabled={guardando}
            >
              Seguir aquí
            </button>

            {/* Solo cuando guardar ya falló: hasta entonces, salir y perderlo
                no es una de las opciones. */}
            {error && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={guardando}
                onClick={() => bloqueo.proceed()}
              >
                Salir de todos modos
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={guardarYContinuar}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar y continuar'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Contexto.Provider>
  );
}

/**
 * Para la pantalla que se puede dejar a medias.
 *
 * `guardar` tiene que devolver si se guardó: el guardián continúa solo cuando
 * de verdad quedó a salvo.
 */
export function useAvisarCambiosSinGuardar(hayCambios, guardar) {
  // Fuera del proveedor —una pantalla suelta en una prueba— no se avisa, pero
  // tampoco revienta.
  const contexto = useContext(Contexto);

  /* Sin lista de dependencias a propósito: se vuelve a registrar en cada
     repintado para que el guardián lea el estado de ahora, que es lo único que
     importa en el momento en que alguien intenta salir. Registrar es asignar
     una referencia, así que hacerlo de más no cuesta nada. */
  useEffect(() => {
    if (!contexto) return undefined;

    contexto.registrar({ hayCambios, guardar });

    return contexto.olvidar;
  });
}
