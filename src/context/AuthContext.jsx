import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { SESION_VENCIDA_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  // Queda en true cuando la sesión se cerró sola por cumplirse la hora, para
  // que la pantalla de ingreso pueda explicar por qué se salió el usuario.
  const [sesionExpirada, setSesionExpirada] = useState(false);

  const temporizador = useRef(null);

  const cancelarTemporizador = useCallback(() => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }, []);

  /** Cierra la sesión en la aplicación porque el token ya no vale. */
  const vencerSesion = useCallback(() => {
    cancelarTemporizador();
    authService.clearSession();
    setUser(null);
    setToken(null);
    setSesionExpirada(true);
  }, [cancelarTemporizador]);

  /**
   * Programa el cierre para el instante exacto en que vence el token. El
   * backend manda ese momento en el login, así que la aplicación no adivina:
   * espera lo que falte y ni un segundo más.
   */
  const programarVencimiento = useCallback((vencimiento) => {
    cancelarTemporizador();
    if (!vencimiento) return;

    const restante = vencimiento - Date.now();
    if (restante <= 0) {
      vencerSesion();
      return;
    }

    temporizador.current = setTimeout(vencerSesion, restante);
  }, [cancelarTemporizador, vencerSesion]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      // Si la hora ya pasó mientras la pestaña estaba cerrada, no se consulta
      // al backend: la sesión se da por terminada de una vez.
      if (authService.isSessionExpired()) {
        vencerSesion();
        setLoading(false);
        return;
      }

      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.user);
        setToken(storedToken);
        programarVencimiento(res.expiresAt);
      } else {
        cancelarTemporizador();
        authService.clearSession();
        setUser(null);
        setToken(null);
      }

      setLoading(false);
    };

    initAuth();

    return cancelarTemporizador;
  }, [cancelarTemporizador, programarVencimiento, vencerSesion]);

  // Un temporizador puede atrasarse si la máquina se suspende o el navegador
  // duerme la pestaña, así que al volver a la pantalla se vuelve a comprobar
  // la hora contra el reloj real.
  useEffect(() => {
    const revisarAlVolver = () => {
      if (document.visibilityState === 'visible'
        && localStorage.getItem('token')
        && authService.isSessionExpired()) {
        vencerSesion();
      }
    };

    document.addEventListener('visibilitychange', revisarAlVolver);
    window.addEventListener('focus', revisarAlVolver);

    return () => {
      document.removeEventListener('visibilitychange', revisarAlVolver);
      window.removeEventListener('focus', revisarAlVolver);
    };
  }, [vencerSesion]);

  // El backend también puede rechazar el token antes de tiempo (por ejemplo si
  // se restableció la contraseña); el interceptor avisa con este evento.
  useEffect(() => {
    const alRechazarToken = () => vencerSesion();

    window.addEventListener(SESION_VENCIDA_EVENT, alRechazarToken);
    return () => window.removeEventListener(SESION_VENCIDA_EVENT, alRechazarToken);
  }, [vencerSesion]);

  const loginUser = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      setSesionExpirada(false);
      programarVencimiento(res.expiresAt);
    }
    return res;
  };

  const logoutUser = async () => {
    cancelarTemporizador();
    await authService.logout();
    setUser(null);
    setToken(null);
    setSesionExpirada(false);
  };

  const value = {
    user,
    token,
    loading,
    sesionExpirada,
    isAuthenticated: !!token && !!user,
    loginUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
