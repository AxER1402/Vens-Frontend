import { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  Activity, ArrowLeft, Save, Check, Clock, ClipboardList, FileCheck, AlertCircle,
  User, RefreshCw, Lock, PenTool, Eye
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as patientService from '../../services/patientService';
import * as dopplerReportService from '../../services/dopplerReportService';
import VistaPreviaReporte from '../../components/Reportes/VistaPreviaReporte';
import { reporteEcodoppler } from '../../services/reporteService';

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

const SECTIONS = [
  { id: 'estudio', icon: <ClipboardList size={14} />, label: 'Datos del estudio' },
  { id: 'der', icon: <Activity size={14} />, label: 'Miembro inf. derecho' },
  { id: 'izq', icon: <Activity size={14} />, label: 'Miembro inf. izquierdo' },
  { id: 'conclusion', icon: <FileCheck size={14} />, label: 'Conclusión' },
];

const hoy = () => new Date().toISOString().split('T')[0];

/* Fecha (YYYY-MM-DD) en formato legible, sin desfase de zona horaria */
const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  if (!anio || !mes || !dia) return String(fecha);
  return new Date(Number(anio), Number(mes) - 1, Number(dia))
    .toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
};

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

/* Encabezado de la tabla de segmentos: las unidades viven aquí y no dentro de
   cada campo, que a este ancho de columna no daría abasto. */
function SegmentosHead() {
  return (
    <div className="dop-seg dop-seg-head">
      <span>Segmento</span>
      {dopplerReportService.MEDIDAS_SEGMENTO.map(medida => (
        <span key={medida.campo}>
          {medida.unidad ? `${medida.label} (${medida.unidad})` : medida.label}
        </span>
      ))}
    </div>
  );
}

/* Fila de un segmento del sistema superficial. Los tres primeros llevan nombre
   fijo; en los dos últimos el médico escribe el vaso que haya evaluado de más. */
function Segmento({ indice, segmento, onChange }) {
  const fijo = indice < dopplerReportService.SEGMENTOS_FIJOS.length;
  const referencia = segmento.nombre || `segmento ${indice + 1}`;

  return (
    <div className="dop-seg">
      {fijo ? (
        <span className="dop-seg-nombre">{segmento.nombre}</span>
      ) : (
        <input
          className="form-control"
          placeholder="Otro segmento…"
          maxLength={60}
          value={segmento.nombre}
          onChange={e => onChange(indice, 'nombre', e.target.value)}
          aria-label={`Nombre del segmento ${indice + 1}`}
        />
      )}

      {dopplerReportService.MEDIDAS_SEGMENTO.map(medida => (
        <input
          key={medida.campo}
          className="form-control"
          inputMode={medida.texto ? undefined : 'decimal'}
          maxLength={medida.texto ? 255 : undefined}
          value={segmento[medida.campo]}
          onChange={e => onChange(indice, medida.campo, e.target.value)}
          aria-label={`${medida.label} de ${referencia}`}
        />
      ))}
    </div>
  );
}

