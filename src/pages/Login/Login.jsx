import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Calendar, Clipboard, BarChart3, Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/isotipo.png';

function Login() {
  const navigate = useNavigate();
  const { loginUser, sesionExpirada } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await loginUser(form.email, form.password);
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(res.message || 'Las credenciales proporcionadas son incorrectas.');
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Left panel — Deep blue ── */}
      <div className="login-panel">
        <div className="login-panel-content">
          <img
            className="login-panel-logo"
            src={logo}
            alt="Doctora Yojana Mendoza — Flebología"
          />
          <p className="login-panel-desc">
            Sistema integral para la gestión de pacientes, historia clínica especializada y seguimiento vascular.
          </p>

          <div className="login-features">
            {[
              { icon: <Users size={16} />, text: 'Gestión completa de pacientes' },
              { icon: <Calendar size={16} />, text: 'Control y programación de citas' },
              { icon: <Clipboard size={16} />, text: 'Historia clínica con clasificación CEAP' },
              { icon: <BarChart3 size={16} />, text: 'Reportes y facturación electrónica' },
            ].map((f, i) => (
              <div className="login-feat" key={i}>
                <div className="login-feat-icon">{f.icon}</div>
                <span className="login-feat-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel — Warm cream ── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <h2 className="login-form-title">Bienvenido</h2>
          <p className="login-form-sub">Ingrese sus credenciales para acceder al sistema</p>

          {sesionExpirada && !errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
              <Clock size={20} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block text-amber-900">La sesión expiró</span>
                <span className="mt-0.5 block leading-relaxed">
                  Por seguridad, la sesión dura una hora. Ingrese sus credenciales para continuar.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <span className="font-semibold block text-red-800">Error de autenticación</span>
                <span className="mt-0.5 block leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><Mail size={15} /></span>
                <input
                  id="email" name="email" type="email"
                  className="form-control"
                  placeholder="usuario@vens.com"
                  value={form.email} onChange={handleChange}
                  required autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><Lock size={15} /></span>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  required autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-pw"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-opts" style={{ justifyContent: 'flex-end' }}>
              <Link to="/recuperar-contrasena" className="login-forgot">
                ¿Olvidó su contraseña?
              </Link>
            </div>

            <button id="btn-login" type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Iniciando sesión…
                </span>
              ) : (
                <>
                  Iniciar sesión <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="login-note mt-6">
            <ShieldAlert size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />&nbsp; Acceso restringido a personal autorizado.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
