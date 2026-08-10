import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Historial de deshacer/rehacer para la colección de objetos del mapeo.
 *
 * El canvas anterior tenía un botón "Undo" que en realidad borraba todo el
 * dibujo; aquí el deshacer es real: cada mutación empuja el estado anterior a
 * la pila y `deshacer` lo restituye.
 *
 * @param {Array} inicial - objetos con los que arranca el editor
 */

/** Profundidad máxima de la pila; suficiente para una sesión de consulta. */
const LIMITE = 60;

export function useHistorial(inicial = []) {
  const [estado, setEstado] = useState({ pasado: [], presente: inicial, futuro: [] });

  // Marca si hubo cambios desde la última vez que se guardó o se cargó.
  const limpioRef = useRef(true);
  const [limpio, setLimpio] = useState(true);

  /**
   * Aplicar una mutación. Acepta el nuevo arreglo o una función del anterior.
   * Si la mutación no cambia nada (por ejemplo, borrar un id inexistente) no
   * ensucia el historial.
   */
  const aplicar = useCallback((siguiente) => {
    setEstado(e => {
      const nuevo = typeof siguiente === 'function' ? siguiente(e.presente) : siguiente;
      if (nuevo === e.presente) return e;

      limpioRef.current = false;
      setLimpio(false);

      return {
        pasado: [...e.pasado, e.presente].slice(-LIMITE),
        presente: nuevo,
        futuro: [],
      };
    });
  }, []);

  const deshacer = useCallback(() => {
    setEstado(e => {
      if (e.pasado.length === 0) return e;
      limpioRef.current = false;
      setLimpio(false);
      return {
        pasado: e.pasado.slice(0, -1),
        presente: e.pasado[e.pasado.length - 1],
        futuro: [e.presente, ...e.futuro].slice(0, LIMITE),
      };
    });
  }, []);

  const rehacer = useCallback(() => {
    setEstado(e => {
      if (e.futuro.length === 0) return e;
      limpioRef.current = false;
      setLimpio(false);
      return {
        pasado: [...e.pasado, e.presente].slice(-LIMITE),
        presente: e.futuro[0],
        futuro: e.futuro.slice(1),
      };
    });
  }, []);

  /** Cargar un mapeo del servidor: descarta el historial y queda "sin cambios". */
  const reiniciar = useCallback((objetos) => {
    limpioRef.current = true;
    setLimpio(true);
    setEstado({ pasado: [], presente: objetos, futuro: [] });
  }, []);

  /** Tras guardar con éxito: el contenido actual pasa a ser el de referencia. */
  const marcarGuardado = useCallback(() => {
    limpioRef.current = true;
    setLimpio(true);
  }, []);

  return useMemo(() => ({
    objetos: estado.presente,
    aplicar,
    deshacer,
    rehacer,
    reiniciar,
    marcarGuardado,
    limpio,
    puedeDeshacer: estado.pasado.length > 0,
    puedeRehacer: estado.futuro.length > 0,
  }), [estado, aplicar, deshacer, rehacer, reiniciar, marcarGuardado, limpio]);
}
