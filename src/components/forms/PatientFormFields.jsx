import { User, Users, Calendar, Phone, MapPin, Heart, Activity } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { manejarTelefono, TELEFONO_MAXIMO } from '../../lib/telefono';

export const EMPTY_PATIENT_FORM = {
  nombre: '',
  edad: '',
  telefono: '',
  lugar_residencia: '',
  estado_civil: '',
  religion: '',
  estado: 'Activo'
};

export const ESTADO_CIVIL_OPTIONS = [
  'Soltero/a',
  'Casado/a',
  'Unión Libre',
  'Divorciado/a',
  'Viudo/a'
];

export const ESTADO_PATIENT_OPTIONS = [
  'Activo',
  'Seguimiento',
  'Alta'
];

/**
 * Campos del paciente compartidos por los diálogos de alta y edición de
 * Pacientes y por el alta rápida desde Citas, para que los tres formularios
 * no puedan divergir en estilo ni en contenido.
 *
 * `showEstado` se desactiva en el alta rápida: allí el paciente siempre nace
 * como "Activo" y el foco es volver cuanto antes a la cita.
 */
export function PatientFormFields({ form, setForm, showEstado = true }) {
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setValue = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <>
      <div className="grid grid-2 gap-4">
        <div className="form-group">
          <label className="form-label">
            Nombre completo <span className="req">*</span>
          </label>
          <div className="input-wrap">
            <span className="input-icon"><User size={15} /></span>
            <input
              name="nombre"
              type="text"
              className="form-control"
              placeholder="Ej. María Eugenia López"
              value={form.nombre}
              onChange={set('nombre')}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Edad</label>
          <div className="input-wrap">
            <span className="input-icon"><Calendar size={15} /></span>
            <input
              name="edad"
              type="number"
              min="0"
              max="120"
              className="form-control"
              placeholder="Ej. 42"
              value={form.edad}
              onChange={set('edad')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-4">
        <div className="form-group">
          <label className="form-label">
            Teléfono <span className="req">*</span>
          </label>
          <div className="input-wrap">
            <span className="input-icon"><Phone size={15} /></span>
            {/* Solo dígitos: lo que se pegue con guiones o espacios se limpia
                mientras se escribe, así el campo enseña la regla sin decirla. */}
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
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Lugar de residencia</label>
          <div className="input-wrap">
            <span className="input-icon"><MapPin size={15} /></span>
            <input
              name="lugar_residencia"
              type="text"
              className="form-control"
              placeholder="Colonia Escalón, San Salvador"
              value={form.lugar_residencia}
              onChange={set('lugar_residencia')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-4">
        <div className="form-group">
          <label className="form-label">Estado civil</label>
          <Combobox
            items={ESTADO_CIVIL_OPTIONS}
            value={form.estado_civil}
            onChange={setValue('estado_civil')}
            placeholder="Seleccionar estado civil…"
            searchPlaceholder="Buscar estado civil…"
            icon={<Users size={15} />}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Religión</label>
          <div className="input-wrap">
            <span className="input-icon"><Heart size={15} /></span>
            <input
              name="religion"
              type="text"
              className="form-control"
              placeholder="Ej. Católica"
              value={form.religion}
              onChange={set('religion')}
            />
          </div>
        </div>
      </div>

      {showEstado && (
        <div className="form-group">
          <label className="form-label">Estado actual del paciente</label>
          <Combobox
            items={ESTADO_PATIENT_OPTIONS}
            value={form.estado}
            onChange={setValue('estado')}
            placeholder="Seleccionar estado…"
            icon={<Activity size={15} />}
            clearable={false}
          />
        </div>
      )}
    </>
  );
}
