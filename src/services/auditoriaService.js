import api from './api';

/**
 * La bitácora de auditoría (solo administrador).
 *
 * Filtros: search, categoria, evento, user_id, desde, hasta (YYYY-MM-DD).
 */
export const getBitacora = async (params = {}) => {
  try {
    const consulta = {};

    if (params.search?.trim()) consulta.search = params.search.trim();
    if (params.categoria) consulta.categoria = params.categoria;
    if (params.evento) consulta.evento = params.evento;
    if (params.userId) consulta.user_id = params.userId;
    if (params.desde) consulta.desde = params.desde;
    if (params.hasta) consulta.hasta = params.hasta;

    consulta.page = params.page ?? 1;
    consulta.per_page = params.perPage ?? 30;

    const response = await api.get('/auditoria', { params: consulta });
    return {
      success: true,
      data: response.data.data || [],
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cargar la bitácora.',
    };
  }
};

/** Eventos, categorías y usuarios para los filtros. */
export const getCatalogo = async () => {
  try {
    const response = await api.get('/auditoria/catalogo');
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cargar el catálogo de eventos.',
    };
  }
};

/** Totales de la cabecera y accesos por usuario. */
export const getResumen = async () => {
  try {
    const response = await api.get('/auditoria/resumen');
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cargar el resumen de accesos.',
    };
  }
};
