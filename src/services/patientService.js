import api from './api';

/**
 * Obtener listado de pacientes con filtros opcionales.
 *
 * Con `page` la respuesta viene por páginas y trae `meta`; sin él llega
 * entera, que es lo que necesitan los selectores de paciente.
 *
 * @param {Object} params - { search, estado, activo, page, perPage }
 */
export const getPatients = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }

    if (params.estado && params.estado !== 'Todos') {
      queryParams.append('estado', params.estado);
    }

    if (params.activo !== undefined && params.activo !== null && params.activo !== '') {
      queryParams.append('activo', params.activo);
    }

    if (params.page) {
      queryParams.append('page', params.page);
      queryParams.append('per_page', params.perPage ?? 30);
    }

    const queryString = queryParams.toString();
    const url = `/patients${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || [],
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener la lista de pacientes.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Obtener detalle de un paciente por ID
 */
export const getPatientById = async (id) => {
  try {
    const response = await api.get(`/patients/${id}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el paciente.',
    };
  }
};

/**
 * Crear un nuevo paciente (Requiere Admin o Medico)
 * Payload esperado por el backend:
 * {
 *   nombre, edad, telefono, lugar_residencia, estado_civil, religion, estado
 * }
 */
export const createPatient = async (patientData) => {
  try {
    const payload = {
      nombre: patientData.nombre,
      edad: patientData.edad !== '' ? Number(patientData.edad) : null,
      telefono: patientData.telefono,
      lugar_residencia: patientData.lugar_residencia || null,
      estado_civil: patientData.estado_civil || null,
      religion: patientData.religion || null,
      estado: patientData.estado || 'Activo',
    };

    const response = await api.post('/patients', payload);
    return {
      success: true,
      message: response.data.message || 'Paciente creado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al crear el paciente.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Actualizar un paciente existente (Requiere Admin o Medico)
 * Payload esperado por el backend:
 * {
 *   nombre, edad, telefono, lugar_residencia, estado_civil, religion, estado
 * }
 */
export const updatePatient = async (id, patientData) => {
  try {
    const payload = {
      nombre: patientData.nombre,
      edad: patientData.edad !== '' ? Number(patientData.edad) : null,
      telefono: patientData.telefono,
      lugar_residencia: patientData.lugar_residencia || null,
      estado_civil: patientData.estado_civil || null,
      religion: patientData.religion || null,
      estado: patientData.estado || 'Activo',
    };

    const response = await api.put(`/patients/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Paciente actualizado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar el paciente.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Desactivar un paciente (DELETE /api/v1/patients/{id})
 * Establece activo: false en el backend. Requiere Admin o Medico.
 */
export const deactivatePatient = async (id) => {
  try {
    const response = await api.delete(`/patients/${id}`);
    return {
      success: true,
      message: response.data.message || 'Paciente desactivado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al desactivar el paciente.',
      status: error.response?.status,
    };
  }
};

/**
 * Cambiar Estado de Activación Explícito (PATCH /api/v1/patients/{id}/toggle-active)
 * Permite activar (true) o desactivar (false) al paciente explícitamente.
 * Payload: { activo: boolean }
 */
export const toggleActivePatient = async (id, activo) => {
  try {
    const response = await api.patch(`/patients/${id}/toggle-active`, { activo });
    return {
      success: true,
      message: response.data.message || `Paciente ${activo ? 'activado' : 'desactivado'} exitosamente.`,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al cambiar el estado del paciente.',
      status: error.response?.status,
    };
  }
};
