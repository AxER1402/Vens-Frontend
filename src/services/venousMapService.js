import api from './api';

import { COLORES, TRAYECTOS, MARCADORES } from '../components/MapeoVenoso/catalogo';
import { ZONAS, PLANTILLA_ID } from '../components/MapeoVenoso/zonas';

/**
 * Catálogo clínico del mapeo venoso servido por el backend.
 *
 * El catálogo existe en dos sitios: aquí lo usa el editor para dibujar (colores,
 * grosores, símbolos) y en el backend lo usa el reporte para traducir lo que se
 * archivó —'rojo', 'epifascial', 'izq_antero_interna'— a texto legible.
 *
 * El backend es la copia autoritativa: desde que valida el documento vectorial,
 * un color, un trayecto o un marcador que él no conozca hace que el guardado
 * devuelva 422. Así una divergencia falla en el momento de guardar, y no meses
 * después al abrir un informe con códigos sin nombre.
 */

/** Catálogo completo: plantilla, miembros, zonas, los tres ejes y los límites. */
export const obtenerCatalogo = async () => {
  const { data } = await api.get('/venous-map/catalog');
  return data.data;
};

/**
 * Comprobar que la copia local coincide con la del backend.
 *
 * Se pensó en que el editor consumiera el catálogo por red y se descartó: el
 * catálogo y las zonas se leen como constantes de módulo desde seis archivos,
 * incluidos dos que no son componentes de React (objetos.js y exportarPng.js),
 * y volverlos asíncronos obligaría a reestructurar el editor entero para ganar
 * algo que esta comprobación ya da.
 *
 * El vocabulario heredado no se compara: el backend no lo publica y el editor no
 * lo ofrece; solo se sigue sabiendo leer a los dos lados.
 *
 * Devuelve la lista de diferencias; vacía si las dos copias coinciden.
 */
export const verificarCatalogo = async () => {
  const remoto = await obtenerCatalogo();
  const diferencias = [];

  if (remoto.plantilla?.id !== PLANTILLA_ID) {
    diferencias.push(`plantilla: local "${PLANTILLA_ID}" vs backend "${remoto.plantilla?.id}"`);
  }

  const comparar = (nombre, locales, remotos) => {
    const idsLocales = new Set(locales.map(o => o.id));
    const idsRemotos = new Set(remotos.map(o => o.id));

    for (const id of idsLocales) {
      if (!idsRemotos.has(id)) diferencias.push(`${nombre} "${id}" existe solo en el editor`);
    }
    for (const id of idsRemotos) {
      if (!idsLocales.has(id)) diferencias.push(`${nombre} "${id}" existe solo en el backend`);
    }
  };

  comparar('color', COLORES, remoto.colores ?? []);
  comparar('trayecto', TRAYECTOS, remoto.trayectos ?? []);
  comparar('marcador', MARCADORES, remoto.marcadores ?? []);
  comparar('zona', ZONAS, remoto.zonas ?? []);

  return diferencias;
};

/**
 * Avisar por consola si las dos copias del catálogo se separaron.
 *
 * Pensado para llamarse una vez al abrir el editor en desarrollo. No interrumpe
 * nada: si la comprobación falla —por ejemplo porque no hay sesión— se calla,
 * porque no poder verificar el catálogo no es motivo para impedir trabajar.
 */
export const avisarSiElCatalogoDivergió = async () => {
  if (!import.meta.env.DEV) return;

  try {
    const diferencias = await verificarCatalogo();

    if (diferencias.length > 0) {
      console.warn(
        '[mapeo venoso] El catálogo del editor y el del backend no coinciden.\n' +
        'Lo que solo existe en el editor hará que el guardado devuelva 422.\n' +
        'Sincroniza src/config/mapeo-venoso.php con catalogo.js y zonas.js:\n  - ' +
        diferencias.join('\n  - ')
      );
    }
  } catch {
    // Sin sesión o sin backend no se puede comprobar, y no pasa nada
  }
};
