import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
 * Aquí la pregunta se hace una sola vez y en un solo sitio. Cada pantalla
 * declara dos cosas con `useAvisarCambiosSinGuardar`: si tiene algo sin guardar
 * y cómo guardarlo; quien quiera irse llama a `salirA` y el guardián decide si
 * hace falta preguntar.
 *
 * Las dos salidas son a propósito: guardar el borrador y seguir, o quedarse.
 * No se ofrece «salir sin guardar» porque lo que se pierde no se recupera, y el
 * borrador está justamente para no tener que elegir entre las dos cosas.
 *
 * La excepción es un guardado que falla —un mapeo cuya consulta todavía no
 * existe, una sesión vencida—. Ahí sí aparece la salida a secas: sin ella, la
 * pantalla no tendría ninguna y quedaría cerrada con el usuario dentro.
 */
const Contexto = createContext(null);

export function ProveedorCambiosSinGuardar({ children }) {
  const navigate = useNavigate();

  /* La pantalla abierta, si es de las que se pueden dejar a medias. Va en una
     referencia y no en el estado porque cambia en cada tecleo del formulario y
     nadie tiene que repintarse por eso: solo se lee al intentar salir. */
  const pantallaRef = useRef(null);

  // Salida pendiente de confirmar: { destino, motivo }, o null.
  const [salida, setSalida] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const registrar = useCallback((pantalla) => {
    pantallaRef.current = pantalla;
  }, []);

  const olvidar = useCallback(() => {
    pantallaRef.current = null;
  }, []);

  /** ¿La pantalla abierta tiene algo sin guardar ahora mismo? */
  const hayCambios = useCallback(() => Boolean(pantallaRef.current?.hayCambios), []);

  /**
   * Ir a `destino`, preguntando antes si hay algo sin guardar. `motivo` dice
   * qué se está por hacer, para que el aviso hable de esta salida y no en
   * abstracto («Está por entrar al Ecodöppler…»).
   */
  const salirA = useCallback((destino, motivo, opciones = undefined) => {
    if (!pantallaRef.current?.hayCambios) {
      navigate(destino, opciones);
      return;
    }

    setError('');
    setSalida({ destino, motivo, opciones });
  }, [navigate]);

  const guardarYSeguir = async () => {
    const guardar = pantallaRef.current?.guardar;

    if (!guardar) {
      setError('Esta pantalla no puede guardar ahora mismo.');
      return;
    }

    setGuardando(true);
    setError('');

    const guardado = await guardar();

    setGuardando(false);

    // Si el guardado falló, el diálogo se queda abierto con el motivo: seguir
    // ahora perdería justo lo que se quiso salvar.
    if (!guardado) {
      setError('No se pudo guardar. La pantalla dice por qué, detrás de este aviso.');
      return;
    }

    const { destino, opciones } = salida;
    setSalida(null);
    navigate(destino, opciones);
  };

  return (
    <Contexto.Provider value={{ registrar, olvidar, salirA, hayCambios }}>
      {children}

      <AlertDialog
        open={salida !== null}
        onOpenChange={(abierto) => { if (!abierto && !guardando) setSalida(null); }}
      >
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon"><AlertCircle size={17} /></span>
            <AlertDialogTitle className="confirm-title">
              Hay cambios sin guardar
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            Está por {salida?.motivo ?? 'salir de esta pantalla'} y lo escrito todavía
            no está guardado.
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
              onClick={() => setSalida(null)}
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
                onClick={() => {
                  const { destino, opciones } = salida;
                  setSalida(null);
                  navigate(destino, opciones);
                }}
              >
                Salir de todos modos
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={guardarYSeguir}
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

/** Para quien necesita irse: el menú lateral y los botones de las pantallas. */
export function useSalida() {
  const contexto = useContext(Contexto);

  // Fuera del proveedor —una pantalla suelta en una prueba— irse no se avisa,
  // pero tampoco revienta.
  return contexto ?? {
    salirA: () => {},
    hayCambios: () => false,
    registrar: () => {},
    olvidar: () => {},
  };
}

/**
 * Para la pantalla que se puede dejar a medias.
 *
 * `guardar` tiene que devolver si se guardó: el guardián navega solo cuando de
 * verdad quedó a salvo.
 */
export function useAvisarCambiosSinGuardar(hayCambios, guardar) {
  const { registrar, olvidar } = useSalida();

  /* Sin lista de dependencias a propósito: se vuelve a registrar en cada
     repintado para que el guardián lea el estado de ahora, que es lo único que
     importa en el momento en que alguien intenta salir. Registrar es asignar
     una referencia, así que hacerlo de más no cuesta nada. */
  useEffect(() => {
    registrar({ hayCambios, guardar });

    return olvidar;
  });
}
