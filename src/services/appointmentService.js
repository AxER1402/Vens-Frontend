import api from './api';

/**
 * Obtener listado de citas con filtros multianuales y opcionales
 * @param {Object} params - { year, month, date, from_date, to_date, patient_id, estado }
 */
export const getAppointments = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.year) queryParams.append('year', params.year);
    if (params.month) queryParams.append('month', params.month);
    if (params.date) queryParams.append('date', params.date);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params.estado && params.estado !== 'Todos') queryParams.append('estado', params.estado);

    const queryString = queryParams.toString();
    const url = `/appointments${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || response.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener la lista de citas.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Obtener detalle de una cita específica
 * @param {number|string} id
 */
export const getAppointmentById = async (id) => {
  try {
    const response = await api.get(`/appointments/${id}`);
    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar la cita.',
    };
  }
};

/**
 * Agendar nueva cita
 * Payload esperado por el backend:
 * {
 *   patient_id, medico_id, fecha_hora_inicio, fecha_hora_fin, motivo, notas
 * }
 */
export const createAppointment = async (appointmentData) => {
  try {
    const payload = {
      patient_id: Number(appointmentData.patient_id),
      medico_id: Number(appointmentData.medico_id),
      fecha_hora_inicio: appointmentData.fecha_hora_inicio,
      fecha_hora_fin: appointmentData.fecha_hora_fin,
      motivo: appointmentData.motivo || '',
      notas: appointmentData.notas || '',
    };

    const response = await api.post('/appointments', payload);
    return {
      success: true,
      message: response.data.message || 'Cita agendada exitosamente.',
      data: response.data.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al agendar la cita.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Editar / Reagendar cita existente
 * Payload esperado por el backend:
 * {
 *   medico_id, fecha_hora_inicio, fecha_hora_fin, motivo, estado, notas
 * }
 */
export const updateAppointment = async (id, appointmentData) => {
  try {
    const payload = {
      medico_id: appointmentData.medico_id ? Number(appointmentData.medico_id) : null,
      fecha_hora_inicio: appointmentData.fecha_hora_inicio,
      fecha_hora_fin: appointmentData.fecha_hora_fin,
      motivo: appointmentData.motivo || '',
      estado: appointmentData.estado || 'Reagendada',
      notas: appointmentData.notas || '',
    };
    if (appointmentData.patient_id) {
      payload.patient_id = Number(appointmentData.patient_id);
    }

    const response = await api.put(`/appointments/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Cita actualizada exitosamente.',
      data: response.data.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar la cita.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Asignar o cambiar paciente asignado a la cita
 * Payload esperado por el backend:
 * {
 *   patient_id
 * }
 */
export const assignPatientToAppointment = async (id, patientId) => {
  try {
    const payload = {
      patient_id: Number(patientId),
    };

    const response = await api.patch(`/appointments/${id}/assign-patient`, payload);
    return {
      success: true,
      message: response.data.message || 'Paciente reasignado a la cita exitosamente.',
      data: response.data.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al reasignar el paciente.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Cancelar cita registrando el motivo
 * Payload esperado por el backend:
 * {
 *   motivo_cancelacion
 * }
 */
export const cancelAppointment = async (id, motivoCancelacion) => {
  try {
    const payload = {
      motivo_cancelacion: motivoCancelacion,
    };

    const response = await api.patch(`/appointments/${id}/cancel`, payload);
    return {
      success: true,
      message: response.data.message || 'Cita cancelada exitosamente.',
      data: response.data.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al cancelar la cita.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};