function ReporteDoppler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [form, setForm] = useState(dopplerReportService.createEmptyForm);
  const [active, setActive] = useState('estudio');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);

  /* El expediente llega desde la historia clínica: el estudio pertenece al
     paciente y a la consulta que ya estaban abiertos, sin volver a elegirlos. */
  const patientId = searchParams.get('patientId');
  const historiaId = searchParams.get('historiaId');

  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(!!patientId);
  const [patientError, setPatientError] = useState('');

  /* Reporte cargado. `reporteId` en null significa que aún no existe en el
     backend, así que el siguiente guardado lo registra en lugar de editarlo.
     Un estudio ya finalizado se abre bloqueado. */
  const [reporteId, setReporteId] = useState(null);
  const [estadoReporte, setEstadoReporte] = useState(null);
  const [soloLectura, setSoloLectura] = useState(false);
  const [loadingReporte, setLoadingReporte] = useState(!!historiaId);
  const [avisoReporte, setAvisoReporte] = useState('');

  // Informe abierto en la vista previa, o null si no hay ninguna
  const [vistaPrevia, setVistaPrevia] = useState(null);

  // Registrar y editar está restringido a Administrador y Médico (igual que el API)
  const canEdit = ['administrador', 'medico'].includes(user?.rol);

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

  // Retomar el estudio ya adjunto a la consulta, si existe
  useEffect(() => {
    if (!historiaId) {
      setLoadingReporte(false);
      setAvisoReporte('');
      return;
    }

    let isMounted = true;
    const loadReporte = async () => {
      setLoadingReporte(true);
      const res = await dopplerReportService.getDopplerReportsByClinicalHistory(historiaId);
      if (!isMounted) return;

      if (!res.success) {
        setAvisoReporte(res.message);
        setLoadingReporte(false);
        return;
      }

      // El backend los devuelve del más reciente al más antiguo
      const reporte = res.data[0];

      if (reporte) {
        setForm(dopplerReportService.mapDopplerReportToForm(reporte));
        setReporteId(reporte.id);
        setEstadoReporte(reporte.estado_registro);
        setSoloLectura(reporte.estado_registro === 'Finalizada');
        setSaved(reporte.estado_registro === 'Finalizada');
        setAvisoReporte(
          reporte.estado_registro === 'Finalizada'
            ? `Estudio del ${formatearFecha(reporte.fecha_estudio)} finalizado. Ábralo en modo edición para corregirlo.`
            : `Retomando el borrador del ${formatearFecha(reporte.fecha_estudio)}.`
        );
      } else {
        setAvisoReporte('Esta consulta todavía no tiene un estudio de Ecodöppler.');
      }

      setLoadingReporte(false);
    };

    loadReporte();
    return () => { isMounted = false; };
  }, [historiaId]);

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

  /* Un segmento se edita por posición: es lo que lo identifica dentro del lado. */
  const cambiarSegmento = (lado, indice, campo, valor) => {
    const clave = dopplerReportService.campoForm(lado, 'segmentos');

    setForm(p => ({
      ...p,
      [clave]: p[clave].map((s, i) => (i === indice ? { ...s, [campo]: valor } : s)),
    }));
    setSaved(false);
    setSaveMessage('');
  };

  const isFilled = (id) => {
    if (id === 'estudio') return !!patient;
    if (id === 'conclusion') return !!form.conclusion.trim();
    // Un miembro cuenta como informado cuando algún segmento ya tiene medidas
    const segmentos = form[dopplerReportService.campoForm(id, 'segmentos')] || [];

    return segmentos.some(segmento =>
      dopplerReportService.MEDIDAS_SEGMENTO.some(
        medida => String(segmento[medida.campo] ?? '').trim() !== ''
      )
    );
  };

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Persistir el estudio. La primera vez se registra (POST) y a partir de ahí se
   * actualiza el mismo reporte (PUT), tanto en borrador como al finalizarlo.
   */
  const guardarReporte = async (estadoRegistro) => {
    if (!patientId) {
      setSaved(false);
      setSaveMessage('Abra el reporte desde la historia clínica de un paciente para poder guardarlo.');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    const res = reporteId
      ? await dopplerReportService.updateDopplerReport(reporteId, form, patientId, historiaId, estadoRegistro)
      : await dopplerReportService.createDopplerReport(form, patientId, historiaId, estadoRegistro);

    if (!res.success) {
      // Se muestran los mensajes de validación reales que devuelve el backend
      const detalle = res.errors ? Object.values(res.errors).flat().slice(0, 3).join(' ') : '';
      setSaved(false);
      setSaveMessage([res.message, detalle].filter(Boolean).join(' '));
      setSaving(false);
      return;
    }

    setReporteId(res.data?.id || reporteId);
    setEstadoReporte(res.data?.estado_registro || estadoRegistro);

    // Al finalizar, el estudio queda cerrado: para corregirlo hay que reabrirlo
    if (estadoRegistro === 'Finalizada') {
      setSoloLectura(true);
      setAvisoReporte(`Estudio del ${formatearFecha(res.data?.fecha_estudio || form.fecha)} finalizado.`);
    }

    setSaved(true);
    setSaveMessage(res.message);
    setSaving(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    guardarReporte('Finalizada');
  };

  const bloqueado = soloLectura || !canEdit || loadingReporte;

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
            {saved ? (estadoReporte === 'Borrador' ? 'Borrador guardado' : 'Guardado') : 'Sin guardar'}
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

              <fieldset className="hc-fieldset" disabled={bloqueado}>

                {/* Datos del estudio */}
                <Section id="estudio" icon={<ClipboardList size={14} />} title="Datos del Estudio">
                  <div className="hc-grid-2">
                    <InputField label="Fecha del estudio">
                      {/* El API no acepta estudios con fecha futura */}
                      <input
                        name="fecha"
                        type="date"
                        className="form-control"
                        max={hoy()}
                        value={form.fecha}
                        onChange={ch}
                      />
                    </InputField>
                    <div className="hc-field">
                      <span className="hc-field-label">Consulta asociada</span>
                      <p className="hc-field-hint">
                        {historiaId
                          ? `Consulta #${historiaId} del expediente EXP-${patientId}.`
                          : 'Sin consulta asociada: el estudio se guarda en el expediente del paciente.'}
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
                      <div className="dop-segmentos">
                        <SegmentosHead />
                        {form[dopplerReportService.campoForm(lado.id, 'segmentos')].map((segmento, indice) => (
                          <Segmento
                            key={indice}
                            indice={indice}
                            segmento={segmento}
                            onChange={(i, campo, valor) => cambiarSegmento(lado.id, i, campo, valor)}
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
                    La conclusión es obligatoria para finalizar el estudio: es lo que se
                    adjunta a la consulta del expediente.
                  </p>
                </Section>

              </fieldset>

              {/* Barra de guardado */}
              <div className="hc-save-bar">
                <div className={`hc-save-info${saved ? ' saved' : ''}`}>
                  {saved ? (
                    <><Check size={14} /> {saveMessage || avisoReporte}</>
                  ) : saveMessage ? (
                    <><AlertCircle size={14} /> {saveMessage}</>
                  ) : loadingReporte ? (
                    <><RefreshCw size={14} className="animate-spin" /> Buscando el estudio de esta consulta…</>
                  ) : !canEdit ? (
                    <><Lock size={14} /> Solo Administrador o Médico pueden registrar el estudio</>
                  ) : soloLectura ? (
                    <><Lock size={14} /> {avisoReporte || 'Estudio finalizado en modo lectura'}</>
                  ) : (
                    <><Clock size={14} /> {avisoReporte || (reporteId ? `Editando el estudio #${reporteId}` : 'Estudio nuevo sin guardar')}</>
                  )}
                </div>
                <div className="hc-save-actions">
                  {/* Fuera de la bifurcación: un estudio finalizado es justo
                      cuando se quiere imprimir. El informe se arma con lo
                      guardado, así que necesita el estudio ya registrado. */}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!reporteId}
                    title={reporteId
                      ? 'Ver el informe antes de descargarlo'
                      : 'Guarde el estudio para poder emitir su informe'}
                    onClick={() => setVistaPrevia({
                      ...reporteEcodoppler(reporteId),
                      aviso: saved ? null : 'Esta vista muestra la última versión guardada del estudio. Los cambios que no haya guardado todavía no aparecen aquí.',
                    })}
                  >
                    <Eye size={14} /> Vista previa
                  </button>

                  {soloLectura && canEdit ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setSoloLectura(false);
                        setSaved(false);
                        setAvisoReporte('Modo edición: los cambios se guardarán sobre este estudio ya finalizado.');
                      }}
                    >
                      <PenTool size={14} /> Editar estudio
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-ghost" onClick={volverAHistoria}>
                        Cancelar
                      </button>
                      {/* Un estudio ya finalizado no puede volver a borrador */}
                      {estadoReporte !== 'Finalizada' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={saving || bloqueado || !patientId}
                          onClick={() => guardarReporte('Borrador')}
                        >
                          Guardar borrador
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving || bloqueado || !patientId}
                      >
                        <Save size={14} /> {saving ? 'Guardando…' : `${estadoReporte === 'Finalizada' ? 'Actualizar' : 'Finalizar'} estudio`}
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </form>

        <VistaPreviaReporte reporte={vistaPrevia} onCerrar={() => setVistaPrevia(null)} />
      </div>
    </Layout>
  );
}

export default ReporteDoppler;
