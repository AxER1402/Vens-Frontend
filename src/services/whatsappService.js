import api from './api';

/**
 * Los recordatorios de citas por WhatsApp.
 *
 * Cada respuesta trae las dos cosas que pinta la pantalla: si los
 * recordatorios están encendidos y cómo está la conexión con el teléfono de la
 * clínica ({ estado, qr, numero }).
 */

const cuerpo = (response) => ({
  recordatorios: response.data.data.recordatorios,
  conexion: response.data.data.conexion,
});

export const getWhatsApp = async () => {
  try {
    const response = await api.get('/whatsapp');
    return { success: true, ...cuerpo(response) };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo consultar el estado de WhatsApp.',
    };
  }
};

export const actualizarRecordatorios = async (recordatorios) => {
  try {
    const response = await api.put('/whatsapp', { recordatorios });
    return { success: true, message: response.data.message, ...cuerpo(response) };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo guardar el cambio.',
    };
  }
};

export const cerrarSesion = async () => {
  try {
    const response = await api.post('/whatsapp/cerrar-sesion');
    return { success: true, message: response.data.message, ...cuerpo(response) };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo desvincular el teléfono.',
    };
  }
};
