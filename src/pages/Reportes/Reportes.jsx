import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FolderOpen,
  HeartPulse,
  RefreshCw,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
  Waves,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';

import VistaPreviaReporte from '../../components/Reportes/VistaPreviaReporte';
import { useAuth } from '../../context/AuthContext';
import * as reporteService from '../../services/reporteService';
import * as patientService from '../../services/patientService';
import * as userService from '../../services/userService';
import * as clinicalHistoryService from '../../services/clinicalHistoryService';
import * as dopplerReportService from '../../services/dopplerReportService';
import * as appointmentService from '../../services/appointmentService';
import './Reportes.css';

/**
 * Centro de reportes.
 *
 * Reúne los dos tipos de documento que emite el sistema, que se piden de forma
 * distinta y por eso salen en dos bloques separados:
 *
 * - Los **reportes de período** resumen lo que pasó entre dos fechas. Se piden
 *   con el rango de arriba, y el catálogo lo manda el servidor: qué reportes
 *   existen, qué filtros admite cada uno y cuáles puede ver este usuario.
 * - Los **informes de expediente** describen un registro concreto —esta
 *   consulta, este estudio—, así que antes de emitirlos hay que elegir cuál.
 *
 * Ninguno se descarga a ciegas: todo pasa por la misma vista previa que usan
 * Historia Clínica y Ecodöppler, y desde ahí sale el PDF o el Word.
 */

/* Icono de cada reporte. Vive aquí y no en el catálogo del servidor porque es
   decisión de presentación; un reporte nuevo sin icono declarado sale con el
   genérico en vez de romper la rejilla. */
const ICONOS = {
  'pacientes-atendidos': Users,
  'citas': CalendarDays,
  'productividad-medico': TrendingUp,
  'diagnosticos-ceap': Stethoscope,
  'sintomas-antecedentes': ClipboardList,
  'tratamientos-indicaciones': Syringe,
  'evolucion-seguimiento': HeartPulse,
  'estudios-ecodoppler': Activity,
};

/** Nombre legible de cada filtro, para las etiquetas de las tarjetas. */
const NOMBRE_FILTRO = {
  patient_id: 'Paciente',
  medico_id: 'Médico',
};

const hoy = () => new Date();

const aTexto = (fecha) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/** Atajos del rango. Es lo que se pide de verdad; escribir dos fechas a mano
    para «este mes» es trabajo que la pantalla puede ahorrarse. */
const ATAJOS = [
  {
    id: 'mes',
    etiqueta: 'Este mes',
    rango: () => {
      const ahora = hoy();
      return [
        aTexto(new Date(ahora.getFullYear(), ahora.getMonth(), 1)),
        aTexto(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
      ];
    },
  },
  {
    id: 'mes-anterior',
    etiqueta: 'Mes anterior',
    rango: () => {
      const ahora = hoy();
      return [
        aTexto(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)),
        aTexto(new Date(ahora.getFullYear(), ahora.getMonth(), 0)),
      ];
    },
  },
  {
    id: '30',
    etiqueta: 'Últimos 30 días',
    rango: () => {
      const ahora = hoy();
      const inicio = new Date(ahora);
      inicio.setDate(inicio.getDate() - 29);
      return [aTexto(inicio), aTexto(ahora)];
    },
  },
  {
    id: 'anio',
    etiqueta: 'Este año',
    rango: () => {
      const ahora = hoy();
      return [aTexto(new Date(ahora.getFullYear(), 0, 1)), aTexto(ahora)];
    },
  },
];

const rangoInicial = ATAJOS[0].rango();

