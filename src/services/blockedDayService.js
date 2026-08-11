import api from './api';

/**
 * Obtener los días bloqueados de la agenda (feriados, vacaciones y cierres)
 * @param {Object} params - { from_date, to_date, date, year, tipo }
 */
export const getBlockedDays = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.date) queryParams.append('date', params.date);
    if (params.year) queryParams.append('year', params.year);
    if (params.tipo) queryParams.append('tipo', params.tipo);

    const queryString = queryParams.toString();
    const url = `/blocked-days${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || response.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener los días bloqueados.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Registrar un bloqueo de la agenda
 * Payload esperado por el backend:
 * {
 *   fecha_inicio, fecha_fin, motivo, tipo
 * }
 */
export const createBlockedDay = async (blockedDayData) => {
  try {
    const payload = {
      fecha_inicio: blockedDayData.fecha_inicio,
      fecha_fin: blockedDayData.fecha_fin || blockedDayData.fecha_inicio,
      motivo: blockedDayData.motivo || '',
      tipo: blockedDayData.tipo || 'Feriado',
    };

    const response = await api.post('/blocked-days', payload);
    return {
      success: true,
      message: response.data.message || 'Bloqueo registrado exitosamente.',
      data: response.data.data || response.data,
      citasAfectadas: response.data.citas_afectadas ?? 0,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al registrar el bloqueo.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Editar un bloqueo existente
 */
export const updateBlockedDay = async (id, blockedDayData) => {
  try {
    const payload = {
      fecha_inicio: blockedDayData.fecha_inicio,
      fecha_fin: blockedDayData.fecha_fin || blockedDayData.fecha_inicio,
      motivo: blockedDayData.motivo || '',
      tipo: blockedDayData.tipo || 'Feriado',
    };

    const response = await api.put(`/blocked-days/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Bloqueo actualizado exitosamente.',
      data: response.data.data || response.data,
      citasAfectadas: response.data.citas_afectadas ?? 0,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar el bloqueo.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Eliminar un bloqueo y volver a habilitar esas fechas
 */
export const deleteBlockedDay = async (id) => {
  try {
    const response = await api.delete(`/blocked-days/${id}`);
    return {
      success: true,
      message: response.data.message || 'Bloqueo eliminado exitosamente.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al eliminar el bloqueo.',
      status: error.response?.status,
    };
  }
};
