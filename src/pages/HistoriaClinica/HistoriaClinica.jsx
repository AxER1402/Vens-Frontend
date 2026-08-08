import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  User, Folder, MessageSquare, Search, Stethoscope, CheckCircle, Pill, Clock,
  Save, Activity, PenTool, Check, AlertCircle, Plus, RefreshCw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapeoVenosoCanvas from '../../components/MapeoVenosoCanvas/MapeoVenosoCanvas';
import * as patientService from '../../services/patientService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const SECTIONS = [
  { id: 'interrogatorio', icon: <MessageSquare size={14} />, label: 'Interrogatorio y Síntomas' },
  { id: 'antecedentes', icon: <Folder size={14} />, label: 'Antecedentes' },
  { id: 'examen', icon: <Stethoscope size={14} />, label: 'Examen físico' },
  { id: 'diagnostico', icon: <CheckCircle size={14} />, label: 'Diagnóstico CEAP' },
  { id: 'tratamiento', icon: <Pill size={14} />, label: 'Plan de Tratamiento' },
  { id: 'evolucion', icon: <Clock size={14} />, label: 'Evolución y Observaciones' },
  { id: 'doppler', icon: <Activity size={14} />, label: 'Informe Doppler' },
  { id: 'mapeo', icon: <PenTool size={14} />, label: 'Mapeo Venoso' },
];

const tagClass = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info'
};

/* Bloque de sección: título en versalitas separado por una línea, sin tarjeta */
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

