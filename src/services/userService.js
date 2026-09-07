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
 * El personal al que se le puede asignar una cita o un informe.
 *
 * No es `getUsers` con un filtro: aquel administra las cuentas y solo lo puede
 * llamar el administrador, así que usarlo para llenar un selector dejaba sin
 * médicos a quien agenda desde el mostrador. Este devuelve nombre y rol, que
 * es todo lo que un selector necesita.
 */
export const getMedicos = async () => {
  try {
    const response = await api.get('/medicos');
    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener la lista de médicos.',
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

/**
 * Borrar una cuenta del sistema, sin vuelta atrás (Solo Admin).
 * Endpoint: DELETE /users/{id}/definitivo
 *
 * El backend se niega si la cuenta tiene registros a su nombre, si es la de
 * quien la pide o si es el último administrador activo; en esos casos vuelve
 * con el motivo, que es lo que hay que enseñar.
 */
export const eliminarUsuario = async (id) => {
  try {
    const response = await api.delete(`/users/${id}/definitivo`);
    return {
      success: true,
      message: response.data.message || 'Usuario eliminado del sistema.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo eliminar el usuario.',
    };
  }
};