const formatearFecha = (valor) => {
  if (!valor) return '—';

  const fecha = new Date(`${valor}T00:00:00`);

  return Number.isNaN(fecha.getTime())
    ? valor
    : fecha.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Reportes() {
  const { user } = useAuth();

  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [error, setError] = useState('');

  const [filtros, setFiltros] = useState({
    desde: rangoInicial[0],
    hasta: rangoInicial[1],
    patient_id: '',
    medico_id: '',
  });

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [partesVista, setPartesVista] = useState(null);
  const [descargando, setDescargando] = useState('');

  // Selector de expediente: 'historia' | 'doppler' | null
  const [selector, setSelector] = useState(null);
  const [pacienteSelector, setPacienteSelector] = useState('');
  const [registros, setRegistros] = useState({ consultas: [], estudios: [] });
  const [cargandoRegistros, setCargandoRegistros] = useState(false);

  /* ── Carga inicial ───────────────────────────────────────────────────── */

  useEffect(() => {
    let vigente = true;

    (async () => {
      const [reportes, listaPacientes, usuarios] = await Promise.all([
        reporteService.getCatalogoReportes(),
        patientService.getPatients({}),
        userService.getUsers(),
      ]);

      if (!vigente) return;

      if (reportes.success) {
        setCatalogo(reportes.data);
      } else {
        setError(reportes.message);
      }

      if (listaPacientes.success) {
        setPacientes(listaPacientes.data.map((p) => ({ value: String(p.id), label: p.nombre })));
      }

      if (usuarios.success) {
        setMedicos(
          (usuarios.data || [])
            .filter((u) => u.rol === 'medico')
            .map((u) => ({ value: String(u.id), label: u.name }))
        );
      }

      setCargandoCatalogo(false);
    })();

    return () => {
      vigente = false;
    };
  }, []);

  /* ── Resumen del período ─────────────────────────────────────────────────
   *
   * Son los mismos listados que ya sirven a las demás pantallas, contados. No
   * es un endpoint de estadísticas: la cifra que se enseña arriba tiene que
   * salir de los mismos registros que van a entrar en el PDF, o el reporte
   * contradiría a la pantalla desde la que se pidió.
   */
  const cargarResumen = useCallback(async () => {
    if (!filtros.desde || !filtros.hasta) return;

    setCargandoResumen(true);

    const rango = { from_date: filtros.desde, to_date: filtros.hasta };
    const porPaciente = filtros.patient_id ? { patient_id: filtros.patient_id } : {};

    const [consultas, citas, estudios] = await Promise.all([
      clinicalHistoryService.getClinicalHistories({ ...rango, ...porPaciente }),
      appointmentService.getAppointments({ ...rango, ...porPaciente }),
      dopplerReportService.getDopplerReports({ ...rango, ...porPaciente }),
    ]);

    const listaConsultas = consultas.success ? consultas.data : [];
    const listaCitas = citas.success ? citas.data : [];

    setResumen({
      consultas: listaConsultas.length,
      citas: listaCitas.length,
      estudios: estudios.success ? estudios.data.length : 0,
      pacientes: new Set(listaConsultas.map((c) => c.patient_id)).size,
      atendidas: listaCitas.filter((c) => c.estado === 'Completada').length,
    });

    setCargandoResumen(false);
  }, [filtros.desde, filtros.hasta, filtros.patient_id]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  /* ── Registros del selector de expediente ────────────────────────────── */

  useEffect(() => {
    if (!selector || !pacienteSelector) {
      setRegistros({ consultas: [], estudios: [] });
      return;
    }

    let vigente = true;
    setCargandoRegistros(true);

    (async () => {
      // Los estudios se piden siempre, también para el selector de consultas:
      // son los que dicen qué consulta puede llevar el Ecodöppler como anexo.
      const [consultas, estudios] = await Promise.all([
        clinicalHistoryService.getClinicalHistoriesByPatient(pacienteSelector),
        dopplerReportService.getDopplerReportsByPatient(pacienteSelector),
      ]);

      if (!vigente) return;

      setRegistros({
        consultas: consultas.success ? consultas.data : [],
        estudios: estudios.success ? estudios.data : [],
      });
      setCargandoRegistros(false);
    })();

    return () => {
      vigente = false;
    };
  }, [selector, pacienteSelector]);

  /* ── Acciones ────────────────────────────────────────────────────────── */

  const cambiarFiltro = (campo) => (valor) => setFiltros((previos) => ({ ...previos, [campo]: valor }));

  const aplicarAtajo = (atajo) => {
    const [desde, hasta] = atajo.rango();
    setFiltros((previos) => ({ ...previos, desde, hasta }));
  };

  const limpiarFiltros = () => {
    const [desde, hasta] = ATAJOS[0].rango();
    setFiltros({ desde, hasta, patient_id: '', medico_id: '' });
  };

  const abrirPeriodo = (reporte) => {
    setPartesVista(null);
    setVistaPrevia(reporteService.reportePeriodo(reporte, filtros));
  };

  const descargarPeriodo = async (reporte, formato) => {
    setDescargando(`${reporte.clave}-${formato}`);
    setError('');

    try {
      await reporteService.descargarReportePeriodo(reporte, filtros, formato);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setDescargando('');
    }
  };

  /** Partes que el informe de una consulta puede llevar hoy. */
  const partesDeLaConsulta = (consulta) => {
    const tieneMapeo = Boolean(consulta.mapeo_venoso_url || consulta.mapeo_venoso_datos?.objetos?.length);
    const tieneEstudio = registros.estudios.some((e) => e.clinical_history_id === consulta.id);

    return [
      'historia',
      ...(tieneMapeo ? ['mapeo'] : []),
      ...(tieneEstudio ? ['doppler'] : []),
    ];
  };

  const abrirInformeDeConsulta = (consulta) => {
    const partes = partesDeLaConsulta(consulta);

    setSelector(null);
    setPartesVista({
      disponibles: partes,
      construir: (seleccion) => reporteService.reporteHistoriaClinica(consulta.id, { partes: seleccion }),
    });
    setVistaPrevia(reporteService.reporteHistoriaClinica(consulta.id, { partes }));
  };

  const abrirInformeDeEstudio = (estudio) => {
    setSelector(null);
    setPartesVista(null);
    setVistaPrevia(reporteService.reporteEcodoppler(estudio.id));
  };

  const cerrarVista = () => {
    setVistaPrevia(null);
    setPartesVista(null);
  };

  /* ── Presentación ────────────────────────────────────────────────────── */

  const etiquetaPeriodo = useMemo(
    () => `${formatearFecha(filtros.desde)} — ${formatearFecha(filtros.hasta)}`,
    [filtros.desde, filtros.hasta]
  );

  const filtrosActivos = [
    filtros.patient_id && pacientes.find((p) => p.value === String(filtros.patient_id))?.label,
    filtros.medico_id && medicos.find((m) => m.value === String(filtros.medico_id))?.label,
  ].filter(Boolean);

  const registrosDelSelector = selector === 'historia' ? registros.consultas : registros.estudios;

  return (
    <Layout breadcrumb="Reportes">
      <div className="flat-page rp-page">
        {/* Encabezado */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Reportes</h1>
            <p className="page-subtitle">
              Documentos imprimibles del sistema: los que resumen un período y los que describen un expediente.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-2"
              onClick={cargarResumen}
              disabled={cargandoResumen}
            >
              <RefreshCw size={15} className={cargandoResumen ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="notice notice-danger">
            <span className="notice-body">
              <AlertCircle size={16} />
              {error}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError('')}>
              Cerrar
            </button>
          </div>
        )}

        {/* Parámetros comunes a todos los reportes de período */}
        <div className="panel rp-params">
          <div className="panel-head">
            <span className="panel-title">
              <SlidersHorizontal size={14} />
              Parámetros del reporte
            </span>
            <span className="panel-sub">{etiquetaPeriodo}</span>
          </div>

          <div className="panel-body">
            <div className="rp-filtros">
              <div className="hc-field">
                <label className="hc-field-label-sm">Desde</label>
                <DatePicker value={filtros.desde} onChange={cambiarFiltro('desde')} placeholder="Inicio del período" />
              </div>

              <div className="hc-field">
                <label className="hc-field-label-sm">Hasta</label>
                <DatePicker value={filtros.hasta} onChange={cambiarFiltro('hasta')} placeholder="Fin del período" />
              </div>

              <div className="hc-field">
                <label className="hc-field-label-sm">Paciente (opcional)</label>
                <Combobox
                  items={pacientes}
                  value={filtros.patient_id}
                  onChange={cambiarFiltro('patient_id')}
                  placeholder="Todos los pacientes"
                  searchPlaceholder="Buscar paciente…"
                  icon={<Users size={15} />}
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label-sm">Médico (opcional)</label>
                <Combobox
                  items={medicos}
                  value={filtros.medico_id}
                  onChange={cambiarFiltro('medico_id')}
                  placeholder="Todos los médicos"
                  searchPlaceholder="Buscar médico…"
                  icon={<Stethoscope size={15} />}
                />
              </div>
            </div>

            <div className="rp-atajos">
              <span className="flat-label">Rangos rápidos</span>
              {ATAJOS.map((atajo) => (
                <button
                  key={atajo.id}
                  type="button"
                  className="hc-chip"
                  onClick={() => aplicarAtajo(atajo)}
                >
                  {atajo.etiqueta}
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm rp-limpiar" onClick={limpiarFiltros}>
                Restablecer
              </button>
            </div>

            {/* Los filtros de paciente y médico solo recortan los reportes que
                los declaran; decirlo aquí evita que un total «que no cuadra» se
                lea como un error del reporte. */}
            {filtrosActivos.length > 0 && (
              <p className="rp-nota">
                Filtrando por <strong>{filtrosActivos.join(' · ')}</strong>. Cada reporte aplica solo los filtros que admite,
                señalados en su tarjeta.
              </p>
            )}
          </div>
        </div>

        {/* Lo que hay en el período elegido, contado sobre los mismos registros
            que entrarán en los documentos */}
        <div className="rp-resumen">
          {[
            { clave: 'consultas', etiqueta: 'Consultas', icono: ClipboardList },
            { clave: 'pacientes', etiqueta: 'Pacientes atendidos', icono: Users },
            { clave: 'citas', etiqueta: 'Citas agendadas', icono: CalendarDays },
            { clave: 'atendidas', etiqueta: 'Citas atendidas', icono: TrendingUp },
            { clave: 'estudios', etiqueta: 'Ecodöppler', icono: Activity },
          ].map(({ clave, etiqueta, icono: Icono }) => (
            <div className="rp-sum" key={clave}>
              <span className="rp-sum-icon"><Icono size={16} /></span>
              <span className="rp-sum-val">
                {cargandoResumen || !resumen ? '—' : resumen[clave]}
              </span>
              <span className="rp-sum-label">{etiqueta}</span>
            </div>
          ))}
        </div>

        {/* ── Reportes de período ───────────────────────────────────────── */}
        <div className="section-header rp-seccion">
          <span className="section-bar" />
          <span className="section-title">Reportes de período</span>
          <span className="rp-seccion-count">{catalogo.length} disponible(s)</span>
        </div>

        {cargandoCatalogo ? (
          <div className="rp-cargando">
            <RefreshCw size={18} className="animate-spin" />
            <span>Cargando el catálogo de reportes…</span>
          </div>
        ) : catalogo.length === 0 ? (
          <div className="empty-state py-8">
            <div className="empty-icon text-brand-text-light mb-2">
              <BarChart3 size={36} />
            </div>
            <p className="font-medium text-brand-text">No hay reportes disponibles para su rol</p>
            <p className="text-xs text-muted">Su usuario ({user?.rol}) no tiene reportes de período asignados.</p>
          </div>
        ) : (
          <div className="rp-grid">
            {catalogo.map((reporte) => {
              const Icono = ICONOS[reporte.clave] ?? BarChart3;

              return (
                <article className="rp-card" key={reporte.clave}>
                  <div className="rp-card-head">
                    <span className="rp-card-icon"><Icono size={17} /></span>
                    <h3 className="rp-card-title">{reporte.titulo}</h3>
                  </div>

                  <p className="rp-card-desc">{reporte.descripcion}</p>

                  <div className="rp-card-tags">
                    <span className="tag tag-info">Período</span>
                    {(reporte.filtros ?? []).map((filtro) => (
                      <span
                        key={filtro}
                        className={`tag ${filtros[filtro] ? 'tag-primary' : 'rp-tag-neutra'}`}
                        title={filtros[filtro] ? 'Filtro aplicado' : 'Filtro que este reporte admite'}
                      >
                        {NOMBRE_FILTRO[filtro] ?? filtro}
                      </span>
                    ))}
                  </div>

                  <div className="rp-card-acciones">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex items-center gap-1.5"
                      onClick={() => abrirPeriodo(reporte)}
                    >
                      <Eye size={14} /> Vista previa
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                      disabled={descargando !== ''}
                      onClick={() => descargarPeriodo(reporte, 'pdf')}
                    >
                      <Download size={14} />
                      {descargando === `${reporte.clave}-pdf` ? 'Generando…' : 'PDF'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Informes de expediente ────────────────────────────────────── */}
        <div className="section-header rp-seccion">
          <span className="section-bar" />
          <span className="section-title">Informes de expediente</span>
          <span className="rp-seccion-count">Requieren elegir el registro</span>
        </div>

        <div className="rp-grid">
          <article className="rp-card">
            <div className="rp-card-head">
              <span className="rp-card-icon"><FolderOpen size={17} /></span>
              <h3 className="rp-card-title">Historia clínica</h3>
            </div>
            <p className="rp-card-desc">
              Informe de una consulta. Puede llevar además el mapeo venoso y el Ecodöppler de esa misma visita,
              en un solo documento.
            </p>
            <div className="rp-card-tags">
              <span className="tag tag-info">Una consulta</span>
              <span className="tag rp-tag-neutra">PDF y Word</span>
            </div>
            <div className="rp-card-acciones">
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={() => { setSelector('historia'); setPacienteSelector(filtros.patient_id || ''); }}
              >
                <FileText size={14} /> Elegir consulta
              </button>
            </div>
          </article>

          <article className="rp-card">
            <div className="rp-card-head">
              <span className="rp-card-icon"><Waves size={17} /></span>
              <h3 className="rp-card-title">Reporte de Ecodöppler</h3>
            </div>
            <p className="rp-card-desc">
              Hallazgos de un estudio de Ecodöppler venoso: los dos miembros inferiores segmento por segmento y la
              conclusión.
            </p>
            <div className="rp-card-tags">
              <span className="tag tag-info">Un estudio</span>
              <span className="tag rp-tag-neutra">PDF y Word</span>
            </div>
            <div className="rp-card-acciones">
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={() => { setSelector('doppler'); setPacienteSelector(filtros.patient_id || ''); }}
              >
                <FileText size={14} /> Elegir estudio
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* ── Selector de expediente ───────────────────────────────────────── */}
      <Dialog open={selector !== null} onOpenChange={(abierto) => { if (!abierto) setSelector(null); }}>
        <DialogContent className="flat-page hc-page sm:max-w-xl rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <FileText className="text-brand-slate" size={18} />
              {selector === 'historia' ? 'Elegir la consulta a imprimir' : 'Elegir el estudio a imprimir'}
            </DialogTitle>
            <DialogDescription className="text-muted">
              Busque el paciente y elija el registro. El informe se abre en la vista previa antes de descargarse.
            </DialogDescription>
          </DialogHeader>

          <div className="hc-field">
            <label className="hc-field-label">Paciente</label>
            <Combobox
              items={pacientes}
              value={pacienteSelector}
              onChange={setPacienteSelector}
              placeholder="Seleccione un paciente…"
              searchPlaceholder="Buscar por nombre…"
              icon={<Users size={15} />}
            />
          </div>

          <div className="rp-lista">
            {!pacienteSelector ? (
              <div className="hc-empty">Elija un paciente para ver sus registros.</div>
            ) : cargandoRegistros ? (
              <div className="hc-empty flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Cargando registros…
              </div>
            ) : registrosDelSelector.length === 0 ? (
              <div className="hc-empty">
                {selector === 'historia'
                  ? 'Este paciente todavía no tiene consultas registradas.'
                  : 'Este paciente todavía no tiene estudios de Ecodöppler.'}
              </div>
            ) : selector === 'historia' ? (
              registrosDelSelector.map((consulta) => {
                const partes = partesDeLaConsulta(consulta);

                return (
                  <button
                    type="button"
                    key={consulta.id}
                    className="hc-pick"
                    onClick={() => abrirInformeDeConsulta(consulta)}
                  >
                    <span className="hc-pick-body">
                      <span className="hc-pick-name">
                        Consulta del {formatearFecha(consulta.fecha_consulta)}
                        {consulta.estado_registro === 'Borrador' && (
                          <span className="tag tag-warning">Borrador</span>
                        )}
                      </span>
                      <span className="hc-pick-meta">
                        <span>Expediente #{consulta.id}</span>
                        {consulta.ceap_c && <span>CEAP {consulta.ceap_c}</span>}
                        <span>
                          {partes.length > 1
                            ? `Incluye ${partes.slice(1).map((p) => (p === 'mapeo' ? 'mapeo venoso' : 'Ecodöppler')).join(' y ')}`
                            : 'Solo la consulta'}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              registrosDelSelector.map((estudio) => (
                <button
                  type="button"
                  key={estudio.id}
                  className="hc-pick"
                  onClick={() => abrirInformeDeEstudio(estudio)}
                >
                  <span className="hc-pick-body">
                    <span className="hc-pick-name">
                      Estudio del {formatearFecha(estudio.fecha_estudio)}
                      {estudio.estado_registro === 'Borrador' && (
                        <span className="tag tag-warning">Borrador</span>
                      )}
                    </span>
                    <span className="hc-pick-meta">
                      <span>Estudio #{estudio.id}</span>
                      <span>
                        {estudio.clinical_history_id
                          ? `Adjunto a la consulta #${estudio.clinical_history_id}`
                          : 'Sin consulta asociada'}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Único punto de emisión: el mismo visor que usan Historia Clínica y
          Ecodöppler, para que el documento se vea antes de entregarse. */}
      <VistaPreviaReporte reporte={vistaPrevia} onCerrar={cerrarVista} partes={partesVista} />
    </Layout>
  );
}

export default Reportes;
