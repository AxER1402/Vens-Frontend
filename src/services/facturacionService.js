import api from './api';

/**
 * Documentos de cobro: recibos internos y facturas electrónicas.
 *
 * Las cuentas las hace el servidor. Aquí se mandan cantidades y precios y se
 * lee lo que responde: el importe de un documento no puede depender de lo que
 * calcule el navegador.
 */

export const getInvoices = async (params = {}) => {
  try {
    const response = await api.get('/invoices', { params });
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || 'No se pudieron cargar los documentos.'
    };
  }
};

export const getInvoice = async (id) => {
  try {
    const response = await api.get(`/invoices/${id}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cargar el documento.'
    };
  }
};

export const emitirInvoice = async (payload) => {
  try {
    const response = await api.post('/invoices', payload);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    const errores = error.response?.data?.errors;
    const primerError = errores ? Object.values(errores)[0]?.[0] : null;

    return {
      success: false,
      status: error.response?.status,
      errors: errores,
      message: primerError || error.response?.data?.message || 'No se pudo emitir el documento.'
    };
  }
};

export const anularInvoice = async (id, motivo) => {
  try {
    const response = await api.patch(`/invoices/${id}/anular`, { motivo_anulacion: motivo });
    return { success: true, message: response.data.message };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message
        || error.response?.data?.errors?.motivo_anulacion?.[0]
        || 'No se pudo anular el documento.'
    };
  }
};

/** Quetzales, que es la moneda en la que cobra la clínica. */
export const quetzales = (monto) =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(Number(monto) || 0);
