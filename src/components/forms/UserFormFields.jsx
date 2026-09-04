import { User, Mail, Phone, Lock, ShieldCheck, Check } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { manejarTelefono, TELEFONO_MAXIMO } from '../../lib/telefono';

export const EMPTY_USER_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  rol: 'medico',
  telefono: '',
  activo: true
};

/**
 * Fuente única de los roles: etiqueta y color con que se pintan en la tabla.
 * `enfermera` se mantiene porque puede venir en datos ya registrados, pero no
 * es asignable, así que no aparece en el formulario ni en el filtro.
 */
export const ROLE_MAP = {
  administrador: { label: 'Administrador', tagClass: 'tag-primary', assignable: true },
  medico: { label: 'Doctor', tagClass: 'tag-info', assignable: true },
  recepcionista: { label: 'Recepcionista', tagClass: 'tag-success', assignable: true },
  enfermera: { label: 'Enfermera', tagClass: 'tag-warning', assignable: false }
};

/** Roles asignables desde el formulario, según los que acepta el backend */
export const ROLE_OPTIONS = Object.entries(ROLE_MAP)
  .filter(([, role]) => role.assignable)
  .map(([value, { label }]) => ({ value, label }));

/** El filtro ofrece los mismos roles que se pueden asignar */
export const ROLE_FILTER_OPTIONS = ROLE_OPTIONS;

/**
 * Campos del usuario compartidos por los diálogos de alta y edición, para que
 * ambos formularios no puedan divergir en estilo ni en contenido.
 *
 * En alta la contraseña es obligatoria; en edición se muestra en un bloque
 * aparte y se deja en blanco para conservar la actual.
 */
export function UserFormFields({ form, setForm, mode = 'create' }) {
  const isEdit = mode === 'edit';
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <>
      <div className="form-group">
        <label className="form-label">
          Nombre completo <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <span className="input-icon"><User size={15} /></span>
          <input
            name="name"
            type="text"
            className="form-control"
            placeholder="Ej. Dr. Juan Pérez"
            value={form.name}
            onChange={set('name')}
            required
          />
        </div>
      </div>

      <div className="grid grid-2 gap-4">
        <div className="form-group">
          <label className="form-label">
            Correo electrónico <span className="req">*</span>
          </label>
          <div className="input-wrap">
            <span className="input-icon"><Mail size={15} /></span>
            <input
              name="email"
              type="email"
              className="form-control"
              placeholder="juan.perez@vens.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <div className="input-wrap">
            <span className="input-icon"><Phone size={15} /></span>
            <input
              name="telefono"
              type="text"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={TELEFONO_MAXIMO}
              className="form-control"
              placeholder="22222222"
              value={form.telefono}
              onChange={manejarTelefono(set('telefono'))}
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Rol de acceso <span className="req">*</span>
        </label>
        <Combobox
          items={ROLE_OPTIONS}
          value={form.rol}
          onChange={(val) => setForm((p) => ({ ...p, rol: val }))}
          placeholder="Seleccionar rol…"
          icon={<ShieldCheck size={15} />}
          clearable={false}
        />
      </div>

      {isEdit ? (
        <div className="form-subpanel">
          <p className="flat-label" style={{ marginBottom: 10 }}>
            Cambiar contraseña — opcional, deje en blanco para conservar la actual
          </p>
          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <div className="input-wrap">
                <span className="input-icon"><Lock size={15} /></span>
                <input
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <div className="input-wrap">
                <span className="input-icon"><Lock size={15} /></span>
                <input
                  name="password_confirmation"
                  type="password"
                  className="form-control"
                  placeholder="Repita la contraseña"
                  value={form.password_confirmation}
                  onChange={set('password_confirmation')}
                  minLength={8}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-2 gap-4">
          <div className="form-group">
            <label className="form-label">
              Contraseña <span className="req">*</span>
            </label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={15} /></span>
              <input
                name="password"
                type="password"
                className="form-control"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Confirmar contraseña <span className="req">*</span>
            </label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={15} /></span>
              <input
                name="password_confirmation"
                type="password"
                className="form-control"
                placeholder="Repita la contraseña"
                value={form.password_confirmation}
                onChange={set('password_confirmation')}
                required
                minLength={8}
              />
            </div>
          </div>
        </div>
      )}

      <label className={`hc-opt${form.activo ? ' on' : ''}`}>
        <input
          type="checkbox"
          className="hc-sr"
          checked={form.activo}
          onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
        />
        <span className={`hc-box${form.activo ? ' on' : ''}`}>
          {form.activo && <Check size={11} strokeWidth={3} />}
        </span>
        Usuario activo — puede iniciar sesión en el sistema
      </label>
    </>
  );
}
