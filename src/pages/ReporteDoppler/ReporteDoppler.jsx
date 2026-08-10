import { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  Activity, ArrowLeft, Save, Check, Clock, ClipboardList, FileCheck, AlertCircle,
  User, RefreshCw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as patientService from '../../services/patientService';

const tagClass = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info'
};

/* Un estudio evalúa ambos miembros inferiores con los mismos hallazgos */
const LADOS = [
  { id: 'der', label: 'Miembro Inferior Derecho', abrev: 'MID' },
  { id: 'izq', label: 'Miembro Inferior Izquierdo', abrev: 'MII' },
];

/* Vasos del sistema superficial: cada uno se informa con su diámetro en mm */
const VASOS = [
  { key: 'cayadoInt', label: 'Cayado safena interna' },
  { key: 'troncoInt', label: 'Tronco safena interna' },
  { key: 'cayadoExt', label: 'Cayado safena externa' },
  { key: 'troncoExt', label: 'Tronco safena externa' },
];

const SECTIONS = [
  { id: 'estudio', icon: <ClipboardList size={14} />, label: 'Datos del estudio' },
  { id: 'der', icon: <Activity size={14} />, label: 'Miembro inf. derecho' },
  { id: 'izq', icon: <Activity size={14} />, label: 'Miembro inf. izquierdo' },
  { id: 'conclusion', icon: <FileCheck size={14} />, label: 'Conclusión' },
];

const TEXTO_PROFUNDO = 'Eje venoso profundo permeable y compresible en toda su extensión con flujo cíclico espontáneo sin insuficiencia ni reflujo.';
const TEXTO_PERFORANTES = 'No se observan perforantes insuficientes.';
const TEXTO_TROMBOSIS = 'No se observan signos de trombosis en los vasos evaluados.';

/* Hallazgos por defecto de un miembro, con las claves prefijadas por lado
   (derProfundo, izqCayadoInt…) para que un solo `ch` actualice el formulario. */
const camposLado = (lado) => ({
  [`${lado}Profundo`]: TEXTO_PROFUNDO,
  [`${lado}CayadoInt`]: 'Suficiente.',
  [`${lado}CayadoIntDiam`]: '',
  [`${lado}TroncoInt`]: 'Permeable, suficiente.',
  [`${lado}TroncoIntDiam`]: '',
  [`${lado}CayadoExt`]: 'Suficiente.',
  [`${lado}CayadoExtDiam`]: '',
  [`${lado}TroncoExt`]: 'Permeable, suficiente.',
  [`${lado}TroncoExtDiam`]: '',
  [`${lado}Perforantes`]: TEXTO_PERFORANTES,
  [`${lado}Trombosis`]: TEXTO_TROMBOSIS,
});

const crearFormularioVacio = () => ({
  fecha: new Date().toISOString().split('T')[0],
  ...camposLado('der'),
  ...camposLado('izq'),
  conclusion: 'Sistema venoso evaluado permeable sin datos de insuficiencia ni trombosis.',
});

/* Bloque de sección: mismo panel plano que la historia clínica */
function Section({ id, icon, title, children }) {
  return (
    <section className="hc-section" id={`sec-${id}`}>
      <div className="hc-section-head">
        {icon}
        <h2 className="hc-section-title">{title}</h2>
      </div>
      <div className="hc-section-body">{children}</div>
    </section>
  );
}

/* Control único: el <label> envuelve al input para que sea clicable */
function InputField({ label, small, children }) {
  return (
    <label className="hc-field">
      <span className={small ? 'hc-field-label-sm' : 'hc-field-label'}>{label}</span>
      {children}
    </label>
  );
}

/* Fila de un vaso: hallazgo + diámetro medido */
function Vaso({ lado, campo, label, form, onChange }) {
  const nombre = `${lado}${campo.charAt(0).toUpperCase()}${campo.slice(1)}`;
  const nombreDiam = `${nombre}Diam`;

  return (
    <div className="dop-vaso">
      <InputField label={label} small>
        <input name={nombre} className="form-control" value={form[nombre]} onChange={onChange} />
      </InputField>
      <InputField label="Diámetro" small>
        <span className="vital-wrap">
          <input
            name={nombreDiam}
            className="form-control"
            placeholder="Ej: 4.1"
            value={form[nombreDiam]}
            onChange={onChange}
          />
          <span className="vital-unit">mm</span>
        </span>
      </InputField>
    </div>
  );
}

