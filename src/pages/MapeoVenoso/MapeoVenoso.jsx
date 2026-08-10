import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, User, RefreshCw, AlertCircle, Check, Save, Lock, PenTool,
  Undo2, Redo2, Trash2, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, Scan,
} from 'lucide-react';

import Layout from '../../components/Layout/Layout';
import MapeoVenosoEditor from '../../components/MapeoVenoso/MapeoVenosoEditor';
import BarraHerramientas from '../../components/MapeoVenoso/BarraHerramientas';
import PanelAnotaciones from '../../components/MapeoVenoso/PanelAnotaciones';
import DialogoAnotacion from '../../components/MapeoVenoso/DialogoAnotacion';
import { useHistorial } from '../../components/MapeoVenoso/useHistorial';
import { descargarPng, exportarPng } from '../../components/MapeoVenoso/exportarPng';
import {
  HERRAMIENTAS, HALLAZGO_TRAZO_INICIAL, HALLAZGO_MARCADOR_INICIAL,
} from '../../components/MapeoVenoso/hallazgos';
import {
  ENCUADRE_COMPLETO, PLANTILLA_ANCHO, encuadreMiembro, etiquetaZona, zonaDe, MIEMBROS,
} from '../../components/MapeoVenoso/zonas';
import {
  agregar, eliminar as quitar, mover, actualizar,
  crearAnotacion, crearTexto, crearDocumento, leerDocumento,
  aVistaX, aVistaY, aNormX, aNormY, MAX_OBJETOS,
} from '../../components/MapeoVenoso/objetos';

import * as patientService from '../../services/patientService';
import * as clinicalHistoryService from '../../services/clinicalHistoryService';
import { useAuth } from '../../context/AuthContext';

const tagClass = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info',
};

/* Fecha (YYYY-MM-DD) en formato legible, sin desfase de zona horaria */
const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  if (!anio || !mes || !dia) return String(fecha);
  return new Date(Number(anio), Number(mes) - 1, Number(dia))
    .toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const esEditable = (destino) =>
  destino instanceof HTMLElement &&
  (destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName));

const ESTILO_INICIAL = {
  herramienta: 'trazo',
  hallazgoTrazo: HALLAZGO_TRAZO_INICIAL,
  hallazgoMarcador: HALLAZGO_MARCADOR_INICIAL,
  color: null,
  grosor: 3,
};

