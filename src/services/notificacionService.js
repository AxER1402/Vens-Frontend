import api from './api';

/**
 * Avisos de agenda: los pacientes que vienen en lo que queda de hoy y mañana.
 *
 * El backend los calcula sobre la agenda en cada consulta, así que la lista ya
 * viene sin las citas canceladas ni las que el usuario descartó a mano.
 */
export const listar = async () => {
  try {
    const response = await api.get('/notifications');
    const { notificaciones = [], total = 0, ventana = null } = response.data.data ?? {};
    return { success: true, notificaciones, total, ventana };
  } catch (error) {
    return {
      success: false,
      notificaciones: [],
      total: 0,
      message: error.response?.data?.message || 'No se pudieron cargar las notificaciones.'
    };
  }
};

/**
 * Descartar un aviso. No borra la cita: deja constancia de que este usuario no
 * quiere volver a verlo.
 */
export const descartar = async (clave) => {
  try {
    await api.delete(`/notifications/${clave}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo descartar el aviso.'
    };
  }
};

/**
 * Descartar de una vez todos los avisos a la vista.
 */
export const descartarTodos = async () => {
  try {
    const response = await api.delete('/notifications');
    return { success: true, descartados: response.data.data?.descartados ?? 0 };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudieron descartar los avisos.'
    };
  }
};
