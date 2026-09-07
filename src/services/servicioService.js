import api from './api';

/**
 * El catálogo de servicios y sus tarifas.
 *
 * Lo lee quien cobra —de aquí se llenan los renglones del recibo— y lo
 * mantiene el administrador.
 */

export const getServicios = async (params = {}) => {
  try {
    const consulta = {};

    if (params.search?.trim()) consulta.search = params.search.trim();
    if (params.activo !== undefined && params.activo !== '') consulta.activo = params.activo;

    if (params.page) {
      consulta.page = params.page;
      consulta.per_page = params.perPage ?? 30;
    }

    const response = await api.get('/services', { params: consulta });
    return {
      success: true,
      data: response.data.data || [],
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cargar el catálogo de servicios.',
    };
  }
};

export const crearServicio = async (datos) => {
  try {
    const response = await api.post('/services', datos);
    return {
      success: true,
      message: response.data.message || 'Servicio agregado al catálogo.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo agregar el servicio.',
      errors: error.response?.data?.errors,
    };
  }
};

export const actualizarServicio = async (id, datos) => {
  try {
    const response = await api.put(`/services/${id}`, datos);
    return {
      success: true,
      message: response.data.message || 'Servicio actualizado.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo actualizar el servicio.',
      errors: error.response?.data?.errors,
    };
  }
};

/** Baja lógica: sale del selector, pero los recibos que lo cobraron se siguen entendiendo. */
export const retirarServicio = async (id) => {
  try {
    const response = await api.delete(`/services/${id}`);
    return {
      success: true,
      message: response.data.message || 'Servicio retirado del catálogo.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo retirar el servicio.',
    };
  }
};

/**
 * Borrado definitivo: la fila desaparece de la base.
 *
 * No toca nada de lo ya cobrado. Los renglones de un recibo copian la
 * descripción y el precio en el momento de emitirlo, así que no dependen del
 * catálogo para seguir entendiéndose.
 */
export const eliminarServicio = async (id) => {
  try {
    const response = await api.delete(`/services/${id}/definitivo`);
    return {
      success: true,
      message: response.data.message || 'Servicio eliminado del catálogo.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo eliminar el servicio.',
    };
  }
};
