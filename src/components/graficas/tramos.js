/**
 * Reparto de un período en tramos comparables.
 *
 * Lo usan las gráficas de columnas de dos módulos, y por eso vive aparte: el
 * criterio de cuándo un tramo es un día, una semana o un mes tiene que ser el
 * mismo en los reportes y en facturación, o dos gráficas de la misma pantalla
 * se leerían con escalas distintas.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const NOMBRE_PASO = { dia: 'por día', semana: 'por semana', mes: 'por mes' };

/**
 * El tamaño del tramo lo decide el largo del rango: treinta barras diarias en
 * un trimestre no se leen, y una sola barra mensual en una semana no dice nada.
 */
export function tramosDelPeriodo(desde, hasta) {
  const inicio = new Date(`${String(desde).slice(0, 10)}T00:00:00`);
  const fin = new Date(`${String(hasta).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
    return { paso: 'dia', tramos: [] };
  }

  const dias = Math.round((fin - inicio) / 86400000) + 1;
  const paso = dias <= 21 ? 'dia' : dias <= 120 ? 'semana' : 'mes';
  const tramos = [];

  const cursor = new Date(inicio);
  if (paso === 'semana') {
    // Se arranca el lunes de la semana en que cae el inicio del rango
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  } else if (paso === 'mes') {
    cursor.setDate(1);
  }

  while (cursor <= fin) {
    const arranque = new Date(cursor);
    let etiqueta;
    let etiquetaLarga;

    if (paso === 'dia') {
      etiqueta = String(arranque.getDate());
      etiquetaLarga = `${arranque.getDate()} de ${MESES[arranque.getMonth()]}`;
      cursor.setDate(cursor.getDate() + 1);
    } else if (paso === 'semana') {
      etiqueta = `${arranque.getDate()} ${MESES[arranque.getMonth()]}`;
      etiquetaLarga = `Semana del ${arranque.getDate()} de ${MESES[arranque.getMonth()]}`;
      cursor.setDate(cursor.getDate() + 7);
    } else {
      etiqueta = MESES[arranque.getMonth()];
      etiquetaLarga = `${MESES[arranque.getMonth()]} ${arranque.getFullYear()}`;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    tramos.push({
      clave: `${arranque.getFullYear()}-${arranque.getMonth() + 1}-${arranque.getDate()}`,
      desde: arranque,
      hasta: new Date(cursor),
      etiqueta,
      etiquetaLarga,
      valor: 0,
    });
  }

  return { paso, tramos };
}

/**
 * Reparte sucesos en los tramos. `cuanto` dice qué se acumula: uno por suceso
 * cuando se cuentan consultas, el monto cuando se suman cobros.
 */
export function repartir(tramos, sucesos, fechaDe, cuanto) {
  for (const suceso of sucesos) {
    const dia = new Date(`${String(fechaDe(suceso)).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(dia.getTime())) continue;

    const tramo = tramos.find((t) => dia >= t.desde && dia < t.hasta);
    if (tramo) tramo.valor += cuanto(suceso);
  }

  return tramos;
}

/** Quetzales sin decimales: en el eje de una gráfica los centavos estorban. */
export const quetzalesCortos = (monto) =>
  `Q${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(Math.round(monto))}`;
