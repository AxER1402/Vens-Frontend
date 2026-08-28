import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../../assets/isotipo.png';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { resetPassword } from '../../services/authService';

function RestablecerPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [form, setForm] = useState({ password: '', passwordConfirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  // El enlace del correo siempre trae token y email; sin ellos no hay nada que hacer.
  const enlaceInvalido = !token || !email;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.passwordConfirmation) {
      setErrorMsg('La confirmación de la contraseña no coincide.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await resetPassword({
        token,
        email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation
      });

      if (res.success) {
        setDone(true);
        // La sesión anterior quedó revocada en el backend: se limpia el
        // almacenamiento local y se redirige al login.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      } else {
        setErrorMsg(res.message);
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
            Elija una contraseña nueva para su cuenta. Por seguridad, se cerrarán todas las sesiones abiertas.
          </p>
        </div>
      </div>

      {/* ── Right form panel — Warm cream ── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <h2 className="login-form-title">Nueva contraseña</h2>
          <p className="login-form-sub">
            {enlaceInvalido
              ? 'El enlace utilizado no es válido.'
              : <>Está restableciendo la contraseña de <strong>{email}</strong></>}
          </p>

          {errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <span className="font-semibold block text-red-800">No se pudo restablecer</span>
                <span className="mt-0.5 block leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {enlaceInvalido ? (
            <>
              <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3 shadow-xs">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-semibold block text-amber-900">Enlace incompleto</span>
                  <span className="mt-0.5 block leading-relaxed">
                    Abra el enlace directamente desde el correo que recibió, o solicite uno nuevo.
                  </span>
                </div>
              </div>

              <Link to="/recuperar-contrasena" className="btn-login" style={{ textDecoration: 'none' }}>
                Solicitar un enlace nuevo
              </Link>
            </>
          ) : done ? (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-semibold block text-emerald-900">Contraseña actualizada</span>
                <span className="mt-0.5 block leading-relaxed">
                  Ya puede iniciar sesión con su nueva contraseña. Redirigiendo…
                </span>
              </div>
            </div>
          ) : (
            <>
              <form className="login-form" onSubmit={handleSubmit} id="reset-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Nueva contraseña</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Lock size={15} /></span>
                    <input
                      id="password" name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="••••••••"
                      value={form.password} onChange={handleChange}
                      required minLength={8} autoComplete="new-password" autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-toggle-pw"
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="form-hint">Mínimo 8 caracteres.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="passwordConfirmation">Confirmar contraseña</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Lock size={15} /></span>
                    <input
                      id="passwordConfirmation" name="passwordConfirmation"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="••••••••"
                      value={form.passwordConfirmation} onChange={handleChange}
                      required minLength={8} autoComplete="new-password"
                    />
                  </div>
                </div>

                <button id="btn-reset" type="submit" className="btn-login" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando…
                    </span>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </button>
              </form>

              {/* El margen va inline: el reset global de index.css (`* { margin: 0 }`)
                  está fuera de capa y anula las utilidades mt-* de Tailwind. */}
              <div className="login-opts" style={{ justifyContent: 'center', marginTop: '40px' }}>
                <Link to="/login" className="login-forgot">
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}

          <div className="login-note mt-6">
            <ShieldAlert size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />&nbsp;
            El enlace vence 60 minutos después de solicitarlo y solo puede usarse una vez.
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestablecerPassword;