function ReporteDoppler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(crearFormularioVacio);
  const [active, setActive] = useState('estudio');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  /* El expediente llega desde la historia clínica: el estudio pertenece al
     paciente y a la consulta que ya estaban abiertos, sin volver a elegirlos. */
  const patientId = searchParams.get('patientId');
  const historiaId = searchParams.get('historiaId');

  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(!!patientId);
  const [patientError, setPatientError] = useState('');

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoadingPatient(false);
      setPatientError('');
      return;
    }

    let isMounted = true;
    const loadPatient = async () => {
      setLoadingPatient(true);
      setPatientError('');
      const res = await patientService.getPatientById(patientId);
      if (!isMounted) return;

      if (res.success && res.data) {
        setPatient(res.data);
      } else {
        setPatient(null);
        setPatientError(res.message || 'No se pudo cargar el paciente del estudio.');
      }
      setLoadingPatient(false);
    };

    loadPatient();
    return () => { isMounted = false; };
  }, [patientId]);

  /** Regresar a la misma consulta del expediente, no a una pantalla en blanco. */
  const volverAHistoria = () => {
    if (!patientId) {
      navigate('/historia-clinica');
      return;
    }
    const params = new URLSearchParams({
      patientId: String(patientId),
      ...(historiaId ? { historiaId: String(historiaId) } : {})
    });
    navigate(`/historia-clinica?${params}`);
  };

  const ch = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setSaved(false);
    setSaveMessage('');
  };

  const isFilled = (id) => {
    if (id === 'estudio') return !!patient;
    if (id === 'conclusion') return !!form.conclusion.trim();
    // Un miembro cuenta como informado cuando ya se midió algún diámetro
    return VASOS.some(v => form[`${id}${v.key.charAt(0).toUpperCase()}${v.key.slice(1)}Diam`]);
  };

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!patient) {
      setSaved(false);
      setSaveMessage('Abra el reporte desde la historia clínica de un paciente para poder guardarlo.');
      return;
    }
    // El endpoint del Ecodöppler aún no existe: el reporte solo queda en pantalla
    setSaved(true);
    setSaveMessage(`Reporte de ${patient.nombre} completo. Falta conectar el guardado con el backend.`);
  };

  return (
    <Layout breadcrumb="Reporte Ecodöppler">
      <div className="flat-page hc-page">
        <div className="page-header">
          <div>
            <button type="button" className="btn btn-ghost btn-sm dop-back" onClick={volverAHistoria}>
              <ArrowLeft size={14} /> Volver a Historia Clínica
            </button>
            <h1 className="page-title">Ecodöppler Venoso</h1>
            <p className="page-subtitle">Registro ecográfico de miembros inferiores</p>
          </div>
          <span className={`tag ${saved ? 'tag-success' : 'tag-info'}`}>
            {saved ? 'Guardado' : 'Sin guardar'}
          </span>
        </div>

        <form onSubmit={handleSave} id="form-reporte-doppler">
          <div className="hc-layout">

            {/* Navegación de secciones */}
            <div className="hc-nav">
              <div className="hc-nav-head">Secciones</div>
              <div className="hc-nav-list">
                {SECTIONS.map(s => (
                  <button
                    type="button"
                    key={s.id}
                    className={`hc-nav-btn ${active === s.id ? 'active' : ''}`}
                    onClick={() => scrollTo(s.id)}
                  >
                    {s.icon}
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <span className={`hc-nav-dot ${isFilled(s.id) ? '' : 'empty'}`}></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="hc-main">

              {/* Paciente del estudio: viene vinculado desde la historia clínica */}
              <div className="hc-patient-bar">
                <div className="hc-avatar"><User size={18} /></div>
                <div className="hc-patient-info">
                  {loadingPatient ? (
                    <div className="hc-patient-name">
                      <RefreshCw size={14} className="animate-spin" /> Cargando paciente…
                    </div>
                  ) : patient ? (
                    <>
                      <div className="hc-patient-name">
                        {patient.nombre}
                        <span className={`tag ${tagClass[patient.estado] || 'tag-info'}`}>
                          {patient.estado || 'Activo'}
                        </span>
                      </div>
                      <div className="hc-patient-meta">
                        <span className="hc-exp">EXP-{patient.id}</span>
                        {patient.edad && <span>{patient.edad} años</span>}
                        <span>{patient.telefono || 'Sin teléfono'}</span>
                        <span>{patient.lugar_residencia || 'Sin residencia'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="hc-patient-name">Sin paciente vinculado</div>
                      <div className="hc-notice">
                        <AlertCircle size={14} />
                        {patientError || 'Abra el reporte desde la historia clínica para vincularlo al expediente.'}
                      </div>
                    </>
                  )}
                </div>
                <div className="hc-save-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={volverAHistoria}>
                    {patient ? 'Ver historia clínica' : 'Seleccionar paciente'}
                  </button>
                </div>
              </div>

              {/* Datos del estudio */}
              <Section id="estudio" icon={<ClipboardList size={14} />} title="Datos del Estudio">
                <div className="hc-grid-2">
                  <InputField label="Fecha del estudio">
                    <input name="fecha" type="date" className="form-control" value={form.fecha} onChange={ch} />
                  </InputField>
                  <div className="hc-field">
                    <span className="hc-field-label">Consulta asociada</span>
                    <p className="hc-field-hint">
                      {historiaId
                        ? `Consulta #${historiaId} del expediente EXP-${patientId}.`
                        : 'Consulta nueva: el estudio se adjuntará al guardar la historia clínica.'}
                    </p>
                  </div>
                </div>
              </Section>

              {/* Un panel por miembro inferior */}
              {LADOS.map(lado => (
                <Section
                  key={lado.id}
                  id={lado.id}
                  icon={<Activity size={14} />}
                  title={`${lado.label} (${lado.abrev})`}
                >
                  <InputField label="Eje venoso profundo">
                    <textarea
                      name={`${lado.id}Profundo`}
                      className="form-control"
                      rows={2}
                      value={form[`${lado.id}Profundo`]}
                      onChange={ch}
                    />
                  </InputField>

                  <div>
                    <div className="hc-subhead">Sistema venoso superficial</div>
                    <div className="dop-vasos">
                      {VASOS.map(v => (
                        <Vaso
                          key={v.key}
                          lado={lado.id}
                          campo={v.key}
                          label={v.label}
                          form={form}
                          onChange={ch}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="hc-subhead">Perforantes y trombosis</div>
                    <div className="hc-grid-2">
                      <InputField label="Perforantes" small>
                        <input
                          name={`${lado.id}Perforantes`}
                          className="form-control"
                          value={form[`${lado.id}Perforantes`]}
                          onChange={ch}
                        />
                      </InputField>
                      <InputField label="Trombosis" small>
                        <input
                          name={`${lado.id}Trombosis`}
                          className="form-control"
                          value={form[`${lado.id}Trombosis`]}
                          onChange={ch}
                        />
                      </InputField>
                    </div>
                  </div>
                </Section>
              ))}

              {/* Conclusión */}
              <Section id="conclusion" icon={<FileCheck size={14} />} title="Conclusión">
                <InputField label="Interpretación del estudio">
                  <textarea
                    name="conclusion"
                    className="form-control"
                    rows={3}
                    value={form.conclusion}
                    onChange={ch}
                  />
                </InputField>
                <p className="hc-field-hint">
                  Esta conclusión es la que se adjunta a la consulta del expediente.
                </p>
              </Section>

              {/* Barra de guardado */}
              <div className="hc-save-bar">
                <div className={`hc-save-info${saved ? ' saved' : ''}`}>
                  {saved ? (
                    <><Check size={14} /> {saveMessage}</>
                  ) : saveMessage ? (
                    <><AlertCircle size={14} /> {saveMessage}</>
                  ) : (
                    <><Clock size={14} /> Reporte sin guardar</>
                  )}
                </div>
                <div className="hc-save-actions">
                  <button type="button" className="btn btn-ghost" onClick={volverAHistoria}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!patient}>
                    <Save size={14} /> Guardar reporte
                  </button>
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default ReporteDoppler;
