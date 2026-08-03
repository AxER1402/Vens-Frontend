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