/* Grupo de controles: la etiqueta es solo texto */
function Field({ label, small, children }) {
  return (
    <div className="hc-field">
      <span className={small ? 'hc-field-label-sm' : 'hc-field-label'}>{label}</span>
      {children}
    </div>
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

function ChipRadio({ name, value, label, current, onChange, grow }) {
  const on = current === value;
  return (
    <label className={`hc-chip${on ? ' on' : ''}${grow ? ' grow' : ''}`}>
      <input type="radio" name={name} value={value} checked={on} onChange={onChange} className="hc-sr" />
      {label || value}
    </label>
  );
}

function ChipCheck({ value, label, list, onToggle }) {
  const on = list.includes(value);
  return (
    <label className={`hc-chip${on ? ' on' : ''}`}>
      <input type="checkbox" checked={on} onChange={() => onToggle(value)} className="hc-sr" />
      {label || value}
    </label>
  );
}

function OptRadio({ name, value, label, current, onChange, danger }) {
  const on = current === value;
  return (
    <label className={`hc-opt${on ? ' on' : ''}${danger ? ' danger' : ''}`}>
      <input type="radio" name={name} value={value} checked={on} onChange={onChange} className="hc-sr" />
      <span className={`hc-box hc-radio${on ? ' on' : ''}`}>{on && <span className="hc-dot" />}</span>
      {label || value}
    </label>
  );
}

function OptCheck({ value, label, list, onToggle }) {
  const on = list.includes(value);
  return (
    <label className={`hc-opt${on ? ' on' : ''}`}>
      <input type="checkbox" checked={on} onChange={() => onToggle(value)} className="hc-sr" />
      <span className={`hc-box${on ? ' on' : ''}`}>{on && <Check size={11} strokeWidth={3} />}</span>
      {label || value}
    </label>
  );
}

function HistoriaClinica() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Patients state
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientError, setPatientError] = useState('');

  // Modal state for Shadcn patient selector
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [tempSelectedId, setTempSelectedId] = useState('');

  const [active, setActive] = useState('interrogatorio');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Read patientId query param
  const urlPatientId = searchParams.get('patientId') || searchParams.get('id');

  // Fetch patients list safely without infinite loops
  useEffect(() => {
    let isMounted = true;
    const loadPatients = async () => {
      setLoadingPatients(true);
      setPatientError('');
      const res = await patientService.getPatients();
      if (!isMounted) return;

      if (res.success && res.data) {
        setPatients(res.data);
        if (urlPatientId) {
          const found = res.data.find(p => String(p.id) === String(urlPatientId));
          if (found) {
            setSelectedPatientId(String(found.id));
          } else {
            const singleRes = await patientService.getPatientById(urlPatientId);
            if (isMounted && singleRes.success && singleRes.data) {
              setPatients(prev => [singleRes.data, ...prev]);
              setSelectedPatientId(String(singleRes.data.id));
            }
          }
        }
      } else {
        setPatientError(res.message || 'Error al cargar pacientes.');
      }
      if (isMounted) setLoadingPatients(false);
    };

    loadPatients();
    return () => { isMounted = false; };
  }, [urlPatientId]);

  const patient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patients.find(p => String(p.id) === String(selectedPatientId)) || null;
  }, [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    if (!modalSearch.trim()) return patients;
    const term = modalSearch.toLowerCase().trim();
    return patients.filter(p =>
      (p.nombre && p.nombre.toLowerCase().includes(term)) ||
      (p.telefono && p.telefono.includes(term)) ||
      (p.id && String(p.id).includes(term))
    );
  }, [patients, modalSearch]);

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    if (id) {
      setSearchParams({ patientId: id });
    } else {
      setSearchParams({});
    }
  };

  const handleOpenModal = () => {
    setTempSelectedId(selectedPatientId);
    setModalSearch('');
    setIsModalOpen(true);
  };

  const handleConfirmSelection = () => {
    handleSelectPatient(tempSelectedId);
    setIsModalOpen(false);
  };

  const [form, setForm] = useState({
    consultaPor: '',
    zonasPierna: [],
    sintomas: [],
    sintomasAumentan: [],
    sintomasDisminuyen: [],
    disminuyenOtros: '',
    familiarVarices: '',
    alergias: '',
    cirugias: '',
    gestas: '', abortos: '', partos: '', cesareas: '', hijosVivos: '', hijosMuertos: '',
    ultimaMenstruacion: '', hormonas: '',
    enfermedades: [], enfermedadesOtros: '',
    ta: '', fc: '', fr: '', temp: '', peso: '', ubicacion: '',
    ceapC: '', ceapE: '', ceapA: [], ceapP: '',
    txZonas: [],
    escleroConcentracion: '', escleroForma: '', escleroVolumen: '',
    indicaciones: [], indicacionesOtros: '',
    evolucion: '', observaciones: [], estado: '', notas: '',
    dopDerProfundo: 'Eje venoso profundo permeable y compresible con flujo cíclico espontáneo.',
    dopDerSafInt: 'Suficiente.', dopDerSafIntDiam: '',
    dopDerSafExt: 'Permeable, suficiente.', dopDerSafExtDiam: '',
    dopDerPerf: 'No se observan perforantes insuficientes.',
    dopDerTrom: 'No se observan signos de trombosis en los vasos evaluados.',
    dopIzqProfundo: 'Eje venoso profundo permeable y compresible con flujo cíclico espontáneo.',
    dopIzqSafInt: 'Suficiente.', dopIzqSafIntDiam: '',
    dopIzqSafExt: 'Permeable, suficiente.', dopIzqSafExtDiam: '',
    dopIzqPerf: 'No se observan perforantes insuficientes.',
    dopIzqTrom: 'No se observan signos de trombosis en los vasos evaluados.',
    dopConclusion: 'Sistema venoso evaluado permeable sin datos de insuficiencia ni trombosis.'
  });

  const ch = (e) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };
  const toggleArr = (key, val) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val]
    }));
  };

  const isFilled = (id) => {
    if (id === 'interrogatorio') return !!form.consultaPor;
    if (id === 'antecedentes') return true;
    if (id === 'examen') return !!form.ta;
    if (id === 'diagnostico') return !!form.ceapC;
    if (id === 'tratamiento') return form.txZonas.length > 0;
    if (id === 'evolucion') return !!form.estado;
    if (id === 'doppler') return true;
    if (id === 'mapeo') return true;
    return false;
  };

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setSaveMessage('Seleccione un paciente antes de guardar la historia clínica.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    setSaved(true);
    setSaveMessage('Historia clínica guardada exitosamente.');
    setTimeout(() => {
      setSaved(false);
      setSaveMessage('');
    }, 3000);
  };

  const showGineco = patient?.genero === 'Femenino' || patient?.sexo === 'Femenino'
    || !patient || (!patient?.genero && !patient?.sexo);

  return (
    <Layout breadcrumb="Historia Clínica">
      <div className="flat-page hc-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Historia Clínica Especializada</h1>
            <p className="page-subtitle">Registro Flebológico y Vascular</p>
          </div>
          <span className={`tag ${saved ? 'tag-success' : 'tag-info'}`}>
            {saved ? 'Guardado' : 'Sin guardar'}
          </span>
        </div>

        {/* Selector de paciente */}
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="flat-page hc-page sm:max-w-lg max-h-[85vh] flex flex-col rounded-none bg-brand-surface">
              <DialogHeader>
                <DialogTitle className="text-brand-text">Seleccionar paciente</DialogTitle>
                <DialogDescription>
                  Elija el expediente al que pertenece esta historia clínica.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-light" />
                <input
                  type="text"
                  className="form-control pl-9"
                  placeholder="Buscar por nombre, teléfono o ID…"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>

              <div className="hc-pick-list">
                {loadingPatients ? (
                  <div className="hc-empty flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Cargando pacientes…
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="hc-empty">No se encontraron resultados para la búsqueda.</div>
                ) : (
                  filteredPatients.map((p) => {
                    const isSelected = String(p.id) === String(tempSelectedId);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        className={`hc-pick${isSelected ? ' on' : ''}`}
                        onClick={() => setTempSelectedId(String(p.id))}
                      >
                        <span className={`hc-box hc-radio${isSelected ? ' on' : ''}`}>
                          {isSelected && <span className="hc-dot" />}
                        </span>
                        <span className="hc-pick-body">
                          <span className="hc-pick-name">
                            {p.nombre}
                            <span className={`tag ${tagClass[p.estado] || 'tag-info'}`}>{p.estado || 'Activo'}</span>
                          </span>
                          <span className="hc-pick-meta">
                            <span className="hc-exp">EXP-{p.id}</span>
                            {p.edad && <span>{p.edad} años</span>}
                            {p.telefono && <span>{p.telefono}</span>}
                            {p.lugar_residencia && <span>{p.lugar_residencia}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setIsModalOpen(false); navigate('/pacientes'); }}
                >
                  <Plus size={14} /> Registrar nuevo
                </button>
                <span className="flex items-center gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!tempSelectedId}
                    onClick={handleConfirmSelection}
                  >
                    Confirmar selección
                  </button>
                </span>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <form onSubmit={handleSave} id="form-historia-clinica">
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

              {/* Paciente relacionado */}
              <div className="hc-patient-bar">
                <div className="hc-avatar"><User size={18} /></div>
                <div className="hc-patient-info">
                  {patient ? (
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
                        {patient.estado_civil && <span>{patient.estado_civil}</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="hc-patient-name">Sin paciente vinculado</div>
                      <div className="hc-notice">
                        <AlertCircle size={14} />
                        {patientError || 'Seleccione el expediente al que pertenece esta historia clínica.'}
                      </div>
                    </>
                  )}
                </div>
                <div className="hc-save-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleOpenModal}>
                    {patient ? 'Cambiar paciente' : 'Seleccionar paciente'}
                  </button>
                  {patient ? (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/pacientes')}>
                        Ver expediente
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSelectPatient('')}>
                        Desvincular
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/pacientes')}>
                      <Plus size={14} /> Registrar nuevo
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Interrogatorio */}
              <Section id="interrogatorio" icon={<MessageSquare size={14} />} title="Interrogatorio y Síntomas">
                <div className="hc-grid-2">
                  <Field label="Consulta por">
                    <div className="hc-chips">
                      {['Estética', 'Enfermedad'].map(o => (
                        <ChipRadio key={o} name="consultaPor" value={o} current={form.consultaPor} onChange={ch} grow />
                      ))}
                    </div>
                  </Field>

                  <Field label="¿En qué zona presenta molestias?">
                    <div className="hc-chips">
                      {['Muslo', 'Pantorrilla', 'Tobillo', 'Pies', 'Otro'].map(o => (
                        <ChipCheck key={o} value={o} list={form.zonasPierna} onToggle={v => toggleArr('zonasPierna', v)} />
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="¿Presenta alguno de los siguientes síntomas?">
                  <div className="hc-chips">
                    {['Adormecimiento', 'Cansancio', 'Calambres', 'Picazón', 'Manchas en la piel', 'Pesadez', 'Hinchazón', 'Úlceras', 'Asintomática'].map(o => (
                      <ChipCheck key={o} value={o} list={form.sintomas} onToggle={v => toggleArr('sintomas', v)} />
                    ))}
                  </div>
                </Field>

                <div className="hc-grid-2">
                  <Field label="Los síntomas aumentan con">
                    <div className="hc-opts">
                      {['Estar de pie', 'Calor', 'Ejercicio', 'Menstruación', 'Reposo'].map(o => (
                        <OptCheck key={o} value={o} list={form.sintomasAumentan} onToggle={v => toggleArr('sintomasAumentan', v)} />
                      ))}
                    </div>
                  </Field>

                  <Field label="Los síntomas disminuyen con">
                    <div className="hc-opts">
                      {['Elevación de las piernas', 'Medias compresivas', 'Ejercicio', 'Medicamentos', 'Reposo'].map(o => (
                        <OptCheck key={o} value={o} list={form.sintomasDisminuyen} onToggle={v => toggleArr('sintomasDisminuyen', v)} />
                      ))}
                    </div>
                    <input
                      name="disminuyenOtros"
                      className="form-control"
                      placeholder="¿Otras formas? Especifique…"
                      value={form.disminuyenOtros}
                      onChange={ch}
                    />
                  </Field>
                </div>
              </Section>

              {/* 2. Antecedentes */}
              <Section id="antecedentes" icon={<Folder size={14} />} title="Antecedentes">
                <div className="hc-grid-2">
                  <Field label="¿Alguien de su familia padece de várices?">
                    <div className="hc-chips">
                      {['Sí', 'No'].map(o => (
                        <ChipRadio key={o} name="familiarVarices" value={o} current={form.familiarVarices} onChange={ch} grow />
                      ))}
                    </div>
                  </Field>

                  <InputField label="¿Es alérgico a algún medicamento?">
                    <input
                      name="alergias"
                      className="form-control"
                      placeholder="Especifique…"
                      value={form.alergias}
                      onChange={ch}
                    />
                  </InputField>
                </div>

                <InputField label="¿Le han realizado alguna cirugía?">
                  <textarea
                    name="cirugias"
                    className="form-control"
                    rows={2}
                    placeholder="Detalle cirugías previas…"
                    value={form.cirugias}
                    onChange={ch}
                  />
                </InputField>

                {showGineco && (
                  <div>
                    <div className="hc-subhead">Antecedentes ginecológicos</div>
                    <div className="hc-grid-6">
                      {[
                        { label: 'Gestas', name: 'gestas' },
                        { label: 'Abortos', name: 'abortos' },
                        { label: 'Partos', name: 'partos' },
                        { label: 'Cesáreas', name: 'cesareas' },
                        { label: 'Hijos vivos', name: 'hijosVivos' },
                        { label: 'Hijos muertos', name: 'hijosMuertos' },
                      ].map(g => (
                        <InputField key={g.name} label={g.label} small>
                          <input
                            name={g.name}
                            type="number"
                            className="form-control"
                            value={form[g.name]}
                            onChange={ch}
                          />
                        </InputField>
                      ))}
                    </div>
                    <div className="hc-grid-2" style={{ marginTop: 20 }}>
                      <InputField label="Última menstruación" small>
                        <input
                          name="ultimaMenstruacion"
                          type="date"
                          className="form-control"
                          value={form.ultimaMenstruacion}
                          onChange={ch}
                        />
                      </InputField>
                      <InputField label="Uso de hormonas / anticonceptivos" small>
                        <input
                          name="hormonas"
                          className="form-control"
                          placeholder="Especifique…"
                          value={form.hormonas}
                          onChange={ch}
                        />
                      </InputField>
                    </div>
                  </div>
                )}

                <div>
                  <div className="hc-subhead">¿Sufre alguna de las siguientes enfermedades?</div>
                  <div className="hc-chips">
                    {['Enfermedades del corazón', 'Diabetes', 'Lumbalgia', 'Artritis', 'VIH', 'Alta o baja presión', 'Fiebre Reumática', 'Ciática', 'Anemia', 'Otros'].map(o => (
                      <ChipCheck key={o} value={o} list={form.enfermedades} onToggle={v => toggleArr('enfermedades', v)} />
                    ))}
                  </div>
                  {form.enfermedades.includes('Otros') && (
                    <input
                      name="enfermedadesOtros"
                      className="form-control"
                      style={{ marginTop: 12 }}
                      placeholder="Especifique otras enfermedades…"
                      value={form.enfermedadesOtros}
                      onChange={ch}
                    />
                  )}
                </div>
              </Section>

              {/* 3. Examen físico */}
              <Section id="examen" icon={<Stethoscope size={14} />} title="Examen Físico">
                <div className="hc-vitals">
                  {[
                    { name: 'ta', label: 'Presión arterial', unit: 'mmHg' },
                    { name: 'fc', label: 'Frec. cardiaca', unit: 'lpm' },
                    { name: 'temp', label: 'Temperatura', unit: '°C' },
                    { name: 'fr', label: 'Frec. resp.', unit: 'rpm' },
                    { name: 'peso', label: 'Peso', unit: 'lb/kg' },
                  ].map(v => (
                    <InputField key={v.name} label={v.label} small>
                      <span className="vital-wrap">
                        <input
                          name={v.name}
                          className="form-control"
                          value={form[v.name]}
                          onChange={ch}
                        />
                        <span className="vital-unit">{v.unit}</span>
                      </span>
                    </InputField>
                  ))}
                </div>

                <Field label="Ubicación de la patología vascular">
                  <div className="hc-chips">
                    {['MID', 'MII', 'BIALTERAL'].map(o => (
                      <ChipRadio key={o} name="ubicacion" value={o} current={form.ubicacion} onChange={ch} grow />
                    ))}
                  </div>
                </Field>
              </Section>

              {/* 4. Diagnóstico CEAP */}
              <Section id="diagnostico" icon={<CheckCircle size={14} />} title="Diagnóstico (Clasificación CEAP)">
                <div className="hc-grid-2">
                  <div className="hc-stack">
                    <Field label={<><span className="hc-ceap">C</span> Clínica</>}>
                      <div className="hc-opts">
                        {['C0 - Sin signos visibles/palpables', 'C1 - Telangiectasias o venas reticulares', 'C2 - Venas varicosas', 'C3 - Edema', 'C4 - Cambios tróficos (pigmentación, eccema)', 'C5 - Úlcera venosa cicatrizada', 'C6 - Úlcera venosa activa'].map(o => (
                          <OptRadio
                            key={o}
                            name="ceapC"
                            value={o.substring(0, 2)}
                            label={o}
                            current={form.ceapC}
                            onChange={ch}
                          />
                        ))}
                      </div>
                    </Field>

                    <Field label={<><span className="hc-ceap">E</span> Etiología</>}>
                      <div className="hc-chips">
                        {['Primaria', 'Secundaria', 'Congénita'].map(o => (
                          <ChipRadio key={o} name="ceapE" value={o} current={form.ceapE} onChange={ch} grow />
                        ))}
                      </div>
                    </Field>
                  </div>

                  <div className="hc-stack">
                    <Field label={<><span className="hc-ceap">A</span> Anatomía</>}>
                      <div className="hc-opts">
                        {['Superficial', 'Profunda', 'Perforantes', 'Mixta'].map(o => (
                          <OptCheck key={o} value={o} list={form.ceapA} onToggle={v => toggleArr('ceapA', v)} />
                        ))}
                      </div>
                    </Field>

                    <Field label={<><span className="hc-ceap">P</span> Fisiopatología</>}>
                      <div className="hc-chips">
                        {['Reflujo', 'Obstrucción', 'Ambos'].map(o => (
                          <ChipRadio
                            key={o}
                            name="ceapP"
                            value={o === 'Ambos' ? 'Reflujo + Obstrucción' : o}
                            label={o}
                            current={form.ceapP}
                            onChange={ch}
                            grow
                          />
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 5. Tratamiento */}
              <Section id="tratamiento" icon={<Pill size={14} />} title="Plan de Tratamiento y Escleroterapia">
                <Field label="Zonas a tratar">
                  <div className="hc-chips">
                    {['Telangiectasias', 'Reticulares', 'Varicosas trunculares', 'Perforantes'].map(o => (
                      <ChipCheck key={o} value={o} list={form.txZonas} onToggle={v => toggleArr('txZonas', v)} />
                    ))}
                  </div>
                </Field>

                <div>
                  <div className="hc-subhead">Sustancia esclerosante (Polidocanol)</div>
                  <div className="hc-grid-3">
                    <InputField label="Concentración (%)" small>
                      <input
                        name="escleroConcentracion"
                        className="form-control"
                        placeholder="Ej: 1%"
                        value={form.escleroConcentracion}
                        onChange={ch}
                      />
                    </InputField>
                    <InputField label="Forma" small>
                      <select
                        name="escleroForma"
                        className="form-control"
                        value={form.escleroForma}
                        onChange={ch}
                      >
                        <option value="">Seleccionar…</option>
                        <option>Líquida</option>
                        <option>Espuma</option>
                      </select>
                    </InputField>
                    <InputField label="Volumen total (ml)" small>
                      <input
                        name="escleroVolumen"
                        className="form-control"
                        placeholder="Ej: 2.5 ml"
                        value={form.escleroVolumen}
                        onChange={ch}
                      />
                    </InputField>
                  </div>
                </div>

                <Field label="Indicaciones post-tratamiento">
                  <div className="hc-opts">
                    {['Venotónico: Perivasc 950/50', 'AINEs', 'Crema', 'Medias Compresivas', 'No se prescribe tratamiento adicional'].map(o => (
                      <OptCheck key={o} value={o} list={form.indicaciones} onToggle={v => toggleArr('indicaciones', v)} />
                    ))}
                  </div>
                  <input
                    name="indicacionesOtros"
                    className="form-control"
                    placeholder="Otras indicaciones…"
                    value={form.indicacionesOtros}
                    onChange={ch}
                  />
                </Field>
              </Section>

              {/* 6. Evolución */}
              <Section id="evolucion" icon={<Clock size={14} />} title="Evolución y Observaciones">
                <div className="hc-grid-2">
                  <Field label="Evolución desde la última visita">
                    <div className="hc-opts">
                      {['Mejoría', 'Igual', 'Empeoramiento'].map(o => (
                        <OptRadio key={o} name="evolucion" value={o} current={form.evolucion} onChange={ch} />
                      ))}
                    </div>
                  </Field>

                  <Field label="Estado general">
                    <div className="hc-opts">
                      {['Respuesta satisfactoria', 'Requiere nuevas sesiones', 'Requiere cirugía', 'Sospecha de complicación'].map(o => (
                        <OptRadio
                          key={o}
                          name="estado"
                          value={o}
                          current={form.estado}
                          onChange={ch}
                          danger={o.includes('complicación')}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Observaciones tras escleroterapia">
                  <div className="hc-chips">
                    {['Buena respuesta', 'Pigmentación', 'Inflamación', 'Flebitis superficial', 'Sin complicaciones', 'Matting', 'Nódulo esclerosado', 'Úlcera esclerosante', 'Eritema leve', 'Dolor', 'Recanalización'].map(o => (
                      <ChipCheck key={o} value={o} list={form.observaciones} onToggle={v => toggleArr('observaciones', v)} />
                    ))}
                  </div>
                </Field>

                <InputField label="Notas adicionales">
                  <textarea
                    name="notas"
                    className="form-control"
                    rows={4}
                    placeholder="Escriba observaciones adicionales aquí…"
                    value={form.notas}
                    onChange={ch}
                  />
                </InputField>
              </Section>

              {/* 7. Informe Doppler */}
              <Section id="doppler" icon={<Activity size={14} />} title="Ecodöppler Venoso Miembros Inferiores">
                <div className="hc-placeholder">
                  <p className="hc-field-hint">
                    El informe Ecodöppler se llena en un formulario independiente para su mejor administración.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/reporte-doppler')}
                  >
                    <Activity size={14} /> Ir a reporte Doppler
                  </button>
                </div>
              </Section>

              {/* 8. Mapeo venoso */}
              <Section id="mapeo" icon={<PenTool size={14} />} title="Mapeo Venoso Superficial">
                <MapeoVenosoCanvas />
              </Section>

              {/* Barra de guardado */}
              <div className="hc-save-bar">
                <div className={`hc-save-info${saved ? ' saved' : ''}`}>
                  {saved ? (
                    <><Check size={14} /> Historia guardada correctamente</>
                  ) : saveMessage ? (
                    <><AlertCircle size={14} /> {saveMessage}</>
                  ) : (
                    <><Clock size={14} /> Última modificación: ahora</>
                  )}
                </div>
                <div className="hc-save-actions">
                  <button type="button" className="btn btn-ghost">Vista previa</button>
                  <button type="button" className="btn btn-secondary">Guardar borrador</button>
                  <button id="btn-guardar-historia" type="submit" className="btn btn-primary">
                    <Save size={14} /> Guardar historia clínica
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

export default HistoriaClinica;
