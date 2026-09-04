import { useCallback, useEffect, useRef, useState } from 'react';
import * as notificacionService from '../services/notificacionService';

/** Cada cuánto se le vuelve a preguntar al servidor. */
const INTERVALO_CONSULTA = 5 * 60 * 1000;

/** Cada cuánto se revisa localmente si a algún aviso ya se le pasó la hora. */
const INTERVALO_VENCIMIENTO = 30 * 1000;

const yaPaso = (aviso) => new Date(aviso.fecha_hora_inicio).getTime() <= Date.now();

/**
 * Avisos de agenda del usuario en sesión.
 *
 * El vencimiento se resuelve en dos tiempos y a propósito: el servidor nunca
 * manda una cita cuya hora ya pasó, y entre consulta y consulta el reloj de
 * aquí va sacando las que se vencen mientras el panel está abierto. Sin lo
 * segundo, un aviso de las tres de la tarde seguiría a la vista hasta la
 * siguiente consulta.
 */
export function useNotificaciones(activo) {
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const consultando = useRef(false);

  const consultar = useCallback(async ({ silencioso = false } = {}) => {
    if (!activo || consultando.current) return;

    consultando.current = true;
    if (!silencioso) setCargando(true);

    const res = await notificacionService.listar();

    if (res.success) {
      setAvisos(res.notificaciones.filter((aviso) => !yaPaso(aviso)));
      setError('');
    } else {
      setError(res.message);
    }

    consultando.current = false;
    setCargando(false);
  }, [activo]);

  useEffect(() => {
    if (!activo) {
      setAvisos([]);
      return undefined;
    }

    consultar();

    const consulta = setInterval(() => consultar({ silencioso: true }), INTERVALO_CONSULTA);
    const vencimiento = setInterval(
      () => setAvisos((previos) => previos.filter((aviso) => !yaPaso(aviso))),
      INTERVALO_VENCIMIENTO
    );

    // Al volver a la pestaña el reloj pudo haber corrido mucho: se pregunta de
    // nuevo en vez de esperar al siguiente intervalo.
    const alVolver = () => {
      if (document.visibilityState === 'visible') consultar({ silencioso: true });
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(consulta);
      clearInterval(vencimiento);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, consultar]);

  /**
   * Se saca el aviso de la lista antes de que responda el servidor: el panel
   * tiene que sentirse inmediato. Si la petición falla se vuelve a consultar,
   * que es lo que devuelve la verdad.
   */
  const descartar = useCallback(async (clave) => {
    setAvisos((previos) => previos.filter((aviso) => aviso.clave !== clave));

    const res = await notificacionService.descartar(clave);
    if (!res.success) {
      setError(res.message);
      consultar({ silencioso: true });
    }
  }, [consultar]);

  const descartarTodos = useCallback(async () => {
    const anteriores = avisos;
    setAvisos([]);

    const res = await notificacionService.descartarTodos();
    if (!res.success) {
      setAvisos(anteriores);
      setError(res.message);
    }
  }, [avisos]);

  return {
    avisos,
    total: avisos.length,
    cargando,
    error,
    consultar,
    descartar,
    descartarTodos,
  };
}
