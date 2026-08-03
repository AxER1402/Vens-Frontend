import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { User, Calendar, Folder, VenetianMask, MessageSquare, BookOpen, Search, Stethoscope, CheckCircle, Pill, Clock, Save, Activity, PenTool, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MapeoVenosoCanvas from '../../components/MapeoVenosoCanvas/MapeoVenosoCanvas';

const PATIENTS = [
  { id: 'P-001', nombre: 'Ana García López',   dob: '1985-03-12', genero: 'Femenino',  expediente: 'EXP-2026-001' },
  { id: 'P-002', nombre: 'Carlos Méndez Ruiz', dob: '1978-07-25', genero: 'Masculino', expediente: 'EXP-2026-002' },
];

const SECTIONS = [
  { id: 'interrogatorio', icon: <MessageSquare size={16} />, label: 'Interrogatorio y Síntomas' },
  { id: 'antecedentes',   icon: <Folder size={16} />,        label: 'Antecedentes' },
  { id: 'examen',         icon: <Stethoscope size={16} />,   label: 'Examen físico' },
  { id: 'diagnostico',    icon: <CheckCircle size={16} />,   label: 'Diagnóstico CEAP' },
  { id: 'tratamiento',    icon: <Pill size={16} />,          label: 'Plan de Tratamiento' },
  { id: 'evolucion',      icon: <Clock size={16} />,         label: 'Evolución y Observaciones' },
  { id: 'doppler',        icon: <Activity size={16} />,      label: 'Informe Doppler' },
  { id: 'mapeo',          icon: <PenTool size={16} />,       label: 'Mapeo Venoso' },
];

function HistoriaClinica() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(PATIENTS[0]);
  const [active, setActive]   = useState('interrogatorio');
  const [saved, setSaved]     = useState(false);

  const [form, setForm] = useState({
    // Interrogatorio
    consultaPor: '',
    zonasPierna: [],
    sintomas: [],
    sintomasAumentan: [],
    sintomasDisminuyen: [],
    disminuyenOtros: '',
    familiarVarices: '',
    alergias: '',
    cirugias: '',
    
    // Antecedentes Ginecológicos
    gestas: '', abortos: '', partos: '', cesareas: '', hijosVivos: '', hijosMuertos: '',
    ultimaMenstruacion: '', hormonas: '',
    
    // Enfermedades
    enfermedades: [], enfermedadesOtros: '',

    // Examen Fisico
    ta: '', fc: '', fr: '', temp: '', peso: '', ubicacion: '',

    // CEAP
    ceapC: '', ceapE: '', ceapA: [], ceapP: '',

    // Tratamiento
    txZonas: [],
    escleroConcentracion: '', escleroForma: '', escleroVolumen: '',
    indicaciones: [], indicacionesOtros: '',

    // Evolucion
    evolucion: '', observaciones: [], estado: '', notas: '',

    // Doppler
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
    if (id === 'antecedentes')   return true;
    if (id === 'examen')         return !!form.ta;
    if (id === 'diagnostico')    return !!form.ceapC;
    if (id === 'tratamiento')    return form.txZonas.length > 0;
    if (id === 'evolucion')      return !!form.estado;
    if (id === 'doppler')        return true; // Marked as filled since it opens externally
    if (id === 'mapeo')          return true;
    return false;
  };

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Layout breadcrumb="Historia Clínica">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historia Clínica Especializada</h1>
          <p className="page-subtitle">Registro Flebológico y Vascular</p>
        </div>
        <span className={`tag ${saved ? 'tag-success' : 'tag-info'} items-center gap-1`}>
          {saved ? <><Check size={14} /> Guardado</> : <>● Sin guardar</>}
        </span>
      </div>

      {/* Patient bar */}
      <div className="hc-patient-bar">
        <div className="hc-avatar"><User size={24} color="white" /></div>
        <div className="flex-1">
          <div className="hc-patient-name">{patient.nombre}</div>
          <div className="hc-patient-meta">
            <span className="flex items-center gap-1"><Calendar size={14} /> {patient.dob}</span>
            <span className="flex items-center gap-1"><VenetianMask size={14} /> {patient.genero}</span>
            <span className="flex items-center gap-1"><Folder size={14} /> {patient.expediente}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} id="form-historia-clinica">
        <div className="hc-layout">

          {/* Section nav */}
          <div className="hc-nav">
            <div className="hc-nav-head">Secciones</div>
            <div className="hc-nav-list">
              {SECTIONS.map(s => (
                <button type="button" key={s.id}
                  className={`hc-nav-btn ${active === s.id ? 'active' : ''}`}
                  onClick={() => scrollTo(s.id)}
                >
                  <span>{s.icon}</span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <span className={`hc-nav-dot ${isFilled(s.id) ? '' : 'empty'}`}></span>
                </button>
              ))}
            </div>
          </div>

          {/* Form sections */}
          <div>

            {/* 1. Interrogatorio */}
            <div className="hc-section" id="sec-interrogatorio">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><MessageSquare size={16} /></div>
                <h2 className="hc-section-title">Interrogatorio y Síntomas</h2>
              </div>
              <div className="hc-section-body">
                
                <div className="form-group mb-6">
                  <label className="form-label">Consulta por:</label>
                  <div className="flex gap-4">
                    {['Estética', 'Enfermedad'].map(o => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="consultaPor" value={o} checked={form.consultaPor === o} onChange={ch} /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label className="form-label">¿En qué zona de la pierna presenta molestias?</label>
                  <div className="flex flex-wrap gap-4">
                    {['Muslo', 'Pantorrilla', 'Tobillo', 'Pies', 'Otro'].map(o => (
                      <label key={o} className="symptom-check">
                        <input type="checkbox" checked={form.zonasPierna.includes(o)} onChange={() => toggleArr('zonasPierna', o)} /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-6">
                  <label className="form-label">¿Presenta alguno de los siguientes síntomas?</label>
                  <div className="flex flex-wrap gap-3">
                    {['Adormecimiento', 'Cansancio', 'Calambres', 'Picazón', 'Manchas en la piel', 'Pesadez', 'Hinchazón', 'Úlceras', 'Asintomática'].map(o => (
                      <label key={o} className="symptom-check">
                        <input type="checkbox" checked={form.sintomas.includes(o)} onChange={() => toggleArr('sintomas', o)} /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="hc-grid-2 mb-4">
                  <div className="form-group">
                    <label className="form-label">Los síntomas AUMENTAN con:</label>
                    <div className="flex flex-col gap-2">
                      {['Estar de pie', 'Calor', 'Ejercicio', 'Menstruación', 'Reposo'].map(o => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.sintomasAumentan.includes(o)} onChange={() => toggleArr('sintomasAumentan', o)} /> {o}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Los síntomas DISMINUYEN con:</label>
                    <div className="flex flex-col gap-2 mb-2">
                      {['Elevación de las piernas', 'Medias compresivas', 'Ejercicio', 'Medicamentos', 'Reposo'].map(o => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.sintomasDisminuyen.includes(o)} onChange={() => toggleArr('sintomasDisminuyen', o)} /> {o}
                        </label>
                      ))}
                    </div>
                    <input name="disminuyenOtros" className="form-control" placeholder="¿Cuáles? (Opcional)" value={form.disminuyenOtros} onChange={ch} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Antecedentes */}
            <div className="hc-section" id="sec-antecedentes">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><Folder size={16} /></div>
                <h2 className="hc-section-title">Antecedentes</h2>
              </div>
              <div className="hc-section-body">
                
                <div className="hc-grid-2 mb-4">
                  <div className="form-group">
                    <label className="form-label">¿Alguien de su familia padece de várices?</label>
                    <div className="flex gap-4">
                      {['Sí', 'No'].map(o => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="familiarVarices" value={o} checked={form.familiarVarices === o} onChange={ch} /> {o}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">¿Es alérgico a algún medicamento?</label>
                    <input name="alergias" className="form-control" value={form.alergias} onChange={ch} />
                  </div>
                </div>
                
                <div className="form-group mb-6">
                  <label className="form-label">¿Le han realizado alguna cirugía?</label>
                  <textarea name="cirugias" className="form-control" rows={2} value={form.cirugias} onChange={ch} />
                </div>

                {patient.genero === 'Femenino' && (
                  <div className="mb-6">
                    <div className="section-header">
                      <span className="section-bar"></span>
                      <span className="section-title">Antecedentes Ginecológicos</span>
                    </div>
                    <div className="hc-grid-3 mb-4">
                      {[
                        { label: 'Gestas', name: 'gestas' },
                        { label: 'Abortos', name: 'abortos' },
                        { label: 'Partos', name: 'partos' },
                        { label: 'Cesáreas', name: 'cesareas' },
                        { label: 'Hijos vivos', name: 'hijosVivos' },
                        { label: 'Hijos muertos', name: 'hijosMuertos' },
                      ].map(g => (
                        <div className="form-group" key={g.name}>
                          <label className="form-label">{g.label}</label>
                          <input name={g.name} type="number" className="form-control" value={form[g.name]} onChange={ch} />
                        </div>
                      ))}
                    </div>
                    <div className="hc-grid-2">
                      <div className="form-group">
                        <label className="form-label">Última menstruación</label>
                        <input name="ultimaMenstruacion" type="date" className="form-control" value={form.ultimaMenstruacion} onChange={ch} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Uso de hormonas o anticonceptivos</label>
                        <input name="hormonas" className="form-control" value={form.hormonas} onChange={ch} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="section-header">
                    <span className="section-bar"></span>
                    <span className="section-title">¿Sufre alguna de las siguientes enfermedades?</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {['Enfermedades del corazón', 'Diabetes', 'Lumbalgia', 'Artritis', 'VIH', 'Alta o baja presión', 'Fiebre Reumática', 'Ciática', 'Anemia', 'Otros'].map(o => (
                      <label key={o} className="symptom-check">
                        <input type="checkbox" checked={form.enfermedades.includes(o)} onChange={() => toggleArr('enfermedades', o)} /> {o}
                      </label>
                    ))}
                  </div>
                  {form.enfermedades.includes('Otros') && (
                    <input name="enfermedadesOtros" className="form-control" placeholder="Especifique otros..." value={form.enfermedadesOtros} onChange={ch} />
                  )}
                </div>

              </div>
            </div>

            {/* 3. Examen Físico */}
            <div className="hc-section" id="sec-examen">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><Stethoscope size={16} /></div>
                <h2 className="hc-section-title">Examen Físico</h2>
              </div>
              <div className="hc-section-body">
                <div className="hc-grid-4 mb-4">
                  {[
                    { name: 'ta',   label: 'Presión arterial', unit: 'mmHg' },
                    { name: 'fc',   label: 'Frec. cardiaca',   unit: 'lpm' },
                    { name: 'temp', label: 'Temperatura',      unit: '°C' },
                    { name: 'fr',   label: 'Frec. resp.',      unit: 'rpm' },
                    { name: 'peso', label: 'Peso',             unit: 'lb/kg' },
                  ].map(v => (
                    <div className="form-group" key={v.name}>
                      <label className="form-label">{v.label}</label>
                      <div className="vital-wrap">
                        <input name={v.name} className="form-control" value={form[v.name]} onChange={ch} />
                        <span className="vital-unit">{v.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Ubicación de la patología vascular</label>
                  <div className="flex gap-4">
                    {['MID', 'MII', 'BILATERAL'].map(o => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="ubicacion" value={o} checked={form.ubicacion === o} onChange={ch} /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Diagnóstico CEAP */}
            <div className="hc-section" id="sec-diagnostico">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><CheckCircle size={16} /></div>
                <h2 className="hc-section-title">Diagnóstico (Clasificación CEAP)</h2>
              </div>
              <div className="hc-section-body" style={{ background: 'var(--brand-surface-alt)', padding: '20px', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
                <div className="hc-grid-2">
                  <div>
                    <div className="form-group mb-4">
                      <label className="form-label font-bold text-lg">C (Clínica)</label>
                      <div className="flex flex-col gap-1">
                        {['C0 - Sin signos visibles/palpables', 'C1 - Telangiectasias o venas reticulares', 'C2 - Venas varicosas', 'C3 - Edema', 'C4 - Cambios tróficos (pigmentación, eccema)', 'C5 - Úlcera venosa cicatrizada', 'C6 - Úlcera venosa activa'].map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="ceapC" value={o.substring(0,2)} checked={form.ceapC === o.substring(0,2)} onChange={ch} /> {o}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label font-bold text-lg">E (Etiología)</label>
                      <div className="flex flex-col gap-1">
                        {['Primaria', 'Secundaria', 'Congénita'].map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="ceapE" value={o} checked={form.ceapE === o} onChange={ch} /> {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="form-group mb-4">
                      <label className="form-label font-bold text-lg">A (Anatomía)</label>
                      <div className="flex flex-col gap-1">
                        {['Superficial', 'Profunda', 'Perforantes', 'Mixta'].map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={form.ceapA.includes(o)} onChange={() => toggleArr('ceapA', o)} /> {o}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label font-bold text-lg">P (Fisiopatología)</label>
                      <div className="flex flex-col gap-1">
                        {['Reflujo', 'Obstrucción', 'Reflujo + Obstrucción'].map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="ceapP" value={o} checked={form.ceapP === o} onChange={ch} /> {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Tratamiento */}
            <div className="hc-section" id="sec-tratamiento">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><Pill size={16} /></div>
                <h2 className="hc-section-title">Plan de Tratamiento y Escleroterapia</h2>
              </div>
              <div className="hc-section-body">
                <div className="form-group mb-6">
                  <label className="form-label">Zonas a tratar</label>
                  <div className="flex flex-wrap gap-4">
                    {['Telangiectasias', 'Reticulares', 'Varicosas trunculares', 'Perforantes'].map(o => (
                      <label key={o} className="symptom-check">
                        <input type="checkbox" checked={form.txZonas.includes(o)} onChange={() => toggleArr('txZonas', o)} /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="section-header">
                    <span className="section-bar"></span>
                    <span className="section-title">Sustancia Esclerosante (Polidocanol)</span>
                  </div>
                  <div className="hc-grid-3">
                    <div className="form-group">
                      <label className="form-label">Concentración (%)</label>
                      <input name="escleroConcentracion" className="form-control" placeholder="Ej: 1%" value={form.escleroConcentracion} onChange={ch} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Forma</label>
                      <select name="escleroForma" className="form-control" value={form.escleroForma} onChange={ch}>
                        <option value="">Seleccionar...</option>
                        <option>Líquida</option>
                        <option>Espuma</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Volumen total (ml)</label>
                      <input name="escleroVolumen" className="form-control" placeholder="Ej: 2.5 ml" value={form.escleroVolumen} onChange={ch} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Indicaciones post-tratamiento</label>
                  <div className="flex flex-col gap-2 mb-3">
                    {['Venotónico: Perivasc 950/50', 'AINEs', 'Crema', 'Medias Compresivas', 'No se prescribe tratamiento adicional'].map(o => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.indicaciones.includes(o)} onChange={() => toggleArr('indicaciones', o)} /> {o}
                      </label>
                    ))}
                  </div>
                  <input name="indicacionesOtros" className="form-control" placeholder="Otros..." value={form.indicacionesOtros} onChange={ch} />
                </div>
              </div>
            </div>

            {/* 6. Evolucion */}
            <div className="hc-section" id="sec-evolucion">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap"><Clock size={16} /></div>
                <h2 className="hc-section-title">Evolución y Observaciones</h2>
              </div>
              <div className="hc-section-body">
                <div className="hc-grid-2 mb-6">
                  <div className="form-group">
                    <label className="form-label">Evolución desde la última visita</label>
                    <div className="flex flex-col gap-2">
                      {['Mejoría', 'Igual', 'Empeoramiento'].map(o => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="evolucion" value={o} checked={form.evolucion === o} onChange={ch} /> {o}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado general</label>
                    <div className="flex flex-col gap-2">
                      {['Respuesta satisfactoria', 'Requiere nuevas sesiones', 'Requiere cirugía', 'Sospecha de complicación'].map(o => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer font-medium" style={{ color: o.includes('complicación') ? 'var(--color-danger)' : 'inherit' }}>
                          <input type="radio" name="estado" value={o} checked={form.estado === o} onChange={ch} /> {o}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group mb-6">
                  <label className="form-label">Observaciones tras escleroterapia</label>
                  <div className="flex flex-wrap gap-3">
                    {['Buena respuesta', 'Pigmentación', 'Inflamación', 'Flebitis superficial', 'Sin complicaciones', 'Matting', 'Nódulo esclerosado', 'Úlcera esclerosante', 'Eritema leve', 'Dolor', 'Recanalización'].map(o => (
                      <label key={o} className="symptom-check">
                        <input type="checkbox" checked={form.observaciones.includes(o)} onChange={() => toggleArr('observaciones', o)} /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas Adicionales</label>
                  <textarea name="notas" className="form-control" rows={3} value={form.notas} onChange={ch} />
                </div>
              </div>
            </div>

            {/* 7. Informe Doppler */}
            <div className="hc-section" id="sec-doppler">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap" style={{ color: '#0C4550', borderColor: 'rgba(167, 227, 238, 0.4)' }}><Activity size={16} /></div>
                <h2 className="hc-section-title">Ecodöppler Venoso Miembros Inferiores</h2>
              </div>
              <div className="hc-section-body" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--brand-text-muted)', marginBottom: '24px' }}>
                  El informe Ecodöppler se llena en un formulario independiente para su mejor administración.
                </p>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/reporte-doppler')}>
                  <Activity size={18} style={{ marginRight: '8px' }} /> Ir a Reporte Doppler
                </button>
              </div>
            </div>

            {/* 8. Mapeo Venoso */}
            <div className="hc-section" id="sec-mapeo">
              <div className="hc-section-head">
                <div className="hc-section-icon-wrap" style={{ color: '#0D401C', borderColor: 'rgba(167, 238, 179, 0.4)' }}><PenTool size={16} /></div>
                <h2 className="hc-section-title">Mapeo Venoso Superficial</h2>
              </div>
              <div className="hc-section-body">
                <MapeoVenosoCanvas />
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="hc-save-bar">
              <div className="hc-save-info">
                {saved
                  ? <><span style={{ color: 'var(--color-success)' }}><Check size={16} /></span> Historia guardada correctamente</>
                  : <><Clock size={16} /> Última modificación: ahora</>}
              </div>
              <div className="hc-save-actions">
                <button type="button" className="btn btn-secondary">Vista previa</button>
                <button type="button" className="btn btn-ghost">Guardar borrador</button>
                <button id="btn-guardar-historia" type="submit" className="btn btn-primary btn-lg">
                  <Save size={18} className="mr-1" /> Guardar historia clínica
                </button>
              </div>
            </div>

          </div>
        </div>
      </form>
    </Layout>
  );
}

export default HistoriaClinica;
