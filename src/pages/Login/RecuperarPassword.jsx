import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Mail, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { forgotPassword } from '../../services/authService';

function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setSent(true);
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
          <div className="login-panel-logo"><Stethoscope size={30} /></div>
          <h1 className="login-panel-headline">
            Clínica de<br />Flebología
          </h1>
          <p className="login-panel-desc">
            Le enviaremos un enlace seguro a su correo institucional para que pueda crear una contraseña nueva.
          </p>
        </div>
      </div>

      {/* ── Right form panel — Warm cream ── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <h2 className="login-form-title">Recuperar contraseña</h2>
          <p className="login-form-sub">
            Ingrese el correo asociado a su cuenta y le enviaremos las instrucciones.
          </p>

          {errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <span className="font-semibold block text-red-800">No se pudo enviar el enlace</span>
                <span className="mt-0.5 block leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {sent ? (
            <>
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in-0">
                <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-semibold block text-emerald-900">Revise su correo</span>
                  <span className="mt-0.5 block leading-relaxed">
                    Si el correo está registrado, recibirá un enlace para restablecer su contraseña.
                    El enlace vence en 60 minutos.
                  </span>
                </div>
              </div>

              <Link to="/login" className="btn-login" style={{ textDecoration: 'none' }}>
                Volver al inicio de sesión
              </Link>
            </>
          ) : (
            <>
              <form className="login-form" onSubmit={handleSubmit} id="forgot-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Correo electrónico</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Mail size={15} /></span>
                    <input
                      id="email" name="email" type="email"
                      className="form-control"
                      placeholder="usuario@vens.com"
                      value={email} onChange={handleChange}
                      required autoComplete="email" autoFocus
                    />
                  </div>
                </div>

                <button id="btn-forgot" type="submit" className="btn-login" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando enlace…
                    </span>
                  ) : (
                    'Enviar enlace'
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
            Si no recibe el correo, verifique su bandeja de spam o contacte al administrador.
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecuperarPassword;
