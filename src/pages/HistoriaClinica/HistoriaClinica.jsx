import { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  User, Folder, MessageSquare, Search, Stethoscope, CheckCircle, Pill, Clock,
  Save, Activity, PenTool, Check, AlertCircle, Plus, RefreshCw, Lock, FileText
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as patientService from '../../services/patientService';
import * as clinicalHistoryService from '../../services/clinicalHistoryService';
import * as dopplerReportService from '../../services/dopplerReportService';
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

/* Fecha de consulta (YYYY-MM-DD) en formato legible, sin desfase de zona horaria */
const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  if (!anio || !mes || !dia) return String(fecha);
  return new Date(Number(anio), Number(mes) - 1, Number(dia))
    .toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* Resumen corto de una consulta para el listado del expediente */
const resumirConsulta = (historia) => {
  const ceap = historia.selecciones?.ceap_diagnostico || [];
  if (ceap.length > 0) return ceap.join(', ');
  return historia.consulta_por || 'Sin diagnóstico registrado';
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
  const [saving, setSaving] = useState(false);

  // Consultas del expediente: un paciente acumula una historia por visita
  const [historias, setHistorias] = useState([]);
  const [loadingHistorias, setLoadingHistorias] = useState(false);
  const [historiasError, setHistoriasError] = useState('');
  const [avisoConsulta, setAvisoConsulta] = useState('');

  // Consulta abierta en el formulario. `historiaId` en null significa que aún no
  // se ha persistido, así que el siguiente guardado la registra en lugar de
  // actualizarla. Una consulta ya finalizada se abre bloqueada.
  const [historiaId, setHistoriaId] = useState(null);
  const [estadoHistoria, setEstadoHistoria] = useState(null);
  const [soloLectura, setSoloLectura] = useState(false);

  // Estudio de Ecodöppler adjunto a la consulta abierta. Solo se consulta para
  // saber si ya existe: así el expediente ofrece verlo en lugar de llenarlo.
  const [reporteDoppler, setReporteDoppler] = useState(null);
  const [loadingDoppler, setLoadingDoppler] = useState(false);

  // Mapeo venoso de la consulta abierta. Igual que con el Ecodöppler, aquí solo
  // se consulta si ya existe: dibujarlo es tarea del taller de /mapeo-venoso.
  const [mapeoInfo, setMapeoInfo] = useState(null);

  // Read patientId query param
  const urlPatientId = searchParams.get('patientId') || searchParams.get('id');

  /**
   * Consulta pedida por la URL (?historiaId=). Se guarda en una referencia y se
   * consume una sola vez: así el enlace se puede compartir sin que reabrir la
   * misma consulta pise lo que el médico esté editando después.
   */
  const historiaSolicitadaRef = useRef(searchParams.get('historiaId'));

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

    // Al cambiar de expediente nunca se debe arrastrar la consulta del paciente
    // anterior. El efecto que carga las consultas decide cuál abrir.
    setHistorias([]);
    setHistoriasError('');
    historiaSolicitadaRef.current = null;

    if (id) {
      setSearchParams({ patientId: id });
    } else {
      setSearchParams({});
      limpiarConsulta();
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

  const [form, setForm] = useState(clinicalHistoryService.createEmptyForm);

  // Cualquier edición deja la historia como "sin guardar" y limpia el aviso previo
  const marcarModificado = () => {
    setSaved(false);
    setSaveMessage('');
  };

  const ch = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    marcarModificado();
  };
  const toggleArr = (key, val) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val]
    }));
    marcarModificado();
  };

  /* ── Consultas del expediente ─────────────────────────────────────────────
   * Cada historia clínica es una consulta fechada. Al entrar al expediente se
   * reanuda el borrador pendiente si existe; si todas están finalizadas se
   * prepara una consulta nueva con los antecedentes ya conocidos del paciente.
   */

  /** Dejar el formulario sin ninguna consulta cargada (expediente desvinculado). */
  const limpiarConsulta = () => {
    setForm(clinicalHistoryService.createEmptyForm());
    setHistoriaId(null);
    setEstadoHistoria(null);
    setSoloLectura(false);
    setMapeoInfo(null);
    setAvisoConsulta('');
    setSaved(false);
    setSaveMessage('');
  };

  /** Cargar una consulta existente. Las finalizadas se abren bloqueadas. */
  const abrirConsulta = (historia, patientId = selectedPatientId) => {
    setForm(clinicalHistoryService.mapClinicalHistoryToForm(historia));
    setHistoriaId(historia.id);
    setEstadoHistoria(historia.estado_registro);
    setSoloLectura(historia.estado_registro === 'Finalizada');
    setMapeoInfo(clinicalHistoryService.mapClinicalHistoryToMapeo(historia));
    setAvisoConsulta(
      historia.estado_registro === 'Finalizada'
        ? `Consulta del ${formatearFecha(historia.fecha_consulta)} finalizada. Ábrala en modo edición para corregirla.`
        : `Retomando el borrador del ${formatearFecha(historia.fecha_consulta)}.`
    );
    setSaved(historia.estado_registro === 'Finalizada');
    setSaveMessage('');
    setActive('interrogatorio');

    if (patientId) {
      setSearchParams({ patientId: String(patientId), historiaId: String(historia.id) });
    }
  };

  /** Empezar una consulta nueva heredando los antecedentes de la más reciente. */
  const iniciarConsultaNueva = (previa = null, patientId = selectedPatientId) => {
    setForm(clinicalHistoryService.buildFormForNewConsulta(previa));
    setHistoriaId(null);
    setEstadoHistoria(null);
    setSoloLectura(false);
    setMapeoImagen(null);
    setMapeoGuardadoUrl(null);
    setAvisoConsulta(
      previa
        ? `Consulta nueva. Se copiaron los antecedentes de la consulta del ${formatearFecha(previa.fecha_consulta)}; verifíquelos antes de guardar.`
        : 'Primera consulta de este expediente.'
    );
    setSaved(false);
    setSaveMessage('');
    setActive('interrogatorio');

    if (patientId) {
      setSearchParams({ patientId: String(patientId) });
    }
  };

  // Cargar las consultas del expediente al seleccionar un paciente
  useEffect(() => {
    if (!selectedPatientId) return;

    let isMounted = true;

    const loadHistorias = async () => {
      setLoadingHistorias(true);
      setHistoriasError('');

      const res = await clinicalHistoryService.getClinicalHistoriesByPatient(selectedPatientId);
      if (!isMounted) return;

      if (!res.success) {
        setHistorias([]);
        setHistoriasError(res.message || 'No se pudo cargar el historial de consultas.');
        setLoadingHistorias(false);
        return;
      }

      // El backend las devuelve de la más reciente a la más antigua
      const lista = res.data;
      setHistorias(lista);

      // La consulta pedida por la URL manda; si no, se reanuda el borrador
      const solicitadaId = historiaSolicitadaRef.current;
      historiaSolicitadaRef.current = null;

      const solicitada = solicitadaId
        ? lista.find(h => String(h.id) === String(solicitadaId))
        : null;
      const borrador = lista.find(h => h.estado_registro === 'Borrador');

      if (solicitada) {
        abrirConsulta(solicitada, selectedPatientId);
      } else if (borrador) {
        abrirConsulta(borrador, selectedPatientId);
      } else {
        iniciarConsultaNueva(lista[0] || null, selectedPatientId);
      }

      setLoadingHistorias(false);
    };

    loadHistorias();
    return () => { isMounted = false; };
    // Las funciones de apertura solo dependen del paciente, que ya está en la lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  // Buscar el estudio de Ecodöppler de la consulta abierta. Una consulta que
  // todavía no se ha guardado no puede tener estudio adjunto.
  useEffect(() => {
    if (!historiaId) {
      setReporteDoppler(null);
      setLoadingDoppler(false);
      return;
    }

    let isMounted = true;
    const loadReporteDoppler = async () => {
      setLoadingDoppler(true);
      const res = await dopplerReportService.getDopplerReportsByClinicalHistory(historiaId);
      if (!isMounted) return;

      // El backend los devuelve del más reciente al más antiguo
      setReporteDoppler(res.success ? (res.data[0] || null) : null);
      setLoadingDoppler(false);
    };

    loadReporteDoppler();
    return () => { isMounted = false; };
  }, [historiaId]);

  /** Releer las consultas tras guardar, para que el listado quede al día. */
  const refrescarHistorias = async () => {
    const res = await clinicalHistoryService.getClinicalHistoriesByPatient(selectedPatientId);
    if (res.success) setHistorias(res.data);
  };

  /* Mapeo venoso de la consulta: puede venir como documento vectorial (el
     editor actual) o solo como imagen, en consultas anteriores a ese editor. */
  const elementosMapeo = mapeoInfo?.datos?.objetos?.length || 0;
  const tieneMapeo = !!(mapeoInfo?.url || elementosMapeo > 0);

  const isFilled = (id) => {
    if (id === 'interrogatorio') return !!form.consultaPor;
    if (id === 'antecedentes') return true;
    if (id === 'examen') return !!form.ta;
    if (id === 'diagnostico') return form.ceapDiagnostico.length > 0;
    if (id === 'tratamiento') return form.txZonas.length > 0;
    if (id === 'evolucion') return !!form.estado;
    if (id === 'doppler') return !!reporteDoppler;
    if (id === 'mapeo') return tieneMapeo;
    return false;
  };

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Persistir la historia clínica. La primera vez se registra (POST) y a partir
   * de ahí se actualiza la misma historia (PUT), tanto en borrador como al
   * finalizarla. El mapeo venoso viaja aparte por ser un archivo.
   */
  const guardarHistoria = async (estadoRegistro) => {
    if (!selectedPatientId) {
      setSaved(false);
      setSaveMessage('Seleccione un paciente antes de guardar la historia clínica.');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    const res = historiaId
      ? await clinicalHistoryService.updateClinicalHistory(historiaId, form, selectedPatientId, estadoRegistro)
      : await clinicalHistoryService.createClinicalHistory(form, selectedPatientId, estadoRegistro);

    if (!res.success) {
      // Se muestran los mensajes de validación reales que devuelve el backend
      const detalle = res.errors ? Object.values(res.errors).flat().slice(0, 3).join(' ') : '';
      setSaved(false);
      setSaveMessage([res.message, detalle].filter(Boolean).join(' '));
      setSaving(false);
      return;
    }

    const id = res.data?.id || historiaId;
    setHistoriaId(id);
    setEstadoHistoria(res.data?.estado_registro || estadoRegistro);

    const mensaje = res.message;

    // El mapeo venoso ya no viaja con la historia: se guarda desde su propio
    // taller, que es donde el médico lo dibuja.
    if (res.data) setMapeoInfo(clinicalHistoryService.mapClinicalHistoryToMapeo(res.data));

    // Al finalizar, la consulta queda cerrada: para corregirla hay que
    // reabrirla explícitamente en modo edición.
    if (estadoRegistro === 'Finalizada') {
      setSoloLectura(true);
      setAvisoConsulta(`Consulta del ${formatearFecha(res.data?.fecha_consulta)} finalizada.`);
    }

    if (id) {
      setSearchParams({ patientId: String(selectedPatientId), historiaId: String(id) });
    }

    await refrescarHistorias();

    setSaved(true);
    setSaveMessage(mensaje);
    setSaving(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    guardarHistoria('Finalizada');
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

              {/* Consultas del expediente */}
              {patient && (
                <div className="hc-consultas">
                  <div className="hc-consultas-head">
                    <FileText size={14} />
                    <span className="hc-consultas-title">Consultas del expediente</span>
                    <span className="hc-consultas-count">
                      {loadingHistorias ? 'Cargando…' : `${historias.length} registrada${historias.length === 1 ? '' : 's'}`}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={loadingHistorias}
                      onClick={() => iniciarConsultaNueva(historias[0] || null)}
                    >
                      <Plus size={14} /> Nueva consulta
                    </button>
                  </div>

                  {historiasError ? (
                    <div className="hc-notice"><AlertCircle size={14} /> {historiasError}</div>
                  ) : (
                    <div className="hc-consultas-list">
                      {/* La consulta en curso aún no existe en el backend */}
                      {!historiaId && (
                        <div className="hc-consulta on">
                          <span className="hc-consulta-fecha">Hoy</span>
                          <span className="hc-consulta-resumen">Consulta nueva sin guardar</span>
                          <span className="tag tag-info">En curso</span>
                        </div>
                      )}

                      {historias.map((h) => {
                        const esActual = String(h.id) === String(historiaId);
                        return (
                          <button
                            type="button"
                            key={h.id}
                            className={`hc-consulta${esActual ? ' on' : ''}`}
                            onClick={() => abrirConsulta(h)}
                          >
                            <span className="hc-consulta-fecha">{formatearFecha(h.fecha_consulta)}</span>
                            <span className="hc-consulta-resumen">{resumirConsulta(h)}</span>
                            <span className={`tag ${h.estado_registro === 'Borrador' ? 'tag-warning' : 'tag-success'}`}>
                              {h.estado_registro}
                            </span>
                          </button>
                        );
                      })}

                      {!loadingHistorias && historias.length === 0 && (
                        <div className="hc-empty">Este expediente todavía no tiene consultas registradas.</div>
                      )}
                    </div>
                  )}

                  {avisoConsulta && (
                    <div className="hc-consultas-aviso">
                      {soloLectura ? <Lock size={13} /> : <AlertCircle size={13} />} {avisoConsulta}
                    </div>
                  )}
                </div>
              )}

              {/* Secciones clínicas: se bloquean cuando la consulta está finalizada */}
              <fieldset className="hc-fieldset" disabled={soloLectura}>

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
                    {['MID', 'MII', 'BILATERAL'].map(o => (
                      <ChipRadio key={o} name="ubicacion" value={o} current={form.ubicacion} onChange={ch} grow />
                    ))}
                  </div>
                </Field>
              </Section>

              {/* 4. Diagnóstico CEAP */}
              <Section id="diagnostico" icon={<CheckCircle size={14} />} title="Diagnóstico (Clasificación CEAP)">
                <div className="hc-grid-2">
                  <div className="hc-opts">
                    {['Primaria', 'Secundaria', 'Superficial', 'Profunda'].map(o => (
                      <OptCheck key={o} value={o} list={form.ceapDiagnostico} onToggle={v => toggleArr('ceapDiagnostico', v)} />
                    ))}
                  </div>

                  <div className="hc-opts">
                    {['Perforantes', 'Mixtas', 'Reflujo', 'Obstrucción'].map(o => (
                      <OptCheck key={o} value={o} list={form.ceapDiagnostico} onToggle={v => toggleArr('ceapDiagnostico', v)} />
                    ))}
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

                <Field label="Indicaciones">
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

                <Field label="Observaciones">
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

              </fieldset>

              {/* Las dos secciones siguientes no son campos del formulario sino
                  accesos a sus propios módulos, así que quedan fuera del
                  fieldset: en una consulta finalizada el estudio y el mapeo
                  deben poder consultarse, no solo editarse. */}

              {/* 7. Informe Doppler */}
              <Section id="doppler" icon={<Activity size={14} />} title="Ecodöppler Venoso Miembros Inferiores">
                <div className="hc-placeholder">
                  <p className="hc-field-hint">
                    El informe Ecodöppler se llena en un formulario independiente para su mejor administración.
                  </p>

                  {/* Estado del estudio: un reporte finalizado se abre en modo
                      lectura, así que consultarlo no obliga a editarlo. */}
                  {loadingDoppler ? (
                    <span className="hc-field-hint">Buscando el estudio de esta consulta…</span>
                  ) : reporteDoppler ? (
                    <span className="hc-patient-meta">
                      <span>Estudio del {formatearFecha(reporteDoppler.fecha_estudio)}</span>
                      <span className={`tag ${reporteDoppler.estado_registro === 'Borrador' ? 'tag-warning' : 'tag-success'}`}>
                        {reporteDoppler.estado_registro}
                      </span>
                    </span>
                  ) : historiaId ? (
                    <span className="hc-field-hint">Esta consulta todavía no tiene un estudio registrado.</span>
                  ) : null}

                  {/* El expediente y la consulta viajan en la URL: el reporte se abre
                      ya vinculado y al volver se retoma esta misma consulta. */}
                  <button
                    type="button"
                    className={`btn ${reporteDoppler ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!selectedPatientId}
                    onClick={() => navigate(`/reporte-doppler?${new URLSearchParams({
                      patientId: String(selectedPatientId),
                      ...(historiaId ? { historiaId: String(historiaId) } : {})
                    })}`)}
                  >
                    {reporteDoppler ? <FileText size={14} /> : <Activity size={14} />}
                    {reporteDoppler ? 'Ver reporte Ecodöppler' : 'Registrar reporte Ecodöppler'}
                  </button>
                  {!selectedPatientId && (
                    <span className="hc-notice">
                      <AlertCircle size={14} /> Seleccione un paciente para abrir su reporte Ecodöppler.
                    </span>
                  )}
                </div>
              </Section>

              {/* 8. Mapeo venoso */}
              <Section id="mapeo" icon={<PenTool size={14} />} title="Mapeo Venoso Superficial">
                <div className="hc-placeholder">
                  <p className="hc-field-hint">
                    El mapeo se dibuja en un taller aparte, sobre la plantilla de las seis vistas
                    de miembro inferior y con opción de pantalla completa.
                  </p>

                  {/* Estado del mapeo: si ya existe, se ofrece verlo en lugar de dibujarlo */}
                  {tieneMapeo ? (
                    <span className="hc-patient-meta">
                      <span>Mapeo del {formatearFecha(mapeoInfo.actualizado)}</span>
                      <span className="tag tag-success">
                        {elementosMapeo > 0
                          ? `${elementosMapeo} elemento${elementosMapeo === 1 ? '' : 's'}`
                          : 'Imagen archivada'}
                      </span>
                    </span>
                  ) : historiaId ? (
                    <span className="hc-field-hint">Esta consulta todavía no tiene un mapeo registrado.</span>
                  ) : null}

                  {/* El expediente y la consulta viajan en la URL, igual que en el Ecodöppler */}
                  <button
                    type="button"
                    className={`btn ${tieneMapeo ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!selectedPatientId}
                    onClick={() => navigate(`/mapeo-venoso?${new URLSearchParams({
                      patientId: String(selectedPatientId),
                      ...(historiaId ? { historiaId: String(historiaId) } : {})
                    })}`)}
                  >
                    <PenTool size={14} />
                    {tieneMapeo ? 'Ver mapeo venoso' : 'Registrar mapeo venoso'}
                  </button>

                  {!selectedPatientId && (
                    <span className="hc-notice">
                      <AlertCircle size={14} /> Seleccione un paciente para abrir su mapeo venoso.
                    </span>
                  )}
                  {selectedPatientId && !historiaId && (
                    <span className="hc-notice">
                      <AlertCircle size={14} /> Guarde primero la consulta: el mapeo se archiva dentro de ella.
                    </span>
                  )}
                </div>
              </Section>

              {/* Barra de guardado */}
              <div className="hc-save-bar">
                <div className={`hc-save-info${saved ? ' saved' : ''}`}>
                  {saved ? (
                    <><Check size={14} /> {saveMessage || 'Historia guardada correctamente'}</>
                  ) : saveMessage ? (
                    <><AlertCircle size={14} /> {saveMessage}</>
                  ) : soloLectura ? (
                    <><Lock size={14} /> Consulta finalizada en modo lectura</>
                  ) : (
                    <><Clock size={14} /> {historiaId ? `Editando la consulta #${historiaId}` : 'Consulta nueva sin guardar'}</>
                  )}
                </div>
                <div className="hc-save-actions">
                  {soloLectura ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setSoloLectura(false);
                        setSaved(false);
                        setAvisoConsulta('Modo edición: los cambios se guardarán sobre esta consulta ya finalizada.');
                      }}
                    >
                      <PenTool size={14} /> Editar consulta
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-ghost">Vista previa</button>
                      {/* Una consulta ya finalizada no puede volver a borrador */}
                      {estadoHistoria !== 'Finalizada' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={saving || !selectedPatientId}
                          onClick={() => guardarHistoria('Borrador')}
                        >
                          Guardar borrador
                        </button>
                      )}
                      <button
                        id="btn-guardar-historia"
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving || !selectedPatientId}
                      >
                        <Save size={14} /> {saving ? 'Guardando…' : `${estadoHistoria === 'Finalizada' ? 'Actualizar' : 'Finalizar'} historia clínica`}
                      </button>
                    </>
                  )}
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
