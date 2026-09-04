import api from './api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const EXPIRACION_KEY = 'token_expires_at';

/**
 * Guarda el momento exacto en que vence la sesión (ISO 8601 del backend).
 * Sin ese dato se borra la marca anterior para no arrastrar un vencimiento
 * viejo de otra sesión.
 */
const guardarVencimiento = (expiresAt) => {
  if (expiresAt) {
    localStorage.setItem(EXPIRACION_KEY, expiresAt);
  } else {
    localStorage.removeItem(EXPIRACION_KEY);
  }
};

/**
 * Momento en que vence la sesión, en milisegundos, o null si no se conoce.
 */
export const getSessionExpiry = () => {
  const guardado = localStorage.getItem(EXPIRACION_KEY);
  if (!guardado) return null;

  const vencimiento = new Date(guardado).getTime();
  return Number.isNaN(vencimiento) ? null : vencimiento;
};

/**
 * ¿Ya pasó la hora de vida de la sesión guardada?
 */
export const isSessionExpired = () => {
  const vencimiento = getSessionExpiry();
  return vencimiento !== null && vencimiento <= Date.now();
};

/**
 * Borra del navegador todo rastro de la sesión.
 */
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRACION_KEY);
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user, expires_at: expiresAt } = response.data.data;

    if (access_token) {
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      guardarVencimiento(expiresAt);
    }

    return {
      success: true,
      message: response.data.message || 'Inicio de sesión exitoso.',
      token: access_token,
      user,
      expiresAt: getSessionExpiry()
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Error de conexión con el servidor.';
    return {
      success: false,
      status: error.response?.status,
      message
    };
  }
};

export const getProfile = async () => {
  try {
    const response = await api.get('/auth/me');
    const user = response.data.data;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // El backend recuerda en cada consulta cuándo vence la sesión, así que se
    // reajusta la marca local por si el reloj del navegador iba desfasado.
    guardarVencimiento(user.expires_at);
    return {
      success: true,
      user,
      expiresAt: getSessionExpiry()
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener el perfil.'
    };
  }
};

/**
 * Solicita el enlace de recuperación de contraseña.
 * El backend siempre responde 200 con un mensaje genérico (exista o no la
 * cuenta), así que no se debe usar la respuesta para saber si el correo existe.
 */
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return {
      success: true,
      message: response.data.message || 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.'
    };
  } catch (error) {
    const message = error.response?.data?.message
      || error.response?.data?.errors?.email?.[0]
      || 'Error de conexión con el servidor.';
    return {
      success: false,
      status: error.response?.status,
      message
    };
  }
};

/**
 * Restablece la contraseña usando el token recibido por correo.
 */
export const resetPassword = async ({ token, email, password, passwordConfirmation }) => {
  try {
    const response = await api.post('/auth/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation
    });
    return {
      success: true,
      message: response.data.message || 'La contraseña se restableció correctamente.'
    };
  } catch (error) {
    const errors = error.response?.data?.errors;
    const message = errors?.password?.[0]
      || errors?.email?.[0]
      || error.response?.data?.message
      || 'Error de conexión con el servidor.';
    return {
      success: false,
      status: error.response?.status,
      message
    };
  }
};

export const logout = async () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await api.post('/auth/logout');
    }
  } catch (error) {
    console.warn('Logout API warning:', error?.message);
  } finally {
    clearSession();
  }
};
