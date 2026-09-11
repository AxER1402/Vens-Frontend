import { User, KeyRound, Building2, CalendarClock, Tags } from 'lucide-react';

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
 *
 * Ver y mantener son cosas distintas, y aquí se notan: el médico entra a «Datos
 * de la clínica» y a «Servicios y tarifas» porque necesita saber con qué
 * membrete se firman sus informes y a qué precio se cobra lo que indica, pero
 * las dos pantallas se le abren en solo lectura. El backend ya lo tenía así
 * —`GET /ajustes` y `GET /services` están abiertos, y solo escribir pide
 * administrador—; lo que faltaba era que la interfaz lo dejara entrar a mirar.
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
    roles: ['administrador', 'medico'],
  },
  {
    clave: 'agenda',
    titulo: 'Agenda y horarios',
    descripcion: 'Días y horas de atención, y duración de la cita.',
    icono: CalendarClock,
    roles: ['administrador', 'medico'],
  },
  {
    clave: 'servicios',
    titulo: 'Servicios y tarifas',
    descripcion: 'El catálogo con el que se llenan los recibos.',
    icono: Tags,
    roles: ['administrador', 'medico'],
  },
];

/** La sección que se abre cuando no se pidió ninguna o la pedida no existe. */
export const SECCION_POR_DEFECTO = 'cuenta';

export function seccionValida(clave, rol) {
  const seccion = SECCIONES.find((s) => s.clave === clave);
  if (!seccion) return false;
  return !seccion.roles || seccion.roles.includes(rol);
}
