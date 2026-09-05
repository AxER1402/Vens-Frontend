import { User, KeyRound, Building2 } from 'lucide-react';

/**
 * Las secciones de la pantalla de configuración.
 *
 * Están en su propio archivo porque las leen dos sitios: el menú del engranaje,
 * para saber qué ofrecer, y la propia pantalla, para saber qué pintar. Tenerlas
 * en uno solo evita que el menú prometa una sección que la pantalla no tiene, o
 * que una sección quede sin manera de llegar a ella.
 *
 * `roles` ausente significa que la sección es para todo el personal. El backend
 * vuelve a comprobar el permiso en cada endpoint: esta lista acomoda la
 * interfaz, no la protege.
 */
/** Cómo se nombra cada rol de cara al usuario. */
export const ETIQUETAS_ROL = {
  administrador: 'Administrador',
  medico: 'Doctor(a)',
  recepcionista: 'Recepción',
  enfermera: 'Enfermera',
};

export const SECCIONES = [
  {
    clave: 'cuenta',
    titulo: 'Mi cuenta',
    descripcion: 'Su nombre, su teléfono y su foto de perfil.',
    icono: User,
  },
  {
    clave: 'password',
    titulo: 'Cambiar contraseña',
    descripcion: 'Cambie su contraseña sin salir de la sesión.',
    icono: KeyRound,
  },
  {
    clave: 'clinica',
    titulo: 'Datos de la clínica',
    descripcion: 'Membrete, logo, datos fiscales y firma de los informes.',
    icono: Building2,
    roles: ['administrador'],
  },
];

/** La sección que se abre cuando no se pidió ninguna o la pedida no existe. */
export const SECCION_POR_DEFECTO = 'cuenta';

export function seccionValida(clave, rol) {
  const seccion = SECCIONES.find((s) => s.clave === clave);
  if (!seccion) return false;
  return !seccion.roles || seccion.roles.includes(rol);
}
