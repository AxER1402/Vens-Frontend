import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Ban, ClipboardList, FilePlus, FileText,
  Plus, Printer, Receipt, RefreshCw, Trash2, TrendingUp, User,
} from 'lucide-react';

import Layout from '../../components/Layout/Layout';
import { Combobox } from '@/components/ui/combobox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAvisos } from '../../components/Avisos';
import { useAuth } from '../../context/AuthContext';
import * as facturacionService from '../../services/facturacionService';
import * as patientService from '../../services/patientService';
import * as clinicalHistoryService from '../../services/clinicalHistoryService';
import { reporteDocumentoCobro } from '../../services/reporteService';
import VistaPreviaReporte from '../../components/Reportes/VistaPreviaReporte';
import ReporteIngresos from '../../components/Facturacion/ReporteIngresos';
import Paginador from '../../components/Paginador';
import './Facturacion.css';

const { quetzales } = facturacionService;

const METODOS_PAGO = ['Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia', 'Cheque'];

/** Lo que más se cobra, para no escribirlo cada vez. */
const SUGERENCIAS = [
  { descripcion: 'Consulta de flebología', precio: 350 },
  { descripcion: 'Sesión de escleroterapia', precio: 600 },
  { descripcion: 'Estudio de Ecodöppler venoso', precio: 450 },
  { descripcion: 'Medias de compresión', precio: 400, tipo: 'B' },
];

const renglonVacio = () => ({
  clave: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  tipo: 'S',
  descripcion: '',
  cantidad: '1',
  precio_unitario: '',
  descuento: '',
});

