import api from './api';

/**
 * Los datos de la clínica: membrete de los informes, datos fiscales de los
 * recibos y quién los firma.
 *
 * El backend habla con claves con punto ('clinica.nombre'), que es como están
 * en la tabla, pero valida agrupado ({clinica: {nombre}}), que es como se
 * escriben las reglas en Laravel. La conversión se hace aquí para que las
 * pantallas trabajen siempre con la forma plana, que es la que se lee.
 */

/** { 'clinica.nombre': 'X' } → { clinica: { nombre: 'X' } } */
const agrupar = (plano) => {
  const agrupado = {};

  for (const [clave, valor] of Object.entries(plano)) {
    const [grupo, campo] = clave.split('.');
    if (!campo) continue;
    agrupado[grupo] = { ...agrupado[grupo], [campo]: valor };
  }

  return agrupado;
};

export const getAjustes = async () => {
  try {
    const response = await api.get('/ajustes');
    return {
      success: true,
      data: response.data.data.ajustes,
      logoUrl: response.data.data.logo_url,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudieron cargar los datos de la clínica.',
    };
  }
};

export const actualizarAjustes = async (plano) => {
  try {
    const response = await api.put('/ajustes', agrupar(plano));
    return {
      success: true,
      message: response.data.message || 'Los datos de la clínica se actualizaron.',
      data: response.data.data.ajustes,
      logoUrl: response.data.data.logo_url,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudieron guardar los datos.',
      // Laravel devuelve la clave de un campo anidado con puntos
      // ('clinica.nombre'), que es justo la forma con la que trabaja la
      // pantalla: cada campo encuentra su error sin traducir nada.
      errors: error.response?.data?.errors,
    };
  }
};

export const subirLogo = async (archivo) => {
  try {
    const cuerpo = new FormData();
    cuerpo.append('logo', archivo);

    const response = await api.post('/ajustes/logo', cuerpo, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      success: true,
      message: response.data.message || 'El logo se actualizó.',
      data: response.data.data.ajustes,
      logoUrl: response.data.data.logo_url,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo subir el logo.',
      errors: error.response?.data?.errors,
    };
  }
};
