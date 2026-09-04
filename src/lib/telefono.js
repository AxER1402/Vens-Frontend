/**
 * El teléfono se guarda solo con dígitos.
 *
 * No es una manía de formato: si una persona anota «2222-2222» y otra busca
 * «22222222», la segunda no encuentra a nadie y termina registrando al mismo
 * paciente dos veces. Un formato único hace que las dos escrituras sean el
 * mismo dato.
 */

/** Ocho dígitos es el largo local; quince, el máximo internacional. */
export const TELEFONO_MAXIMO = 15;

/** Deja solo los dígitos, recortando al máximo que admite el servidor. */
export const soloDigitos = (valor) =>
  String(valor ?? '').replace(/\D+/g, '').slice(0, TELEFONO_MAXIMO);

/**
 * Lo pegado desde una tarjeta o un chat viene con guiones y espacios. En vez
 * de rechazarlo, se limpia mientras se escribe: quien teclea ve que el campo
 * solo admite números sin necesidad de que se lo digan.
 */
export const manejarTelefono = (alCambiar) => (evento) => {
  alCambiar({
    ...evento,
    target: { ...evento.target, name: evento.target.name, value: soloDigitos(evento.target.value) },
  });
};
