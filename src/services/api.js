import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Aviso que se emite cuando el backend rechaza el token: la sesión venció o
 * fue revocada. AuthContext lo escucha para sacar al usuario de la aplicación.
 */
export const SESION_VENCIDA_EVENT = 'vens:sesion-vencida';

/**
 * Aviso de que el backend corrió la hora de vencimiento hacia adelante.
 *
 * La sesión no vence a plazo fijo sino por inactividad, así que cada petición
 * la renueva y el backend anuncia la hora nueva en una cabecera. Sin escucharla,
 * la aplicación se quedaba con la hora que le dieron al entrar y cerraba la
 * sesión a los sesenta minutos aunque el usuario llevara toda la tarde
 * trabajando —y con la consulta a medias en pantalla—.
 */
export const SESION_RENOVADA_EVENT = 'vens:sesion-renovada';

const CABECERA_VENCIMIENTO = 'x-session-expires-at';

/** Recoger de una respuesta la hora nueva de vencimiento, si viene. */
const anunciarVencimiento = (response) => {
  const vencimiento = response?.headers?.[CABECERA_VENCIMIENTO];

  if (!vencimiento) return;

  window.dispatchEvent(new CustomEvent(SESION_RENOVADA_EVENT, { detail: vencimiento }));
};

// Response Interceptor: Handle global errors (e.g. 401 unauthenticated)
api.interceptors.response.use(
  (response) => {
    anunciarVencimiento(response);

    return response;
  },
  (error) => {
    // También en el error: un 422 de validación es una petición que el token
    // autenticó, así que renueva la sesión igual que una que salió bien.
    anunciarVencimiento(error.response);

    if (error.response && error.response.status === 401) {
      // Un 401 sin token guardado es un login con credenciales incorrectas,
      // no una sesión que se venció: ahí no hay nada que avisar.
      const habiaSesion = !!localStorage.getItem('token');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expires_at');

      if (habiaSesion) {
        window.dispatchEvent(new CustomEvent(SESION_VENCIDA_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
