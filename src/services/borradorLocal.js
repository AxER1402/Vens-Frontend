/**
 * Copia de seguridad en el navegador de lo que todavía no llegó al servidor.
 *
 * Una consulta se escribe durante media hora antes de guardarse, y hasta que
 * se guarda vive solo en la memoria de la pestaña. Si la sesión vence ahí, no
 * hay a quién pedirle lo escrito: el token ya no vale, así que ni siquiera se
 * puede intentar guardarlo antes de salir. Se pierde media hora de consulta con
 * el paciente ya de pie.
 *
 * Aquí se deja una copia mientras se escribe, y al volver a entrar la pantalla
 * ofrece recuperarla. No sustituye a guardar: es lo que evita que un
 * vencimiento, un cierre de pestaña o un navegador que se cae borren el trabajo
 * de la tarde.
 *
 * La copia lleva el usuario en la clave. Es corriente que en una clínica varias
 * personas usen el mismo equipo, y el borrador de una no tiene por qué
 * aparecerle a la siguiente.
 *
 * Es dato clínico guardado fuera del servidor, así que dura lo mínimo: se borra
 * en cuanto la consulta se guarda de verdad, cuando se descarta, y al cerrar
 * sesión a propósito. Lo único que sobrevive es lo que se perdió sin querer,
 * que es justo lo que hay que poder recuperar.
 */
const PREFIJO = 'vens:borrador:';

const clave = (usuarioId, pantalla, id) => `${PREFIJO}${usuarioId ?? 'anonimo'}:${pantalla}:${id}`;

/**
 * Dejar la copia. `datos` es el formulario tal cual lo tiene la pantalla.
 *
 * Todo va envuelto en try/catch: el almacenamiento del navegador falla en
 * ventana privada y cuando se llena la cuota, y perder la copia de seguridad
 * nunca puede llevarse por delante la pantalla que intenta protegerse.
 */
export const guardar = (usuarioId, pantalla, id, datos) => {
  try {
    localStorage.setItem(clave(usuarioId, pantalla, id), JSON.stringify({
      guardadoEn: new Date().toISOString(),
      datos,
    }));
  } catch {
    // Sin copia, pero la consulta sigue en pantalla.
  }
};

/**
 * La copia guardada, o null si no hay ninguna o quedó ilegible.
 *
 * @returns {{ guardadoEn: string, datos: unknown } | null}
 */
export const leer = (usuarioId, pantalla, id) => {
  try {
    const crudo = localStorage.getItem(clave(usuarioId, pantalla, id));
    if (!crudo) return null;

    const copia = JSON.parse(crudo);

    return copia && typeof copia === 'object' && copia.datos ? copia : null;
  } catch {
    return null;
  }
};

export const olvidar = (usuarioId, pantalla, id) => {
  try {
    localStorage.removeItem(clave(usuarioId, pantalla, id));
  } catch {
    // Nada que hacer: si no se puede borrar, tampoco se pudo escribir.
  }
};

/**
 * Borrar todas las copias, de todos los usuarios de este equipo.
 *
 * Se llama al cerrar sesión a propósito, que es cuando alguien deja el equipo:
 * el aviso de cerrar sesión ya advierte de que se pierde lo que no se guardó.
 * NO se llama cuando la sesión vence sola, porque ahí nadie decidió nada y la
 * copia es lo único que queda.
 */
export const olvidarTodos = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ídem.
  }
};
