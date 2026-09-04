import api from './api';

/**
 * La cuenta propia.
 *
 * Ninguna de estas llamadas lleva un id: el backend siempre opera sobre el
 * usuario del token. Es lo que separa este servicio de `userService`, que
 * administra las cuentas ajenas y solo puede usar el administrador.
 */

/** Actualizar el nombre y el teléfono propios. */
export const actualizarPerfil = async (datos) => {
  try {
    const response = await api.put('/me', datos);
    return {
      success: true,
      message: response.data.message || 'Sus datos se actualizaron correctamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudieron guardar sus datos.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Cambiar la contraseña propia.
 *
 * El backend cierra las demás sesiones al hacerlo, pero conserva la actual:
 * quien acaba de cambiarla no se queda fuera de la aplicación.
 */
export const cambiarPassword = async ({ passwordActual, password, passwordConfirmacion }) => {
  try {
    const response = await api.put('/me/password', {
      password_actual: passwordActual,
      password,
      password_confirmation: passwordConfirmacion,
    });
    return {
      success: true,
      message: response.data.message || 'Su contraseña se actualizó correctamente.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo cambiar la contraseña.',
      errors: error.response?.data?.errors,
    };
  }
};

/** Subir o reemplazar la foto de perfil. */
export const subirFoto = async (archivo) => {
  try {
    const cuerpo = new FormData();
    cuerpo.append('foto', archivo);

    // La instancia manda JSON por defecto; un archivo necesita multipart.
    const response = await api.post('/me/foto', cuerpo, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      success: true,
      message: response.data.message || 'Su foto de perfil se actualizó.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo subir la imagen.',
      errors: error.response?.data?.errors,
    };
  }
};

/** Quitar la foto de perfil y volver a las iniciales. */
export const quitarFoto = async () => {
  try {
    const response = await api.delete('/me/foto');
    return {
      success: true,
      message: response.data.message || 'Su foto de perfil se quitó.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'No se pudo quitar la imagen.',
    };
  }
};
