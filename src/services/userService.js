import api from './api';

/**
 * Obtener listado de usuarios
 */
export const getUsers = async (params = {}) => {
  try {
    const consulta = {};

    if (params.search?.trim()) consulta.search = params.search.trim();
    if (params.rol) consulta.rol = params.rol;
    if (params.activo !== undefined && params.activo !== '') consulta.activo = params.activo;

    if (params.page) {
      consulta.page = params.page;
      consulta.per_page = params.perPage ?? 30;
    }

    const response = await api.get('/users', { params: consulta });
    return {
      success: true,
      data: response.data.data || [],
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener la lista de usuarios.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Obtener detalle de un usuario específico
 */
export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el usuario.',
    };
  }
};

/**
 * Crear un nuevo usuario (Solo Admin)
 * Payload esperado por el backend:
 * {
 *   name, email, password, password_confirmation, rol, telefono, activo
 * }
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return {
      success: true,
      message: response.data.message || 'Usuario creado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al crear el usuario.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Actualizar datos de un usuario existente (Solo Admin)
 * Payload esperado por el backend:
 * {
 *   name, email, rol, telefono, activo, (password opcional)
 * }
 */
export const updateUser = async (id, userData) => {
  try {
    // Si la contraseña viene vacía, no la enviamos para mantener la actual
    const payload = { ...userData };
    if (!payload.password) {
      delete payload.password;
      delete payload.password_confirmation;
    }

    const response = await api.put(`/users/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Usuario actualizado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar el usuario.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Desactivar un usuario en el backend (Solo Admin)
 * Endpoint: DELETE /users/{id}
 */
export const deactivateUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return {
      success: true,
      message: response.data.message || 'Usuario desactivado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al desactivar el usuario.',
    };
  }
};