function MapeoVenoso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  /* El expediente llega desde la historia clínica: el mapeo pertenece al
     paciente y a la consulta que ya estaban abiertos. */
  const patientId = searchParams.get('patientId');
  const historiaId = searchParams.get('historiaId');
  const debugZonas = searchParams.get('debugZonas') === '1';

  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(!!patientId);
  const [patientError, setPatientError] = useState('');

  const [historia, setHistoria] = useState(null);
  const [loadingHistoria, setLoadingHistoria] = useState(!!historiaId);
  const [aviso, setAviso] = useState('');
  const [mapeoUrl, setMapeoUrl] = useState(null);

  const [soloLectura, setSoloLectura] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [estilo, setEstilo] = useState(ESTILO_INICIAL);
  const [seleccion, setSeleccion] = useState(null);
  const [resaltado, setResaltado] = useState(null);
  const [encuadre, setEncuadre] = useState(ENCUADRE_COMPLETO);
  const [expandido, setExpandido] = useState(false);
  const [dialogo, setDialogo] = useState(null);

  const historial = useHistorial([]);
  const { objetos, aplicar, deshacer, rehacer, reiniciar, marcarGuardado, limpio } = historial;

  const svgExportRef = useRef(null);

  // Registrar y editar está restringido a Administrador y Médico (igual que el API)
  const canEdit = ['administrador', 'medico'].includes(user?.rol);
  const bloqueado = soloLectura || !canEdit || loadingHistoria;

  /* ── Carga del paciente ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoadingPatient(false);
      setPatientError('');
      return undefined;
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
        setPatientError(res.message || 'No se pudo cargar el paciente del mapeo.');
      }
      setLoadingPatient(false);
    };

    loadPatient();
    return () => { isMounted = false; };
  }, [patientId]);

  /* ── Carga del mapeo ya guardado en la consulta ──────────────────────── */
  useEffect(() => {
    if (!historiaId) {
      setLoadingHistoria(false);
      setAviso('Abra el mapeo desde una consulta guardada para poder archivarlo.');
      return undefined;
    }

    let isMounted = true;
    const loadHistoria = async () => {
      setLoadingHistoria(true);
      const res = await clinicalHistoryService.getClinicalHistoryById(historiaId);
      if (!isMounted) return;

      if (!res.success) {
        setAviso(res.message || 'No se pudo cargar la consulta.');
        setLoadingHistoria(false);
        return;
      }

      const consulta = res.data;
      const mapeo = clinicalHistoryService.mapClinicalHistoryToMapeo(consulta);
      const finalizada = consulta?.estado_registro === 'Finalizada';

      setHistoria(consulta);
      setMapeoUrl(mapeo.url);
      reiniciar(leerDocumento(mapeo.datos));
      setSoloLectura(finalizada);

      if (finalizada) {
        setAviso(`Consulta del ${formatearFecha(consulta.fecha_consulta)} finalizada. Ábrala en modo edición para corregir el mapeo.`);
      } else if (mapeo.datos) {
        setAviso(`Retomando el mapeo guardado el ${formatearFecha(mapeo.actualizado)}.`);
      } else if (mapeo.url) {
        // Mapeos anteriores a la persistencia vectorial: solo existe el PNG
        setAviso('Esta consulta tiene un mapeo archivado como imagen, anterior al editor actual. Puede consultarlo abajo; si dibuja uno nuevo, lo reemplazará.');
      } else {
        setAviso('');
      }

      setLoadingHistoria(false);
    };

    loadHistoria();
    return () => { isMounted = false; };
  }, [historiaId, reiniciar]);

  /* ── Mutaciones ──────────────────────────────────────────────────────── */

  const marcarSucio = useCallback(() => { setGuardado(false); setMensaje(''); }, []);

  const agregarObjeto = useCallback((objeto) => {
    // El tope se comprueba fuera del updater: avisar desde dentro sería un
    // efecto colateral en una función que React puede volver a ejecutar.
    if (objetos.length >= MAX_OBJETOS) {
      setMensaje(`El mapeo alcanzó el máximo de ${MAX_OBJETOS} elementos.`);
      return;
    }
    aplicar(prev => agregar(prev, objeto));
    marcarSucio();
  }, [aplicar, marcarSucio, objetos.length]);

  const eliminarObjeto = useCallback((id) => {
    aplicar(prev => quitar(prev, id));
    setSeleccion(s => (s === id ? null : s));
    marcarSucio();
  }, [aplicar, marcarSucio]);

  const moverObjeto = useCallback((id, dx, dy) => {
    aplicar(prev => mover(prev, id, dx, dy));
    marcarSucio();
  }, [aplicar, marcarSucio]);

  const limpiarTodo = () => {
    if (!objetos.length) return;
    if (!window.confirm('¿Borrar todos los trazos, marcadores y anotaciones del mapeo?')) return;
    aplicar([]);
    setSeleccion(null);
    marcarSucio();
  };

  /* ── Diálogos de anotación y texto ───────────────────────────────────── */

  /** Vista anatómica del punto señalado, o null si cayó fuera de las siluetas. */
  const zonaDelPunto = (punto) => {
    const zona = zonaDe(aNormX(punto.x), aNormY(punto.y));
    return zona ? etiquetaZona(zona.id) : null;
  };

  const pedirAnotacion = useCallback((punto) => {
    setDialogo({ modo: 'anotacion', punto, zona: zonaDelPunto(punto), valor: '' });
  }, []);

  const pedirTexto = useCallback((punto) => {
    setDialogo({ modo: 'texto', punto, zona: zonaDelPunto(punto), valor: '' });
  }, []);

  const editarAnotacion = (objeto) => {
    setDialogo({
      modo: 'anotacion',
      id: objeto.id,
      zona: etiquetaZona(objeto.zona),
      valor: objeto.texto,
    });
  };

  const confirmarDialogo = (texto) => {
    if (!dialogo) return;

    if (dialogo.id) {
      aplicar(prev => actualizar(prev, dialogo.id, { texto }));
    } else if (dialogo.modo === 'anotacion') {
      aplicar(prev => agregar(prev, crearAnotacion(dialogo.punto, texto)));
    } else {
      aplicar(prev => agregar(prev, crearTexto(dialogo.punto, texto, { color: estilo.color })));
    }

    marcarSucio();
    setDialogo(null);
  };

  /* ── Encuadre ────────────────────────────────────────────────────────── */

  const zoom = (factor) => {
    const centro = { x: encuadre.x + encuadre.ancho / 2, y: encuadre.y + encuadre.alto / 2 };
    const ancho = Math.min(PLANTILLA_ANCHO * 1.6, Math.max(PLANTILLA_ANCHO * 0.08, encuadre.ancho * factor));
    const k = ancho / encuadre.ancho;
    setEncuadre({
      x: centro.x - (centro.x - encuadre.x) * k,
      y: centro.y - (centro.y - encuadre.y) * k,
      ancho,
      alto: encuadre.alto * k,
    });
  };

  /** Centrar el lienzo en un objeto, acercando si estaba muy lejos. */
  const irA = (id) => {
    const objeto = objetos.find(o => o.id === id);
    if (!objeto) return;

    const nx = objeto.tipo === 'trazo' ? objeto.puntos[0][0] : objeto.x;
    const ny = objeto.tipo === 'trazo' ? objeto.puntos[0][1] : objeto.y;

    const ancho = Math.min(encuadre.ancho, PLANTILLA_ANCHO * 0.45);
    const alto = ancho * (encuadre.alto / encuadre.ancho);

    setEncuadre({
      x: aVistaX(nx) - ancho / 2,
      y: aVistaY(ny) - alto / 2,
      ancho,
      alto,
    });
    setSeleccion(id);
    setResaltado(id);
  };

  /* ── Pantalla completa ───────────────────────────────────────────────
   * Se pide sobre el documento entero y no sobre el taller: así los diálogos,
   * que se montan en un portal colgado de <body>, siguen quedando dentro del
   * elemento a pantalla completa y se ven. El sidebar y la barra superior se
   * ocultan por CSS. Si el navegador rechaza la petición, el taller igual se
   * expande a toda la ventana, así que la función nunca queda inservible.
   */
  const alternarExpandido = () => {
    const siguiente = !expandido;
    setExpandido(siguiente);

    const doc = document;
    if (siguiente) {
      const el = doc.documentElement;
      const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
      try { pedir?.call(el)?.catch?.(() => {}); } catch { /* se queda en modo expandido */ }
    } else if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      const salir = doc.exitFullscreen || doc.webkitExitFullscreen;
      try { salir?.call(doc)?.catch?.(() => {}); } catch { /* ya no estaba */ }
    }
  };

  useEffect(() => {
    const alCambiar = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) setExpandido(false);
    };
    document.addEventListener('fullscreenchange', alCambiar);
    document.addEventListener('webkitfullscreenchange', alCambiar);
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar);
      document.removeEventListener('webkitfullscreenchange', alCambiar);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mv-expandido', expandido);
    return () => document.body.classList.remove('mv-expandido');
  }, [expandido]);

  /* ── Atajos de teclado ───────────────────────────────────────────────── */
  useEffect(() => {
    const alTeclear = (e) => {
      if (esEditable(e.target) || dialogo) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) rehacer(); else deshacer();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && seleccion && !bloqueado) {
        e.preventDefault();
        eliminarObjeto(seleccion);
        return;
      }

      const herramienta = HERRAMIENTAS.find(h => h.atajo === e.key.toLowerCase());
      if (herramienta && !bloqueado) {
        setEstilo(s => ({ ...s, herramienta: herramienta.id }));
      }
    };

    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [dialogo, seleccion, bloqueado, deshacer, rehacer, eliminarObjeto]);

  /* Avisar antes de abandonar la página con cambios sin guardar */
  useEffect(() => {
    if (limpio) return undefined;
    const alSalir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [limpio]);

  /* ── Guardado ────────────────────────────────────────────────────────── */

  const guardarMapeo = async () => {
    if (!historiaId) {
      setGuardado(false);
      setMensaje('Guarde primero la consulta en la historia clínica: el mapeo se archiva dentro de ella.');
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      // Se rasteriza desde el lienzo oculto, que siempre está al encuadre
      // completo: así el PNG archivado no depende del zoom que tuviera el médico.
      const png = await exportarPng(svgExportRef.current);
      const res = await clinicalHistoryService.saveVenousMap(
        historiaId,
        png,
        crearDocumento(objetos),
      );

      if (!res.success) {
        const detalle = res.errors ? Object.values(res.errors).flat().slice(0, 3).join(' ') : '';
        setGuardado(false);
        setMensaje([res.message, detalle].filter(Boolean).join(' '));
        return;
      }

      const mapeo = clinicalHistoryService.mapClinicalHistoryToMapeo(res.data);
      setMapeoUrl(mapeo.url);
      marcarGuardado();
      setGuardado(true);
      setMensaje(res.message);
    } catch (error) {
      setGuardado(false);
      setMensaje(error.message || 'No se pudo generar la imagen del mapeo.');
    } finally {
      setGuardando(false);
    }
  };

  const descargar = async () => {
    try {
      await descargarPng(
        svgExportRef.current,
        `mapeo-venoso-${patient?.nombre?.replace(/\s+/g, '-').toLowerCase() || patientId || 'paciente'}.png`,
      );
    } catch (error) {
      setMensaje(error.message || 'No se pudo generar la imagen del mapeo.');
    }
  };

  /** Regresar a la misma consulta del expediente, no a una pantalla en blanco. */
  const volverAHistoria = () => {
    if (!limpio && !window.confirm('El mapeo tiene cambios sin guardar. ¿Salir de todos modos?')) return;

    if (!patientId) {
      navigate('/historia-clinica');
      return;
    }
    const params = new URLSearchParams({
      patientId: String(patientId),
      ...(historiaId ? { historiaId: String(historiaId) } : {}),
    });
    navigate(`/historia-clinica?${params}`);
  };

  const editorProps = {
    objetos,
    estilo,
    soloLectura: bloqueado,
    onAgregar: agregarObjeto,
    onMover: moverObjeto,
    onEliminar: eliminarObjeto,
    onSeleccionar: (id) => { setSeleccion(id); setResaltado(null); },
    onPedirAnotacion: pedirAnotacion,
    onPedirTexto: pedirTexto,
  };

  return (
    <Layout breadcrumb="Mapeo Venoso">
      <div className={`flat-page hc-page mv-page${expandido ? ' mv-page-expandida' : ''}`}>

        {!expandido && (
          <div className="page-header">
            <div>
              <button type="button" className="btn btn-ghost btn-sm dop-back" onClick={volverAHistoria}>
                <ArrowLeft size={14} /> Volver a Historia Clínica
              </button>
              <h1 className="page-title">Mapeo Venoso Superficial</h1>
              <p className="page-subtitle">Cartografía de miembros inferiores</p>
            </div>
            <span className={`tag ${guardado && limpio ? 'tag-success' : 'tag-info'}`}>
              {guardado && limpio ? 'Guardado' : limpio ? 'Sin cambios' : 'Sin guardar'}
            </span>
          </div>
        )}

        {!expandido && (
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
                    <span>
                      {historiaId
                        ? `Consulta #${historiaId} del ${formatearFecha(historia?.fecha_consulta)}`
                        : 'Sin consulta asociada'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="hc-patient-name">Sin paciente vinculado</div>
                  <div className="hc-notice">
                    <AlertCircle size={14} />
                    {patientError || 'Abra el mapeo desde la historia clínica para vincularlo al expediente.'}
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
        )}

        {!expandido && aviso && (
          <div className="notice notice-warning notice-flush">
            <span className="notice-body"><AlertCircle size={16} /> {aviso}</span>
            {soloLectura && canEdit && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setSoloLectura(false);
                  setAviso('Modo edición: al guardar se reemplazará el mapeo archivado de esta consulta.');
                }}
              >
                <PenTool size={14} /> Editar mapeo
              </button>
            )}
          </div>
        )}

        {/* ── Taller de trabajo ────────────────────────────────────────── */}
        <div className="mv-taller">
          <BarraHerramientas
            estilo={estilo}
            soloLectura={bloqueado}
            onEstilo={(cambios) => setEstilo(s => ({ ...s, ...cambios }))}
          />

          <div className="mv-lienzo-zona">
            <div className="mv-lienzo-barra">
              <div className="mv-lienzo-grupo">
                <span className="mv-lienzo-etiqueta">Ver</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEncuadre(ENCUADRE_COMPLETO)}>
                  <Scan size={14} /> Todo
                </button>
                {Object.values(MIEMBROS).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={m.label}
                    onClick={() => setEncuadre(encuadreMiembro(m.id))}
                  >
                    {m.abrev}
                  </button>
                ))}
                <span className="mv-separador" />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Alejar (o pellizcar con dos dedos en el trackpad)"
                  onClick={() => zoom(1.25)}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Acercar (o pellizcar con dos dedos en el trackpad). Para desplazar: barra espaciadora + arrastrar"
                  onClick={() => zoom(1 / 1.25)}
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              <div className="mv-lienzo-grupo">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Deshacer (Ctrl+Z)"
                  disabled={!historial.puedeDeshacer}
                  onClick={deshacer}
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Rehacer (Ctrl+Shift+Z)"
                  disabled={!historial.puedeRehacer}
                  onClick={rehacer}
                >
                  <Redo2 size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Limpiar todo"
                  disabled={bloqueado || !objetos.length}
                  onClick={limpiarTodo}
                >
                  <Trash2 size={14} />
                </button>
                <span className="mv-separador" />
                <button type="button" className="btn btn-ghost btn-sm" title="Descargar PNG" onClick={descargar}>
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  title={expandido ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
                  onClick={alternarExpandido}
                >
                  {expandido ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  {expandido ? 'Salir' : 'Pantalla completa'}
                </button>
              </div>
            </div>

            <div className="mv-lienzo-marco">
              {loadingHistoria ? (
                <div className="mv-cargando">
                  <RefreshCw size={16} className="animate-spin" /> Cargando el mapeo de la consulta…
                </div>
              ) : (
                <MapeoVenosoEditor
                  {...editorProps}
                  seleccion={seleccion}
                  resaltado={resaltado}
                  encuadre={encuadre}
                  debugZonas={debugZonas}
                  paneoConRueda={expandido}
                  onEncuadre={setEncuadre}
                />
              )}
            </div>

            {expandido && (
              <div className="mv-lienzo-pie">
                <span>
                  {objetos.length} elemento{objetos.length === 1 ? '' : 's'}
                  {!limpio && ' · sin guardar'}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={bloqueado || guardando || !historiaId}
                  onClick={guardarMapeo}
                >
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar mapeo'}
                </button>
              </div>
            )}
          </div>

          <PanelAnotaciones
            objetos={objetos}
            seleccion={seleccion}
            soloLectura={bloqueado}
            onIr={irA}
            onEditar={editarAnotacion}
            onEliminar={eliminarObjeto}
          />
        </div>

        {!expandido && (
          <>
            <div className="hc-save-bar">
              <div className={`hc-save-info${guardado ? ' saved' : ''}`}>
                {guardado ? (
                  <><Check size={14} /> {mensaje || 'Mapeo guardado correctamente'}</>
                ) : mensaje ? (
                  <><AlertCircle size={14} /> {mensaje}</>
                ) : bloqueado ? (
                  <><Lock size={14} /> {canEdit ? 'Mapeo en modo lectura' : 'Su rol no permite editar el mapeo'}</>
                ) : (
                  <>
                    <PenTool size={14} /> {objetos.length} elemento{objetos.length === 1 ? '' : 's'} en el mapeo
                    {!limpio && ' · cambios sin guardar'}
                  </>
                )}
              </div>
              <div className="hc-save-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={bloqueado || guardando || !historiaId}
                  onClick={guardarMapeo}
                >
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar mapeo'}
                </button>
              </div>
            </div>

            {/* Mapeos archivados antes del editor vectorial: solo existe la imagen */}
            {mapeoUrl && (
              <details className="mv-archivado">
                <summary>Ver la imagen archivada de este mapeo</summary>
                <img src={mapeoUrl} alt="Mapeo venoso archivado de esta consulta" />
              </details>
            )}
          </>
        )}
      </div>

      {/* Lienzo oculto al encuadre completo: es el que se rasteriza al guardar
          y al descargar, para que la imagen no dependa del zoom en pantalla. */}
      <div className="mv-exportador" aria-hidden="true">
        <MapeoVenosoEditor
          objetos={objetos}
          estilo={ESTILO_INICIAL}
          encuadre={ENCUADRE_COMPLETO}
          soloLectura
          svgRef={svgExportRef}
          onAgregar={() => {}}
          onMover={() => {}}
          onEliminar={() => {}}
          onSeleccionar={() => {}}
          onPedirAnotacion={() => {}}
          onPedirTexto={() => {}}
          onEncuadre={() => {}}
        />
      </div>

      <DialogoAnotacion
        abierto={!!dialogo}
        titulo={dialogo?.modo === 'texto'
          ? 'Etiqueta sobre el mapa'
          : dialogo?.id ? 'Editar anotación' : 'Nueva anotación'}
        zona={dialogo?.zona}
        valor={dialogo?.valor || ''}
        multilinea={dialogo?.modo !== 'texto'}
        onConfirmar={confirmarDialogo}
        onCancelar={() => setDialogo(null)}
      />
    </Layout>
  );
}

export default MapeoVenoso;