const aNumero = (valor) => {
  const n = Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  return Number.isNaN(fecha.getTime())
    ? valor
    : fecha.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Facturacion() {
  const { user } = useAuth();
  const avisos = useAvisos();

  // La historia clínica puede mandar aquí una consulta ya elegida. Se lee del
  // estado de navegación y se limpia enseguida: si se quedara, recargar la
  // página volvería a rellenar un cobro que quizá ya se emitió.
  const location = useLocation();
  const navigate = useNavigate();
  const desdeLaConsulta = location.state ?? null;

  // Cobrar y anular los hace quien está en el mostrador. El médico entra a
  // consultar, y por eso no ve botones que el servidor le va a rechazar.
  const puedeCobrar = user?.rol === 'administrador' || user?.rol === 'recepcionista';

  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  const [form, setForm] = useState({
    patient_id: '',
    clinical_history_id: '',
    nit_receptor: 'CF',
    nombre_receptor: '',
    direccion_receptor: '',
    metodo_pago: 'Efectivo',
    observaciones: '',
  });
  const [items, setItems] = useState([renglonVacio()]);

  const [emitiendo, setEmitiendo] = useState('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState('');
  const [aAnular, setAAnular] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState(null);
  // Tipo de documento pendiente de confirmar, o null. Emitir no se deshace:
  // un documento de cobro entregado ya no se corrige, se anula.
  const [aEmitir, setAEmitir] = useState(null);

  /* ── Carga inicial ────────────────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      const res = await patientService.getPatients();
      if (!res.success) return;

      const lista = res.data.map((p) => ({
        value: String(p.id),
        label: p.nombre,
        // El buscador del selector mira también aquí, para poder encontrar al
        // paciente por su teléfono cuando lo llama por teléfono.
        busqueda: [p.nombre, p.telefono].filter(Boolean).join(' '),
        telefono: p.telefono,
      }));
      setPacientes(lista);

      // Al llegar desde la consulta el paciente ya viene elegido, pero su
      // nombre solo se sabe cuando llega la lista.
      setForm((prev) => {
        if (!prev.patient_id || prev.nombre_receptor) return prev;

        const paciente = lista.find((p) => p.value === prev.patient_id);
        return paciente ? { ...prev, nombre_receptor: paciente.label } : prev;
      });
    })();
  }, []);

  useEffect(() => {
    if (!desdeLaConsulta?.patientId) return;

    setForm((prev) => ({
      ...prev,
      patient_id: String(desdeLaConsulta.patientId),
      clinical_history_id: desdeLaConsulta.historiaId ? String(desdeLaConsulta.historiaId) : '',
    }));

    navigate('.', { replace: true, state: null });
  }, [desdeLaConsulta, navigate]);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    const res = await facturacionService.getInvoices({
      incluir_anuladas: 1,
      page: pagina,
      per_page: 30,
    });

    if (res.success) {
      setDocumentos(res.data);
      setMeta(res.meta);
    }
    setCargandoHistorial(false);
  }, [pagina]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  /* Las consultas del paciente elegido: son las que se pueden cobrar. */
  useEffect(() => {
    if (!form.patient_id) {
      setConsultas([]);
      return;
    }

    (async () => {
      const res = await clinicalHistoryService.getClinicalHistoriesByPatient(form.patient_id);
      setConsultas(res.success ? res.data : []);
    })();
  }, [form.patient_id]);

  /* ── Cuentas ──────────────────────────────────────────────────────────── */

  /* El servidor vuelve a hacer estas cuentas y su resultado es el que manda;
     esto es solo para que quien cobra vea el total antes de emitir. */
  const cuentas = useMemo(() => {
    let subtotal = 0;
    let descuento = 0;

    for (const item of items) {
      subtotal += aNumero(item.cantidad) * aNumero(item.precio_unitario);
      descuento += aNumero(item.descuento);
    }

    const total = Math.max(0, subtotal - descuento);
    const base = total / 1.12;

    return { subtotal, descuento, total, iva: total - base };
  }, [items]);

  /* ── Renglones ────────────────────────────────────────────────────────── */

  const cambiarItem = (clave, campo, valor) =>
    setItems((prev) => prev.map((i) => (i.clave === clave ? { ...i, [campo]: valor } : i)));

  const agregarItem = (sugerencia) =>
    setItems((prev) => [...prev, {
      ...renglonVacio(),
      descripcion: sugerencia?.descripcion ?? '',
      precio_unitario: sugerencia ? String(sugerencia.precio) : '',
      tipo: sugerencia?.tipo ?? 'S',
    }]);

  const quitarItem = (clave) =>
    setItems((prev) => (prev.length === 1 ? [renglonVacio()] : prev.filter((i) => i.clave !== clave)));

  /* ── Emisión ──────────────────────────────────────────────────────────── */

  const elegirPaciente = (id) => {
    const paciente = pacientes.find((p) => p.value === id);
    setForm((prev) => ({
      ...prev,
      patient_id: id,
      clinical_history_id: '',
      nombre_receptor: paciente?.label ?? prev.nombre_receptor,
    }));
  };

  const limpiar = () => {
    setForm({
      patient_id: '', clinical_history_id: '', nit_receptor: 'CF',
      nombre_receptor: '', direccion_receptor: '', metodo_pago: 'Efectivo', observaciones: '',
    });
    setItems([renglonVacio()]);
  };

  /**
   * Antes de emitir se valida y se pregunta. Un documento de cobro no se
   * deshace: si se emitió de más, hay que anularlo y el número queda gastado.
   */
  const pedirConfirmacion = (tipo) => {
    setError('');
    
    if (!form.patient_id) return setError('Elija el paciente al que se le cobra.');
    if (renglonesValidos().length === 0) {
      return setError('Agregue al menos un renglón con su descripción.');
    }

    setAEmitir(tipo);
  };

  const renglonesValidos = () => items
    .filter((i) => i.descripcion.trim() !== '')
    .map((i) => ({
      tipo: i.tipo,
      descripcion: i.descripcion.trim(),
      cantidad: aNumero(i.cantidad),
      precio_unitario: aNumero(i.precio_unitario),
      descuento: aNumero(i.descuento),
    }));

  const emitir = async (tipo) => {
    setError('');
    
    const renglones = items
      .filter((i) => i.descripcion.trim() !== '')
      .map((i) => ({
        tipo: i.tipo,
        descripcion: i.descripcion.trim(),
        cantidad: aNumero(i.cantidad),
        precio_unitario: aNumero(i.precio_unitario),
        descuento: aNumero(i.descuento),
      }));

    if (!form.patient_id) return setError('Elija el paciente al que se le cobra.');
    if (renglones.length === 0) return setError('Agregue al menos un renglón con su descripción.');

    setEmitiendo(tipo);
    setAEmitir(null);
    const res = await facturacionService.emitirInvoice({
      ...form,
      clinical_history_id: form.clinical_history_id || null,
      tipo,
      items: renglones,
    });
    setEmitiendo('');

    if (!res.success) return setError(res.message);

    avisos.exito(res.message);
    limpiar();
    setPagina(1);
    cargarHistorial();

    // Se abre solo: emitir un recibo y tener que ir a buscarlo al historial
    // para imprimirlo deja el trabajo a medias.
    setVistaPrevia(reporteDocumentoCobro(res.data));
  };

  const confirmarAnulacion = async () => {
    if (!motivoAnulacion.trim()) return;

    const res = await facturacionService.anularInvoice(aAnular.id, motivoAnulacion.trim());
    setAAnular(null);
    setMotivoAnulacion('');

    if (res.success) {
      avisos.exito(res.message);
      cargarHistorial();
    } else {
      setError(res.message);
    }
  };

  const opcionesConsulta = consultas.map((c) => ({
    value: String(c.id),
    label: `Consulta del ${formatearFecha(c.fecha_consulta)}`,
  }));

  return (
    <Layout breadcrumb="Facturación">
      <div className="flat-page fa-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Facturación</h1>
            <p className="page-subtitle">
              Recibos internos y facturas electrónicas, en quetzales y con el IVA incluido en el precio.
            </p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn btn-secondary" onClick={cargarHistorial} disabled={cargandoHistorial}>
              <RefreshCw size={15} className={cargandoHistorial ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="notice notice-danger">
            <span className="notice-body"><AlertCircle size={16} />{error}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError('')}>Cerrar</button>
          </div>
        )}

        {/* ── A quién se le cobra ──────────────────────────────────────── */}
        <section className="hc-section">
          <div className="hc-section-head">
            <User size={14} />
            <h2 className="hc-section-title">A quién se le cobra</h2>
          </div>
          <div className="hc-section-body">
            <div className="fa-grid">
              <div className="hc-field">
                <label className="hc-field-label">Paciente</label>
                <Combobox
                  items={pacientes}
                  value={form.patient_id}
                  onChange={elegirPaciente}
                  placeholder="Seleccione un paciente…"
                  searchPlaceholder="Buscar por nombre…"
                  icon={<User size={15} />}
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label">
                  Consulta que se cobra <span className="fa-opcional">opcional</span>
                </label>
                <Combobox
                  items={opcionesConsulta}
                  value={form.clinical_history_id}
                  onChange={(v) => setForm((p) => ({ ...p, clinical_history_id: v }))}
                  placeholder={form.patient_id ? 'Sin consulta asociada' : 'Elija primero un paciente'}
                  searchPlaceholder="Buscar consulta…"
                  icon={<ClipboardList size={15} />}
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label">
                  NIT <span className="fa-opcional">CF si no lo da</span>
                </label>
                <input
                  className="form-control"
                  value={form.nit_receptor}
                  onChange={(e) => setForm((p) => ({ ...p, nit_receptor: e.target.value }))}
                  placeholder="CF"
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label">Nombre en el documento</label>
                <input
                  className="form-control"
                  value={form.nombre_receptor}
                  onChange={(e) => setForm((p) => ({ ...p, nombre_receptor: e.target.value }))}
                  placeholder="Nombre del receptor"
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label">Dirección</label>
                <input
                  className="form-control"
                  value={form.direccion_receptor}
                  onChange={(e) => setForm((p) => ({ ...p, direccion_receptor: e.target.value }))}
                  placeholder="Ciudad"
                />
              </div>

              <div className="hc-field">
                <label className="hc-field-label">Método de pago</label>
                <select
                  className="form-control"
                  value={form.metodo_pago}
                  onChange={(e) => setForm((p) => ({ ...p, metodo_pago: e.target.value }))}
                >
                  {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ── Qué se cobra ─────────────────────────────────────────────── */}
        <section className="hc-section">
          <div className="hc-section-head">
            <Receipt size={14} />
            <h2 className="hc-section-title">Qué se cobra</h2>
            <span className="fa-head-nota">{items.length} renglón(es)</span>
          </div>
          <div className="hc-section-body">
            <div className="table-wrap">
              <table className="data-table fa-tabla">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="fa-num">Cantidad</th>
                    <th className="fa-num">Precio</th>
                    <th className="fa-num">Descuento</th>
                    <th className="fa-num">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const total = aNumero(item.cantidad) * aNumero(item.precio_unitario) - aNumero(item.descuento);

                    return (
                      <tr key={item.clave}>
                        <td>
                          <input
                            className="form-control"
                            value={item.descripcion}
                            onChange={(e) => cambiarItem(item.clave, 'descripcion', e.target.value)}
                            placeholder="Consulta, sesión, material…"
                          />
                        </td>
                        <td className="fa-num">
                          <input
                            className="form-control fa-control-num"
                            value={item.cantidad}
                            onChange={(e) => cambiarItem(item.clave, 'cantidad', e.target.value)}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="fa-num">
                          <input
                            className="form-control fa-control-num"
                            value={item.precio_unitario}
                            onChange={(e) => cambiarItem(item.clave, 'precio_unitario', e.target.value)}
                            inputMode="decimal"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="fa-num">
                          <input
                            className="form-control fa-control-num"
                            value={item.descuento}
                            onChange={(e) => cambiarItem(item.clave, 'descuento', e.target.value)}
                            inputMode="decimal"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="fa-num fa-total-fila">{quetzales(Math.max(0, total))}</td>
                        <td className="fa-num">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Quitar renglón"
                            onClick={() => quitarItem(item.clave)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="fa-atajos">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => agregarItem()}>
                <Plus size={14} /> Agregar renglón
              </button>
              <span className="fa-atajos-sep">o lo de siempre:</span>
              {SUGERENCIAS.map((s) => (
                <button
                  key={s.descripcion}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => agregarItem(s)}
                >
                  {s.descripcion}
                </button>
              ))}
            </div>

            <div className="fa-cuentas">
              <div className="fa-cuenta"><span>Subtotal</span><strong>{quetzales(cuentas.subtotal)}</strong></div>
              <div className="fa-cuenta"><span>Descuento</span><strong>−{quetzales(cuentas.descuento)}</strong></div>
              <div className="fa-cuenta fa-cuenta-iva">
                <span>IVA 12% incluido</span><strong>{quetzales(cuentas.iva)}</strong>
              </div>
              <div className="fa-cuenta fa-cuenta-total"><span>Total a pagar</span><strong>{quetzales(cuentas.total)}</strong></div>
            </div>

            <div className="fa-emitir">
              {puedeCobrar ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => pedirConfirmacion('recibo')}
                    disabled={emitiendo !== ''}
                  >
                    <Receipt size={15} />
                    {emitiendo === 'recibo' ? 'Emitiendo…' : 'Emitir recibo'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => pedirConfirmacion('factura')}
                    disabled={emitiendo !== ''}
                  >
                    <FilePlus size={15} />
                    {emitiendo === 'factura' ? 'Emitiendo…' : 'Emitir factura'}
                  </button>
                  <p className="fa-nota-fel">
                    La factura queda registrada y <strong>pendiente de certificar</strong>: la conexión con el
                    certificador de la SAT todavía no está contratada. El recibo interno se emite completo.
                  </p>
                </>
              ) : (
                <p className="fa-nota-fel">
                  Su usuario puede consultar los documentos emitidos, pero <strong>no emitir ni anular</strong>:
                  esas dos las hace administración o recepción.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Lo que ha entrado ────────────────────────────────────────── */}
        <section className="hc-section">
          <div className="hc-section-head">
            <TrendingUp size={14} />
            <h2 className="hc-section-title">Reporte de ingresos</h2>
            <span className="fa-head-nota">Cuánto entró en el día, el mes o el rango que elija</span>
          </div>
          <div className="hc-section-body">
            <ReporteIngresos onVistaPrevia={setVistaPrevia} />
          </div>
        </section>

        {/* ── Historial ────────────────────────────────────────────────── */}
        <section className="hc-section">
          <div className="hc-section-head">
            <FileText size={14} />
            <h2 className="hc-section-title">Documentos emitidos</h2>
            <span className="fa-head-nota">{meta?.total ?? documentos.length}</span>
          </div>
          <div className="hc-section-body">
            {documentos.length === 0 ? (
              <p className="hc-empty">Todavía no se ha emitido ningún documento.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Fecha</th>
                      <th>Paciente</th>
                      <th>NIT</th>
                      <th className="fa-num">Total</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((doc) => (
                      <tr key={doc.id} className={doc.estado === 'Anulada' ? 'fa-anulada' : ''}>
                        <td>
                          <span className="fa-correlativo">{doc.serie}-{doc.numero}</span>
                          <span className="fa-tipo">{doc.tipo === 'factura' ? 'Factura' : 'Recibo'}</span>
                        </td>
                        <td>{formatearFecha(doc.fecha_emision)}</td>
                        <td>{doc.patient?.nombre ?? doc.nombre_receptor}</td>
                        <td>{doc.nit_receptor}</td>
                        <td className="fa-num fa-total-fila">{quetzales(doc.total)}</td>
                        <td>
                          {doc.estado === 'Anulada' ? (
                            <span className="tag tag-danger" title={doc.motivo_anulacion}>Anulada</span>
                          ) : doc.fel_estado === 'Pendiente' ? (
                            <span className="tag tag-warning" title={doc.fel_mensaje}>Sin certificar</span>
                          ) : doc.fel_estado === 'Certificada' ? (
                            <span className="tag tag-success">Certificada</span>
                          ) : (
                            <span className="tag tag-info">Emitida</span>
                          )}
                        </td>
                        <td className="fa-num">
                          <div className="fa-acciones">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Ver e imprimir"
                              onClick={() => setVistaPrevia(reporteDocumentoCobro(doc))}
                            >
                              <Printer size={14} />
                            </button>
                            {puedeCobrar && doc.estado !== 'Anulada' && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                title="Anular documento"
                                onClick={() => { setAAnular(doc); setMotivoAnulacion(''); }}
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Paginador
              pagina={meta?.pagina ?? 1}
              paginas={meta?.paginas ?? 1}
              total={meta?.total ?? documentos.length}
              porPagina={meta?.por_pagina ?? documentos.length}
              onCambiar={setPagina}
              etiqueta="documentos"
            />
          </div>
        </section>
      </div>

      <VistaPreviaReporte reporte={vistaPrevia} onCerrar={() => setVistaPrevia(null)} />

      {/* ── Confirmar emisión ──────────────────────────────────────────── */}
      <AlertDialog open={aEmitir !== null} onOpenChange={(abierto) => { if (!abierto) setAEmitir(null); }}>
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon">
              {aEmitir === 'factura' ? <FilePlus size={17} /> : <Receipt size={17} />}
            </span>
            <AlertDialogTitle className="confirm-title">
              ¿Emitir {aEmitir === 'factura' ? 'la factura' : 'el recibo'}?
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            Se emitirá por <strong>{quetzales(cuentas.total)}</strong> a nombre de{' '}
            <strong>{form.nombre_receptor || 'quien indique el documento'}</strong>, con{' '}
            {items.filter((i) => i.descripcion.trim() !== '').length} renglón(es).
            <br />
            El documento toma el siguiente número del correlativo y no se puede
            corregir después: si sale mal, hay que anularlo y el número queda gastado.
          </AlertDialogDescription>

          <div className="confirm-actions dialog-sep">
            <button type="button" className="btn btn-secondary" onClick={() => setAEmitir(null)}>
              No, revisar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => emitir(aEmitir)}
              disabled={emitiendo !== ''}
            >
              Sí, emitir
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmar anulación ────────────────────────────────────────── */}
      <AlertDialog open={aAnular !== null} onOpenChange={(abierto) => { if (!abierto) setAAnular(null); }}>
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon"><Ban size={17} /></span>
            <AlertDialogTitle className="confirm-title">Anular documento</AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            El documento <strong>{aAnular?.serie}-{aAnular?.numero}</strong> por{' '}
            <strong>{quetzales(aAnular?.total)}</strong> dejará de contar como ingreso, pero sigue
            existiendo con su número y con el motivo a la vista. No se puede deshacer.
          </AlertDialogDescription>

          <div className="confirm-text">
            <input
              className="form-control"
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Motivo de la anulación"
            />
          </div>

          <div className="confirm-actions dialog-sep">
            <button type="button" className="btn btn-secondary" onClick={() => setAAnular(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={confirmarAnulacion}
              disabled={!motivoAnulacion.trim()}
            >
              Sí, anular
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

export default Facturacion;
