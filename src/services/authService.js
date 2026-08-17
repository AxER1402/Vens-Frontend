import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data.data;
    
    if (access_token) {
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return {
      success: true,
      message: response.data.message || 'Inicio de sesión exitoso.',
      token: access_token,
      user
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
    localStorage.setItem('user', JSON.stringify(user));
    return {
      success: true,
      user
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
    const token = localStorage.getItem('token');
    if (token) {
      await api.post('/auth/logout');
    }
  } catch (error) {
    console.warn('Logout API warning:', error?.message);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
