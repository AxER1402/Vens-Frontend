import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  CalendarX,
  Eye,
  Pencil,
  Calendar as CalendarIcon,
  ClipboardList,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  UserCheck,
  User,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Ban,
  CalendarOff,
  Lock,
  Trash2
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Combobox } from '@/components/ui/combobox';
import { PatientFormFields, EMPTY_PATIENT_FORM } from '@/components/forms/PatientFormFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import * as blockedDayService from '../../services/blockedDayService';
import * as patientService from '../../services/patientService';
import * as userService from '../../services/userService';

const MOTIVOS_DEFAULT = [
  'Evaluación Eco-Doppler Venoso',
  'Consulta Inicial Vascular',
  'Seguimiento de Insuficiencia Venosa',
  'Control Post-operatorio',
  'Evaluación de Varices',
  'Urgencia Vascular',
  'Revisión de Curaciones'
];

const ESTADOS_CITA = [
  'Programada',
  'Confirmada',
  'Reagendada',
  'Completada',
  'Cancelada'
];

/** Motivos por los que la clínica cierra la agenda un día completo */
const TIPOS_BLOQUEO = ['Feriado', 'Vacaciones', 'Cierre', 'Otro'];

const EMPTY_BLOCKED_FORM = {
  fecha_inicio: '',
  fecha_fin: '',
  motivo: '',
  tipo: 'Feriado'
};

const EMPTY_APPOINTMENT_FORM = {
  patient_id: '',
  medico_id: '',
  fecha: '',
  hora_inicio: '09:00',
  hora_fin: '09:30',
  motivo: 'Evaluación Eco-Doppler Venoso',
  notas: '',
  estado: 'Programada'
};

const tagClass = {
  Programada: 'tag-info',
  Confirmada: 'tag-success',
  Reagendada: 'tag-warning',
  Completada: 'tag-primary',
  Cancelada: 'tag-danger'
};

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_OPTIONS = MESES.map((label, i) => ({ value: String(i + 1), label }));

/** Rango de años del filtro: dos atrás y dos adelante del año en curso */
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = String(new Date().getFullYear() - 2 + i);
  return { value: y, label: y };
});

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Lunes como primer día de la semana */
const startOfWeek = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
};

const isSameDay = (a, b) => toISODate(a) === toISODate(b);

/** 8 -> "08:00" */
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

/** Duración por defecto de la cita creada desde la agenda: 30 minutos */
const slotEndTime = (h) => (h >= 23 ? '23:59' : `${String(h).padStart(2, '0')}:30`);

/** Clase de color por estado: st-programada, st-confirmada, … */
const stateClass = (estado) => `st-${String(estado || 'Programada').toLowerCase()}`;

/** Solo "YYYY-MM-DD", venga como fecha suelta o como fecha y hora */
const onlyDate = (value) => String(value || '').slice(0, 10);

/** Bloqueo que cubre la fecha ISO indicada, o null si el día está habilitado */
const findBlockedDay = (blockedDays, iso) => {
  if (!iso) return null;
  return blockedDays.find(b => {
    const inicio = onlyDate(b.fecha_inicio);
    const fin = onlyDate(b.fecha_fin) || inicio;
    return iso >= inicio && iso <= fin;
  }) || null;
};

/** Una hora queda ocupada cuando ya tiene una cita que no fue cancelada */
const isSlotTaken = (list) => list.some(c => c.estado !== 'Cancelada');

/** Fecha corta para listados: "15 sep 2026" */
const fmtShortDate = (iso) => {
  const d = new Date(`${onlyDate(iso)}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Rango de un bloqueo: un día suelto se muestra sin repetir la fecha */
const blockedRangeLabel = (b) => {
  const inicio = onlyDate(b.fecha_inicio);
  const fin = onlyDate(b.fecha_fin) || inicio;
  return inicio === fin ? fmtShortDate(inicio) : `${fmtShortDate(inicio)} – ${fmtShortDate(fin)}`;
};

const fmtDate = (d) => {
  if (!d || d === 'Sin Fecha') return 'Sin Fecha Asignada';
  try {
    const cleanDate = d.includes('T') ? d.split('T')[0] : d.split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('es-GT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
    const fallbackDate = new Date(d);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toLocaleDateString('es-GT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  } catch (e) {
    console.error('Error formatting date:', e);
  }
  return d;
};

const formatBackendDateTime = (date, time) => {
  if (!date || !time) return '';
  const timeFormatted = time.length === 5 ? `${time}:00` : time;
  return `${date} ${timeFormatted}`;
};

const parseBackendDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return { date: '', time: '' };
  
  const cleanStr = String(dateTimeStr).trim();
  let datePart = '';
  let timePart = '';

  if (cleanStr.includes('T')) {
    const parts = cleanStr.split('T');
    datePart = parts[0];
    timePart = (parts[1] || '').substring(0, 5);
  } else if (cleanStr.includes(' ')) {
    const parts = cleanStr.split(' ');
    datePart = parts[0];
    timePart = (parts[1] || '').substring(0, 5);
  } else {
    datePart = cleanStr;
  }

  return { date: datePart, time: timePart };
};

function Citas() {
  const { user } = useAuth();

  // Solo administradores y médicos pueden cerrar días de la agenda
  const rol = String(user?.rol || '').toLowerCase();
  const canManageBlocked = rol === 'administrador' || rol === 'medico';

  // Primary data state
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Messages state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Vista de agenda: 'dia' | 'semana' | 'lista'
  const [view, setView] = useState('semana');
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  // Filters state
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignPatientModal, setShowAssignPatientModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRegisterPatientModal, setShowRegisterPatientModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Gestión de días bloqueados (feriados, vacaciones y cierres)
  const [blockedForm, setBlockedForm] = useState(EMPTY_BLOCKED_FORM);
  const [editingBlockedId, setEditingBlockedId] = useState(null);
  const [confirmDeleteBlockedId, setConfirmDeleteBlockedId] = useState(null);
  const [blockedNotice, setBlockedNotice] = useState(null);

  // Forms and selected item state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState(EMPTY_APPOINTMENT_FORM);
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT_FORM);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [assignPatientId, setAssignPatientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const params = {};

    // El rango lo define la vista: la semana/día visible, o los filtros en modo lista
    if (view === 'semana') {
      const ws = startOfWeek(anchorDate);
      params.from_date = toISODate(ws);
      params.to_date = toISODate(addDays(ws, 6));
    } else if (view === 'dia') {
      params.date = toISODate(anchorDate);
    } else {
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;
      if (filterDate) params.date = filterDate;
    }

    if (filterEstado && filterEstado !== 'Todos') params.estado = filterEstado;
    if (filterPatientId) params.patient_id = filterPatientId;

    const res = await appointmentService.getAppointments(params);
    if (res.success && res.data) {
      setAppointments(res.data);
    } else {
      setErrorMessage(res.message || 'Error al cargar el listado de citas.');
    }
    setLoading(false);
  }, [view, anchorDate, filterYear, filterMonth, filterDate, filterEstado, filterPatientId]);

  // Fetch patients list
  const fetchPatients = useCallback(async (search = '') => {
    const res = await patientService.getPatients({ search });
    if (res.success && res.data) {
      setPatients(res.data);
    }
  }, []);

  // Fetch doctors list
  const fetchDoctors = useCallback(async () => {
    const res = await userService.getUsers();
    if (res.success && res.data) {
      const drs = res.data.filter(u => u.rol === 'medico' || u.rol === 'administrador');
      setDoctors(drs.length > 0 ? drs : res.data);
    }
  }, []);

  // Fetch blocked days list (feriados, vacaciones y cierres de la clínica)
  const fetchBlockedDays = useCallback(async () => {
    const res = await blockedDayService.getBlockedDays();
    if (res.success && res.data) {
      setBlockedDays(res.data);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    fetchBlockedDays();
  }, [fetchPatients, fetchDoctors, fetchBlockedDays]);

  // Patient items formatted for Combobox
  const patientOptions = useMemo(() => {
    return patients.map(p => ({
      value: String(p.id),
      label: `${p.nombre} ${p.telefono ? `— Tel: ${p.telefono}` : ''}`
    }));
  }, [patients]);

  // Doctor items formatted for Combobox
  const doctorOptions = useMemo(() => {
    return doctors.map(d => ({
      value: String(d.id),
      label: `Dr. ${d.name} (${d.rol || 'Médico'})`
    }));
  }, [doctors]);

  // Motivos sugeridos + el motivo ya guardado, para no perderlo al editar
  const motivoOptions = useMemo(() => {
    const motivo = appointmentForm.motivo;
    if (motivo && !MOTIVOS_DEFAULT.includes(motivo)) {
      return [motivo, ...MOTIVOS_DEFAULT];
    }
    return MOTIVOS_DEFAULT;
  }, [appointmentForm.motivo]);

  // Handlers for Modals
  const handleOpenCreate = () => {
    setAppointmentForm({
      ...EMPTY_APPOINTMENT_FORM,
      medico_id: doctors.length > 0 ? String(doctors[0].id) : ''
    });
    setErrorMessage('');
    setShowCreateModal(true);
  };

  /** Clic sobre una casilla de la agenda: abre "Agendar cita" con día y hora ya cargados */
  const handleOpenCreateSlot = (date, hour) => {
    setAppointmentForm({
      ...EMPTY_APPOINTMENT_FORM,
      medico_id: doctors.length > 0 ? String(doctors[0].id) : '',
      fecha: toISODate(date),
      hora_inicio: hourLabel(hour),
      hora_fin: slotEndTime(hour)
    });
    setErrorMessage('');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (appointment) => {
    setSelectedAppointment(appointment);
    const startParsed = parseBackendDateTime(appointment.fecha_hora_inicio);
    const endParsed = parseBackendDateTime(appointment.fecha_hora_fin);

    setAppointmentForm({
      patient_id: appointment.patient_id || appointment.paciente?.id || '',
      medico_id: appointment.medico_id || appointment.medico?.id || '',
      fecha: startParsed.date,
      hora_inicio: startParsed.time || '09:00',
      hora_fin: endParsed.time || '09:30',
      motivo: appointment.motivo || '',
      notas: appointment.notas || '',
      estado: appointment.estado || 'Reagendada'
    });
    setErrorMessage('');
    setShowEditModal(true);
  };

  const handleOpenAssignPatient = (appointment) => {
    setSelectedAppointment(appointment);
    setAssignPatientId(String(appointment.patient_id || appointment.paciente?.id || ''));
    setErrorMessage('');
    setShowAssignPatientModal(true);
  };

  const handleOpenCancel = (appointment) => {
    setSelectedAppointment(appointment);
    setMotivoCancelacion('');
    setErrorMessage('');
    setShowCancelModal(true);
  };

  const handleOpenDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  /* Puentes desde el detalle: se cierra el detalle y se abre la acción,
     para no dejar dos diálogos apilados. */
  const handleEditFromDetail = () => {
    if (!selectedAppointment) return;
    const appointment = selectedAppointment;
    setShowDetailModal(false);
    handleOpenEdit(appointment);
  };

  const handleCancelFromDetail = () => {
    if (!selectedAppointment) return;
    const appointment = selectedAppointment;
    setShowDetailModal(false);
    handleOpenCancel(appointment);
  };

  const handleAssignPatientFromDetail = () => {
    if (!selectedAppointment) return;
    const appointment = selectedAppointment;
    setShowDetailModal(false);
    handleOpenAssignPatient(appointment);
  };

  const handleOpenRegisterPatient = (prefill = '') => {
    const isPhone = /^[0-9+ \-]+$/.test(prefill.trim());
    setPatientForm({
      ...EMPTY_PATIENT_FORM,
      nombre: isPhone ? '' : prefill,
      telefono: isPhone ? prefill : ''
    });
    setErrorMessage('');
    setShowRegisterPatientModal(true);
  };

  /* ---------- Días bloqueados: feriados, vacaciones y cierres ---------- */

  const handleOpenBlockedModal = () => {
    setBlockedForm(EMPTY_BLOCKED_FORM);
    setEditingBlockedId(null);
    setConfirmDeleteBlockedId(null);
    setBlockedNotice(null);
    setShowBlockedModal(true);
  };

  const handleEditBlocked = (blocked) => {
    const inicio = onlyDate(blocked.fecha_inicio);
    setEditingBlockedId(blocked.id);
    setBlockedForm({
      fecha_inicio: inicio,
      fecha_fin: onlyDate(blocked.fecha_fin) || inicio,
      motivo: blocked.motivo || '',
      tipo: blocked.tipo || 'Feriado'
    });
    setConfirmDeleteBlockedId(null);
    setBlockedNotice(null);
  };

  const handleCancelEditBlocked = () => {
    setEditingBlockedId(null);
    setBlockedForm(EMPTY_BLOCKED_FORM);
    setBlockedNotice(null);
  };

  const handleBlockedSubmit = async (e) => {
    e.preventDefault();
    setBlockedNotice(null);

    if (!blockedForm.fecha_inicio) {
      setBlockedNotice({ type: 'danger', text: 'Debe indicar la fecha de inicio del bloqueo.' });
      return;
    }
    if (!blockedForm.motivo.trim()) {
      setBlockedNotice({ type: 'danger', text: 'Debe indicar el motivo (ej. Día de la Independencia).' });
      return;
    }

    // Un día suelto se guarda con la misma fecha de inicio y de fin
    const fechaFin = blockedForm.fecha_fin || blockedForm.fecha_inicio;
    if (fechaFin < blockedForm.fecha_inicio) {
      setBlockedNotice({ type: 'danger', text: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
      return;
    }

    setIsSubmitting(true);
    const payload = { ...blockedForm, fecha_fin: fechaFin };
    const res = editingBlockedId
      ? await blockedDayService.updateBlockedDay(editingBlockedId, payload)
      : await blockedDayService.createBlockedDay(payload);

    if (res.success) {
      /* Las citas ya agendadas no se tocan: se avisa para que la clínica
         decida si las reagenda o las cancela. */
      const aviso = res.citasAfectadas > 0
        ? ` Atención: hay ${res.citasAfectadas} cita(s) ya agendada(s) en esas fechas que debe reagendar o cancelar.`
        : '';
      setBlockedNotice({ type: 'success', text: `${res.message}${aviso}` });
      setBlockedForm(EMPTY_BLOCKED_FORM);
      setEditingBlockedId(null);
      await fetchBlockedDays();
    } else {
      const firstErr = res.errors ? Object.values(res.errors)[0]?.[0] : null;
      setBlockedNotice({ type: 'danger', text: firstErr || res.message });
    }
    setIsSubmitting(false);
  };

  const handleDeleteBlocked = async (blocked) => {
    setBlockedNotice(null);
    setIsSubmitting(true);

    const res = await blockedDayService.deleteBlockedDay(blocked.id);
    if (res.success) {
      setBlockedNotice({ type: 'success', text: res.message });
      if (editingBlockedId === blocked.id) {
        setEditingBlockedId(null);
        setBlockedForm(EMPTY_BLOCKED_FORM);
      }
      await fetchBlockedDays();
    } else {
      setBlockedNotice({ type: 'danger', text: res.message });
    }
    setConfirmDeleteBlockedId(null);
    setIsSubmitting(false);
  };

  // Submit Create Appointment
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!appointmentForm.patient_id) {
      setErrorMessage('Debe seleccionar un paciente existente o registrar uno nuevo.');
      return;
    }
    if (!appointmentForm.medico_id) {
      setErrorMessage('Debe seleccionar un médico.');
      return;
    }
    if (!appointmentForm.fecha) {
      setErrorMessage('La fecha de la cita es obligatoria.');
      return;
    }
    // Los selectores de hora ya no son inputs nativos: se valida aquí
    if (!appointmentForm.hora_inicio || !appointmentForm.hora_fin) {
      setErrorMessage('Debe indicar la hora de inicio y la hora de fin.');
      return;
    }
    if (appointmentForm.hora_fin <= appointmentForm.hora_inicio) {
      setErrorMessage('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    // La agenda está cerrada en feriados, vacaciones y cierres registrados
    const bloqueo = findBlockedDay(blockedDays, appointmentForm.fecha);
    if (bloqueo) {
      setErrorMessage(
        `No se puede agendar el ${fmtShortDate(appointmentForm.fecha)}: la agenda está bloqueada (${bloqueo.tipo} — ${bloqueo.motivo}).`
      );
      return;
    }

    const fecha_hora_inicio = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_inicio);
    const fecha_hora_fin = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_fin);

    setIsSubmitting(true);
    const res = await appointmentService.createAppointment({
      patient_id: appointmentForm.patient_id,
      medico_id: appointmentForm.medico_id,
      fecha_hora_inicio,
      fecha_hora_fin,
      motivo: appointmentForm.motivo,
      notas: appointmentForm.notas
    });

    if (res.success) {
      setSuccessMessage('Cita agendada exitosamente.');
      setShowCreateModal(false);
      fetchAppointments();
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al agendar la cita.');
      }
    }
    setIsSubmitting(false);
  };

  // Submit Edit Appointment (PUT /api/v1/appointments/{id})
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedAppointment) return;
    if (!appointmentForm.medico_id) {
      setErrorMessage('Debe seleccionar un médico.');
      return;
    }
    if (!appointmentForm.fecha) {
      setErrorMessage('La fecha de la cita es obligatoria.');
      return;
    }
    // Los selectores de hora ya no son inputs nativos: se valida aquí
    if (!appointmentForm.hora_inicio || !appointmentForm.hora_fin) {
      setErrorMessage('Debe indicar la hora de inicio y la hora de fin.');
      return;
    }
    if (appointmentForm.hora_fin <= appointmentForm.hora_inicio) {
      setErrorMessage('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const fecha_hora_inicio = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_inicio);
    const fecha_hora_fin = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_fin);

    // Detectar si cambió la fecha o la hora con respecto a la cita original
    const origStart = parseBackendDateTime(selectedAppointment.fecha_hora_inicio);
    const origEnd = parseBackendDateTime(selectedAppointment.fecha_hora_fin);
    const isDateTimeChanged =
      appointmentForm.fecha !== origStart.date ||
      appointmentForm.hora_inicio !== origStart.time ||
      appointmentForm.hora_fin !== origEnd.time;

    /* Solo se valida el bloqueo al mover la cita de fecha: una cita que ya existía
       en un día luego bloqueado se puede seguir editando o cancelar. */
    if (appointmentForm.fecha !== origStart.date) {
      const bloqueo = findBlockedDay(blockedDays, appointmentForm.fecha);
      if (bloqueo) {
        setErrorMessage(
          `No se puede reagendar al ${fmtShortDate(appointmentForm.fecha)}: la agenda está bloqueada (${bloqueo.tipo} — ${bloqueo.motivo}).`
        );
        return;
      }
    }

    // Si cambió la fecha/hora, el estado pasa automáticamente a 'Reagendada'
    const finalEstado = isDateTimeChanged ? 'Reagendada' : (appointmentForm.estado || 'Reagendada');

    setIsSubmitting(true);
    const res = await appointmentService.updateAppointment(selectedAppointment.id, {
      patient_id: appointmentForm.patient_id,
      medico_id: appointmentForm.medico_id,
      fecha_hora_inicio,
      fecha_hora_fin,
      motivo: appointmentForm.motivo,
      estado: finalEstado,
      notas: appointmentForm.notas
    });

    if (res.success) {
      setSuccessMessage(
        isDateTimeChanged
          ? 'Cita reprogramada y marcada como Reagendada exitosamente.'
          : 'Cita actualizada exitosamente.'
      );
      setShowEditModal(false);
      
      let needReset = false;
      if (filterDate && appointmentForm.fecha !== filterDate) {
        setFilterDate('');
        needReset = true;
      }
      if (filterPatientId && String(appointmentForm.patient_id) !== String(filterPatientId)) {
        setFilterPatientId('');
        needReset = true;
      }
      if (!needReset) {
        fetchAppointments();
      }
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al actualizar la cita.');
      }
    }
    setIsSubmitting(false);
  };

  // Submit Assign Patient (PATCH /api/v1/appointments/{id}/assign-patient)
  const handleAssignPatientSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedAppointment) return;
    if (!assignPatientId) {
      setErrorMessage('Debe seleccionar un paciente.');
      return;
    }

    setIsSubmitting(true);
    const res = await appointmentService.assignPatientToAppointment(selectedAppointment.id, assignPatientId);

    if (res.success) {
      setSuccessMessage('Paciente reasignado exitosamente.');
      setShowAssignPatientModal(false);

      if (filterPatientId && String(assignPatientId) !== String(filterPatientId)) {
        setFilterPatientId('');
      } else {
        fetchAppointments();
      }
    } else {
      setErrorMessage(res.message || 'Error al reasignar el paciente.');
    }
    setIsSubmitting(false);
  };

  // Submit Cancel Appointment (PATCH /api/v1/appointments/{id}/cancel)
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedAppointment) return;
    if (!motivoCancelacion.trim()) {
      setErrorMessage('Debe especificar el motivo de la cancelación.');
      return;
    }

    setIsSubmitting(true);
    const res = await appointmentService.cancelAppointment(selectedAppointment.id, motivoCancelacion);

    if (res.success) {
      setSuccessMessage('Cita cancelada exitosamente.');
      setShowCancelModal(false);
      fetchAppointments();
    } else {
      setErrorMessage(res.message || 'Error al cancelar la cita.');
    }
    setIsSubmitting(false);
  };

  // Quick action: Confirmar Cita (asistencia)
  const handleConfirmAppointment = async (appointment) => {
    setErrorMessage('');
    setIsSubmitting(true);
    const startParsed = parseBackendDateTime(appointment.fecha_hora_inicio);
    const endParsed = parseBackendDateTime(appointment.fecha_hora_fin);

    const res = await appointmentService.updateAppointment(appointment.id, {
      medico_id: appointment.medico_id || appointment.medico?.id,
      fecha_hora_inicio: formatBackendDateTime(startParsed.date, startParsed.time),
      fecha_hora_fin: formatBackendDateTime(endParsed.date, endParsed.time),
      motivo: appointment.motivo || '',
      estado: 'Confirmada',
      notas: appointment.notas || ''
    });

    if (res.success) {
      setSuccessMessage('Cita marcada como Confirmada exitosamente.');
      fetchAppointments();
    } else {
      setErrorMessage(res.message || 'Error al confirmar la cita.');
    }
    setIsSubmitting(false);
  };

  // Quick action: Reactivar Cita Cancelada
  const handleReactivateAppointment = async (appointment) => {
    setErrorMessage('');
    setIsSubmitting(true);
    const startParsed = parseBackendDateTime(appointment.fecha_hora_inicio);
    const endParsed = parseBackendDateTime(appointment.fecha_hora_fin);

    const res = await appointmentService.updateAppointment(appointment.id, {
      medico_id: appointment.medico_id || appointment.medico?.id,
      fecha_hora_inicio: formatBackendDateTime(startParsed.date, startParsed.time),
      fecha_hora_fin: formatBackendDateTime(endParsed.date, endParsed.time),
      motivo: appointment.motivo || '',
      estado: 'Programada',
      notas: appointment.notas || ''
    });

    if (res.success) {
      setSuccessMessage('Cita reactivada como Programada exitosamente.');
      fetchAppointments();
    } else {
      setErrorMessage(res.message || 'Error al reactivar la cita.');
    }
    setIsSubmitting(false);
  };

  // Quick Register Patient Submit
  const handleQuickRegisterPatient = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!patientForm.nombre.trim()) {
      setErrorMessage('El nombre del paciente es obligatorio.');
      return;
    }
    if (!patientForm.telefono.trim()) {
      setErrorMessage('El teléfono del paciente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    const res = await patientService.createPatient(patientForm);

    if (res.success && res.data) {
      const newPatient = res.data;
      setSuccessMessage(`Paciente "${newPatient.nombre}" registrado correctamente.`);
      await fetchPatients();
      
      // Select the newly created patient in appointmentForm or assignPatientId
      setAppointmentForm(prev => ({ ...prev, patient_id: String(newPatient.id) }));
      setAssignPatientId(String(newPatient.id));

      setShowRegisterPatientModal(false);
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al registrar el paciente.');
      }
    }
    setIsSubmitting(false);
  };

  // Helper to extract patient name for appointment item
  const getPatientDisplayName = (appointment) => {
    if (appointment.paciente?.nombre) return appointment.paciente.nombre;
    if (appointment.patient?.nombre) return appointment.patient.nombre;
    const p = patients.find(pat => Number(pat.id) === Number(appointment.patient_id));
    return p ? p.nombre : `Paciente #${appointment.patient_id || '—'}`;
  };

  // Helper to extract doctor name for appointment item
  const getDoctorDisplayName = (appointment) => {
    if (appointment.medico?.name) return appointment.medico.name;
    if (appointment.doctor?.name) return appointment.doctor.name;
    const d = doctors.find(doc => Number(doc.id) === Number(appointment.medico_id));
    return d ? d.name : `Médico #${appointment.medico_id || '—'}`;
  };

  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const map = {};
    appointments.forEach(app => {
      const startParsed = parseBackendDateTime(app.fecha_hora_inicio);
      const dateKey = startParsed.date || 'Sin Fecha';
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(app);
    });
    return map;
  }, [appointments]);

  // --------- Datos derivados de la agenda ---------
  const weekDays = useMemo(() => {
    const ws = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [anchorDate]);

  /** Citas indexadas por "YYYY-MM-DD|hora" para llenar cada celda de la rejilla */
  const weekMap = useMemo(() => {
    const map = {};
    appointments.forEach(app => {
      const { date, time } = parseBackendDateTime(app.fecha_hora_inicio);
      if (!date) return;
      const hour = Number((time || '00:00').split(':')[0]);
      if (Number.isNaN(hour)) return;
      const key = `${date}|${hour}`;
      if (!map[key]) map[key] = [];
      map[key].push(app);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) =>
        String(a.fecha_hora_inicio || '').localeCompare(String(b.fecha_hora_inicio || ''))
      )
    );
    return map;
  }, [appointments]);

  /** Bloqueo vigente para cada día de la semana visible, indexado por fecha ISO */
  const weekBlocked = useMemo(() => {
    const map = {};
    weekDays.forEach(d => {
      map[toISODate(d)] = findBlockedDay(blockedDays, toISODate(d));
    });
    return map;
  }, [weekDays, blockedDays]);

  /** Bloqueo del día mostrado en la vista de día */
  const dayBlocked = useMemo(
    () => findBlockedDay(blockedDays, toISODate(anchorDate)),
    [blockedDays, anchorDate]
  );

  /** Bloqueo de la fecha elegida en el formulario de agendar */
  const createBlocked = useMemo(
    () => findBlockedDay(blockedDays, appointmentForm.fecha),
    [blockedDays, appointmentForm.fecha]
  );

  /** Franja horaria visible: se ajusta a las citas, con 08:00–17:00 como mínimo */
  const hourRange = useMemo(() => {
    const hours = appointments
      .map(app => Number((parseBackendDateTime(app.fecha_hora_inicio).time || '').split(':')[0]))
      .filter(h => !Number.isNaN(h));
    const min = Math.min(8, ...hours);
    const max = Math.max(17, ...hours);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [appointments]);

  const rangeLabel = useMemo(() => {
    if (view === 'dia') {
      return anchorDate.toLocaleDateString('es-GT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
    const ws = startOfWeek(anchorDate);
    const we = addDays(ws, 6);
    const sameMonth = ws.getMonth() === we.getMonth();
    const startLabel = ws.toLocaleDateString('es-GT', sameMonth
      ? { day: 'numeric' }
      : { day: 'numeric', month: 'short' });
    const endLabel = we.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }, [anchorDate, view]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmadas = appointments.filter(a => a.estado === 'Confirmada').length;
    const programadas = appointments.filter(a => a.estado === 'Programada').length;
    const reagendadas = appointments.filter(a => a.estado === 'Reagendada').length;
    const canceladas = appointments.filter(a => a.estado === 'Cancelada').length;
    return { total, confirmadas, programadas, reagendadas, canceladas };
  }, [appointments]);

  // Acciones disponibles sobre una cita (compartidas por día y lista)
  const renderApptActions = (c) => (
    <div className="day-actions">
      {(c.estado === 'Programada' || c.estado === 'Reagendada') && (
        <button
          className="btn btn-success btn-sm flex items-center gap-1"
          title="Confirmar asistencia del paciente"
          onClick={() => handleConfirmAppointment(c)}
        >
          <CheckCircle2 size={13} />
          <span className="hidden sm:inline">Confirmar</span>
        </button>
      )}

      {c.estado === 'Cancelada' && (
        <button
          className="btn btn-secondary btn-sm flex items-center gap-1"
          title="Reactivar cita como Programada"
          onClick={() => handleReactivateAppointment(c)}
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Reactivar</span>
        </button>
      )}

      <button
        className="btn btn-secondary btn-sm flex items-center gap-1"
        title="Ver detalle de la cita"
        onClick={() => handleOpenDetail(c)}
      >
        <Eye size={13} />
        <span className="hidden sm:inline">Ver</span>
      </button>

      <button
        className="btn btn-secondary btn-sm flex items-center gap-1"
        title="Editar / reagendar cita"
        onClick={() => handleOpenEdit(c)}
      >
        <Pencil size={13} />
        <span className="hidden sm:inline">Editar</span>
      </button>

      <button
        className="btn btn-secondary btn-sm flex items-center gap-1"
        title="Reasignar paciente"
        onClick={() => handleOpenAssignPatient(c)}
      >
        <UserCheck size={13} />
        <span className="hidden sm:inline">Paciente</span>
      </button>

      {c.estado !== 'Cancelada' && (
        <button
          className="btn btn-danger btn-sm flex items-center gap-1"
          title="Cancelar cita"
          onClick={() => handleOpenCancel(c)}
        >
          <XCircle size={13} />
          <span className="hidden sm:inline">Cancelar</span>
        </button>
      )}
    </div>
  );

  return (
    <Layout breadcrumb="Citas">
      <div className="flat-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Agenda de Citas</h1>
            <p className="page-subtitle">
              Agendamiento, reprogramación y seguimiento multianual de citas del sistema Vens.
            </p>
          </div>
          <div className="page-actions">
            {canManageBlocked && (
              <button
                id="btn-dias-bloqueados"
                className="btn btn-secondary flex items-center gap-2"
                title="Registrar feriados, vacaciones o cierres de la clínica"
                onClick={handleOpenBlockedModal}
              >
                <CalendarOff size={15} />
                Días bloqueados
                {blockedDays.length > 0 && (
                  <span className="tag tag-warning">{blockedDays.length}</span>
                )}
              </button>
            )}
            <button
              id="btn-agendar-cita"
              className="btn btn-primary flex items-center gap-2"
              onClick={handleOpenCreate}
            >
              <CalendarIcon size={15} />
              Agendar cita
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="notice notice-success">
            <span className="notice-body">
              <CheckCircle2 size={16} />
              {successMessage}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuccessMessage('')}>
              Cerrar
            </button>
          </div>
        )}

        {/* Resumen por estado */}
        <div className="citas-summary">
          <div className="cita-sum sum-pend">
            <span className="cita-sum-count">{stats.programadas}</span>
            <span className="cita-sum-label">Programadas</span>
          </div>
          <div className="cita-sum sum-ok">
            <span className="cita-sum-count">{stats.confirmadas}</span>
            <span className="cita-sum-label">Confirmadas</span>
          </div>
          <div className="cita-sum sum-reag">
            <span className="cita-sum-count">{stats.reagendadas}</span>
            <span className="cita-sum-label">Reagendadas</span>
          </div>
          <div className="cita-sum sum-cancel">
            <span className="cita-sum-count">{stats.canceladas}</span>
            <span className="cita-sum-label">Canceladas</span>
          </div>
          <div className="cita-sum sum-total">
            <span className="cita-sum-count">{stats.total}</span>
            <span className="cita-sum-label">
              {view === 'lista' ? 'Total citas' : view === 'dia' ? 'Citas del día' : 'Citas de la semana'}
            </span>
          </div>
        </div>

        {/* Navegación de la agenda y selector de vista */}
        <div className="agenda-bar">
          <div className="agenda-nav">
            {view !== 'lista' && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  title={view === 'semana' ? 'Semana anterior' : 'Día anterior'}
                  onClick={() => setAnchorDate(prev => addDays(prev, view === 'semana' ? -7 : -1))}
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="agenda-range">{rangeLabel}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  title={view === 'semana' ? 'Semana siguiente' : 'Día siguiente'}
                  onClick={() => setAnchorDate(prev => addDays(prev, view === 'semana' ? 7 : 1))}
                >
                  <ChevronRight size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAnchorDate(new Date())}>
                  Hoy
                </button>
              </>
            )}
            {view === 'lista' && (
              <span className="agenda-range" style={{ textAlign: 'left' }}>
                Listado completo con filtros
              </span>
            )}
          </div>

          <div className="view-switch">
            {[
              { id: 'dia', label: 'Día' },
              { id: 'semana', label: 'Semana' },
              { id: 'lista', label: 'Lista' }
            ].map(v => (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? 'on' : ''}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="toolbar">
          <div className="toolbar-left flex flex-wrap items-center gap-3">
            <span className="flat-label flex items-center gap-1.5">
              <Filter size={14} /> Filtros
            </span>

            {view === 'lista' && (
              <>
                <div style={{ width: 190 }}>
                  <DatePicker
                    value={filterDate}
                    onChange={(val) => {
                      setFilterDate(val);
                      if (val) {
                        setFilterYear('');
                        setFilterMonth('');
                      }
                    }}
                    placeholder="Fecha exacta"
                  />
                </div>

                <div style={{ width: 130 }}>
                  <Combobox
                    items={YEAR_OPTIONS}
                    value={filterYear}
                    onChange={(val) => {
                      setFilterYear(val);
                      if (val) setFilterDate('');
                    }}
                    placeholder="Año (todos)"
                  />
                </div>

                <div style={{ width: 160 }}>
                  <Combobox
                    items={MONTH_OPTIONS}
                    value={filterMonth}
                    onChange={(val) => {
                      setFilterMonth(val);
                      if (val) setFilterDate('');
                    }}
                    placeholder="Mes (todos)"
                    searchPlaceholder="Buscar mes…"
                  />
                </div>
              </>
            )}

            <div style={{ width: 175 }}>
              <Combobox
                items={ESTADOS_CITA}
                value={filterEstado}
                onChange={setFilterEstado}
                placeholder="Todos los estados"
              />
            </div>

            <div style={{ width: 210 }}>
              <Combobox
                items={patientOptions}
                value={filterPatientId}
                onChange={setFilterPatientId}
                placeholder="Todos los pacientes"
                searchPlaceholder="Buscar por nombre o teléfono…"
                emptyText="Sin pacientes que coincidan."
                icon={<User size={15} />}
              />
            </div>
          </div>

          <div className="toolbar-right">
            {(filterDate || filterYear || filterMonth || filterEstado || filterPatientId) && (
              <button
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                onClick={() => {
                  setFilterDate('');
                  setFilterYear('');
                  setFilterMonth('');
                  setFilterEstado('');
                  setFilterPatientId('');
                }}
              >
                <RefreshCw size={13} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty-state py-12">
            <RefreshCw size={22} className="animate-spin text-brand-slate mb-2" />
            <p className="text-sm text-muted">Cargando agenda de citas…</p>
          </div>
        ) : view === 'semana' ? (
          /* ---------- VISTA SEMANA ---------- */
          <>
            <div className="week-wrap">
              <div className="week-grid">
                <div className="week-head" />
                {weekDays.map(d => {
                  const bloqueo = weekBlocked[toISODate(d)];
                  return (
                    <div
                      className={`week-head${isSameDay(d, new Date()) ? ' today' : ''}${bloqueo ? ' blocked' : ''}`}
                      key={toISODate(d)}
                    >
                      <div className="week-head-dow">{DOW_LABELS[(d.getDay() + 6) % 7]}</div>
                      <div className="week-head-day">{d.getDate()}</div>
                      {bloqueo && (
                        <div className="week-head-blocked" title={`${bloqueo.tipo} — ${bloqueo.motivo}`}>
                          <Ban size={10} />
                          <span>{bloqueo.motivo}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {hourRange.map(h => (
                  <Fragment key={h}>
                    <div className="week-hour">{String(h).padStart(2, '0')}:00</div>
                    {weekDays.map(d => {
                      const cellKey = `${toISODate(d)}|${h}`;
                      const cellAppointments = weekMap[cellKey] || [];
                      const bloqueo = weekBlocked[toISODate(d)];
                      const ocupada = isSlotTaken(cellAppointments);
                      return (
                        <div
                          className={`week-cell${isSameDay(d, new Date()) ? ' today' : ''}${bloqueo ? ' blocked' : ''}`}
                          key={cellKey}
                        >
                          {cellAppointments.map(c => (
                            <button
                              type="button"
                              key={c.id}
                              className={`cita-block ${stateClass(c.estado)}`}
                              onClick={() => handleOpenDetail(c)}
                              title={`${c.estado} — ${getPatientDisplayName(c)}`}
                            >
                              <div className="cita-block-time">
                                {parseBackendDateTime(c.fecha_hora_inicio).time || '—'}
                              </div>
                              <div className="cita-block-name">{getPatientDisplayName(c)}</div>
                              <div className="cita-block-motivo">{c.motivo || 'Sin motivo'}</div>
                            </button>
                          ))}

                          {/* El "+" solo aparece si la hora está libre y el día habilitado */}
                          {!bloqueo && !ocupada && (
                            <button
                              type="button"
                              className="week-cell-add"
                              onClick={() => handleOpenCreateSlot(d, h)}
                              title={`Agendar cita el ${d.toLocaleDateString('es-GT', {
                                weekday: 'long', day: 'numeric', month: 'long'
                              })} a las ${hourLabel(h)}`}
                              aria-label={`Agendar cita el ${toISODate(d)} a las ${hourLabel(h)}`}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="agenda-legend">
              {ESTADOS_CITA.map(st => (
                <span className="legend-item" key={st}>
                  <span className={`legend-swatch ${stateClass(st)}`} />
                  {st}
                </span>
              ))}
              <span className="legend-item">
                <span className="legend-swatch legend-swatch-blocked" />
                Día bloqueado
              </span>
              <span className="legend-item" style={{ marginLeft: 'auto' }}>
                Solo las horas libres muestran el botón para agendar
              </span>
            </div>
          </>
        ) : view === 'dia' ? (
          /* ---------- VISTA DÍA ---------- */
          <>
            {dayBlocked && (
              <div className="notice notice-danger">
                <span className="notice-body">
                  <CalendarOff size={16} />
                  Agenda cerrada este día — {dayBlocked.tipo}: {dayBlocked.motivo}. No se pueden agendar citas nuevas.
                </span>
              </div>
            )}

            <div className="panel">
              {hourRange.map(h => {
                const slotAppointments = weekMap[`${toISODate(anchorDate)}|${h}`] || [];
                const ocupada = isSlotTaken(slotAppointments);
                return (
                  <div className="day-slot" key={h}>
                    <div className="day-slot-hour">{hourLabel(h)}</div>
                    <div className="day-slot-body">
                      {slotAppointments.map(c => {
                        const startParsed = parseBackendDateTime(c.fecha_hora_inicio);
                        const endParsed = parseBackendDateTime(c.fecha_hora_fin);
                        return (
                          <div className={`day-appt ${stateClass(c.estado)}`} key={c.id}>
                            <div className="day-info">
                              <div className="day-name">{getPatientDisplayName(c)}</div>
                              <div className="day-meta">
                                <span>{startParsed.time || '—'} a {endParsed.time || '—'}</span>
                                <span>{c.motivo || 'Sin motivo'}</span>
                                <span>{getDoctorDisplayName(c)}</span>
                              </div>
                            </div>
                            <span className={`tag ${tagClass[c.estado] || 'tag-info'}`}>{c.estado}</span>
                            {renderApptActions(c)}
                          </div>
                        );
                      })}

                      {/* Una hora ocupada o un día bloqueado ya no ofrecen agendar */}
                      {ocupada ? (
                        <div className="day-slot-full">
                          <Lock size={12} />
                          <span>Hora ocupada — no se pueden agendar más pacientes a las {hourLabel(h)}</span>
                        </div>
                      ) : dayBlocked ? (
                        <div className="day-slot-full">
                          <Ban size={12} />
                          <span>Agenda bloqueada — {dayBlocked.motivo}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="day-slot-add"
                          onClick={() => handleOpenCreateSlot(anchorDate, h)}
                          title={`Agendar cita a las ${hourLabel(h)}`}
                        >
                          <Plus size={13} />
                          <span>Agendar a las {hourLabel(h)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="agenda-legend">
              <span className="legend-item">
                Haga clic en una franja horaria para agendar una cita a esa hora.
              </span>
            </div>
          </>
        ) : (
          /* ---------- VISTA LISTA ---------- */
          Object.keys(groupedAppointments).length === 0 ? (
            <div className="empty-state py-12">
              <div className="empty-icon text-brand-text-light mb-2">
                <CalendarX size={36} />
              </div>
              <p className="font-medium text-brand-text">No hay citas registradas</p>
              <p className="text-xs text-muted">
                No se encontraron citas para los criterios seleccionados. Puede agendar una nueva cita o modificar los filtros.
              </p>
            </div>
          ) : (
            Object.keys(groupedAppointments).sort().map(dateKey => {
              const list = groupedAppointments[dateKey];
              return (
                <div key={dateKey} className="citas-group">
                  <div className="citas-group-head">
                    <span className="citas-group-date">
                      {dateKey !== 'Sin Fecha' ? fmtDate(dateKey) : 'Sin fecha asignada'}
                    </span>
                    <span className="tag tag-info">{list.length} cita(s)</span>
                  </div>

                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Horario</th>
                          <th>Paciente</th>
                          <th>Médico</th>
                          <th>Motivo de consulta</th>
                          <th>Estado</th>
                          <th className="text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(c => {
                          const startParsed = parseBackendDateTime(c.fecha_hora_inicio);
                          const endParsed = parseBackendDateTime(c.fecha_hora_fin);
                          return (
                            <tr key={c.id}>
                              <td>
                                <span className="cita-hora">
                                  {startParsed.time || '—'} – {endParsed.time || '—'}
                                </span>
                              </td>
                              <td>
                                <span className="font-semibold text-brand-text">
                                  {getPatientDisplayName(c)}
                                </span>
                              </td>
                              <td className="text-muted">{getDoctorDisplayName(c)}</td>
                              <td className="text-muted">{c.motivo || 'Sin motivo'}</td>
                              <td>
                                <span className={`tag ${tagClass[c.estado] || 'tag-info'}`}>
                                  {c.estado}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center justify-end">
                                  {renderApptActions(c)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )
        )}

      {/* ================= MODAL AGENDAR CITA ================= */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <CalendarIcon className="text-brand-slate" size={22} />
              Agendar Nueva Cita
            </DialogTitle>
            <DialogDescription className="text-muted">
              Complete los detalles para programar la cita médica en el sistema.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} id="form-agendar-cita" className="flex flex-col gap-4 py-2">
            {/* Selección de Paciente con Combobox nativo del sistema */}
            <div className="form-group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">
                  Paciente <span className="req">*</span>
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1 cursor-pointer"
                  onClick={() => handleOpenRegisterPatient('')}
                >
                  <UserPlus size={13} />
                  + Registrar nuevo paciente
                </button>
              </div>

              <Combobox
                items={patientOptions}
                value={appointmentForm.patient_id}
                onChange={(val) => setAppointmentForm(p => ({ ...p, patient_id: val }))}
                placeholder="Seleccionar paciente por nombre o teléfono…"
                searchPlaceholder="Buscar por nombre o teléfono…"
                emptyText="No se encontró ningún paciente con ese criterio."
                onAddNew={handleOpenRegisterPatient}
                addNewText="+ Registrar nuevo paciente"
              />
            </div>

            {/* Selección de Médico */}
            <div className="form-group">
              <label className="form-label">
                Médico Tratante <span className="req">*</span>
              </label>
              <Combobox
                items={doctorOptions}
                value={appointmentForm.medico_id}
                onChange={(val) => setAppointmentForm(p => ({ ...p, medico_id: val }))}
                placeholder="Seleccionar médico…"
                searchPlaceholder="Buscar médico…"
                emptyText="No hay médicos disponibles."
                icon={<UserCheck size={15} />}
              />
            </div>

            {/* Fecha, Hora Inicio y Hora Fin */}
            <div className="form-group">
              <label className="form-label">
                Fecha de la Cita <span className="req">*</span>
              </label>
              <DatePicker
                value={appointmentForm.fecha}
                onChange={(val) => setAppointmentForm(p => ({ ...p, fecha: val }))}
                placeholder="Seleccionar fecha…"
              />
              {createBlocked && (
                <span className="form-hint form-hint-danger flex items-center gap-1.5">
                  <Ban size={13} />
                  Agenda bloqueada ese día — {createBlocked.tipo}: {createBlocked.motivo}
                </span>
              )}
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Hora Inicio <span className="req">*</span>
                </label>
                <TimePicker
                  value={appointmentForm.hora_inicio}
                  onChange={(val) => setAppointmentForm(p => ({ ...p, hora_inicio: val }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hora Fin <span className="req">*</span>
                </label>
                <TimePicker
                  value={appointmentForm.hora_fin}
                  onChange={(val) => setAppointmentForm(p => ({ ...p, hora_fin: val }))}
                />
              </div>
            </div>

            {/* Motivo de Consulta */}
            <div className="form-group">
              <label className="form-label">Motivo de consulta</label>
              <Combobox
                items={motivoOptions}
                value={appointmentForm.motivo}
                onChange={(val) => setAppointmentForm(p => ({ ...p, motivo: val }))}
                placeholder="Seleccionar motivo…"
                searchPlaceholder="Buscar motivo…"
                icon={<ClipboardList size={15} />}
              />
            </div>

            {/* Notas Adicionales */}
            <div className="form-group">
              <label className="form-label">Notas Adicionales</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Detalles sobre sintomatología o indicaciones previas…"
                value={appointmentForm.notas}
                onChange={e => setAppointmentForm(p => ({ ...p, notas: e.target.value }))}
              />
            </div>

            <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                id="btn-guardar-cita"
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !!createBlocked}
              >
                {isSubmitting ? 'Agendando…' : 'Confirmar Cita'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL EDITAR / REAGENDAR CITA ================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <Pencil className="text-brand-slate" size={20} />
              Editar / Reagendar Cita
            </DialogTitle>
            <DialogDescription className="text-muted">
              Modifique el horario, médico o estado. Si cambian las fechas, el sistema marcará automáticamente la cita como Reagendada.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 py-2">
            <div className="notice notice-flush">
              <strong>Paciente:</strong> {selectedAppointment ? getPatientDisplayName(selectedAppointment) : '—'}
            </div>

            <div className="form-group">
              <label className="form-label">
                Médico Tratante <span className="req">*</span>
              </label>
              <Combobox
                items={doctorOptions}
                value={appointmentForm.medico_id}
                onChange={(val) => setAppointmentForm(p => ({ ...p, medico_id: val }))}
                placeholder="Seleccionar médico…"
                searchPlaceholder="Buscar médico…"
                emptyText="No hay médicos disponibles."
                icon={<UserCheck size={15} />}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Fecha de la Cita <span className="req">*</span>
              </label>
              <DatePicker
                value={appointmentForm.fecha}
                onChange={(val) => setAppointmentForm(p => ({ ...p, fecha: val }))}
                placeholder="Seleccionar fecha…"
              />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Hora Inicio <span className="req">*</span>
                </label>
                <TimePicker
                  value={appointmentForm.hora_inicio}
                  onChange={(val) => setAppointmentForm(p => ({ ...p, hora_inicio: val }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hora Fin <span className="req">*</span>
                </label>
                <TimePicker
                  value={appointmentForm.hora_fin}
                  onChange={(val) => setAppointmentForm(p => ({ ...p, hora_fin: val }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de Cita</label>
              <Combobox
                items={ESTADOS_CITA}
                value={appointmentForm.estado}
                onChange={(val) => setAppointmentForm(p => ({ ...p, estado: val }))}
                placeholder="Seleccionar estado…"
                clearable={false}
                icon={<CheckCircle2 size={15} />}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de consulta</label>
              <Combobox
                items={motivoOptions}
                value={appointmentForm.motivo}
                onChange={(val) => setAppointmentForm(p => ({ ...p, motivo: val }))}
                placeholder="Seleccionar motivo…"
                searchPlaceholder="Buscar motivo…"
                icon={<ClipboardList size={15} />}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas Adicionales</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Detalles sobre sintomatología o indicaciones previas…"
                value={appointmentForm.notas}
                onChange={e => setAppointmentForm(p => ({ ...p, notas: e.target.value }))}
              />
            </div>

            <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL REASIGNAR PACIENTE ================= */}
      <Dialog open={showAssignPatientModal} onOpenChange={setShowAssignPatientModal}>
        <DialogContent className="flat-page sm:max-w-md rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <UserCheck className="text-brand-slate" size={20} />
              Reasignar Paciente
            </DialogTitle>
            <DialogDescription className="text-muted">
              Seleccione el nuevo paciente que estará asociado a esta cita.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleAssignPatientSubmit} className="flex flex-col gap-4 py-2">
            <div className="form-group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Paciente Existente</label>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1 cursor-pointer"
                  onClick={() => handleOpenRegisterPatient('')}
                >
                  <UserPlus size={12} />
                  + Registrar nuevo
                </button>
              </div>

              <Combobox
                items={patientOptions}
                value={assignPatientId}
                onChange={(val) => setAssignPatientId(val)}
                placeholder="Seleccionar paciente por nombre o teléfono…"
                searchPlaceholder="Buscar por nombre o teléfono…"
                emptyText="No se encontró ningún paciente con ese criterio."
                onAddNew={handleOpenRegisterPatient}
                addNewText="+ Registrar nuevo paciente"
              />
            </div>

            <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAssignPatientModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando…' : 'Reasignar Paciente'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL CANCELAR CITA ================= */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="flat-page sm:max-w-md rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <XCircle className="text-brand-slate" size={20} />
              Cancelar Cita
            </DialogTitle>
            <DialogDescription className="text-muted">
              Esta acción actualizará el estado de la cita a <strong>Cancelada</strong>. Por favor especifique el motivo.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleCancelSubmit} className="flex flex-col gap-4 py-2">
            <div className="form-group">
              <label className="form-label">
                Motivo de la Cancelación <span className="req">*</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Ej. El paciente llamó para solicitar la cancelación por motivo de viaje."
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
              >
                Volver
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Cancelando…' : 'Confirmar Cancelación'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL REGISTRAR PACIENTE RÁPIDO ================= */}
      <Dialog open={showRegisterPatientModal} onOpenChange={setShowRegisterPatientModal}>
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <UserPlus className="text-brand-slate" size={22} />
              Registrar Nuevo Paciente
            </DialogTitle>
            <DialogDescription className="text-muted">
              Registre al paciente en la base de datos para seleccionarlo inmediatamente en la cita.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleQuickRegisterPatient} className="flex flex-col gap-4 py-2">
            <PatientFormFields form={patientForm} setForm={setPatientForm} showEstado={false} />

            <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRegisterPatientModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando…' : 'Guardar y Seleccionar'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DÍAS BLOQUEADOS ================= */}
      <Dialog open={showBlockedModal} onOpenChange={setShowBlockedModal}>
        <DialogContent className="flat-page sm:max-w-2xl rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <CalendarOff className="text-brand-slate" size={22} />
              Días Bloqueados de la Agenda
            </DialogTitle>
            <DialogDescription className="text-muted">
              Registre feriados, vacaciones o cierres. En esas fechas la agenda no permitirá agendar citas nuevas.
            </DialogDescription>
          </DialogHeader>

          {blockedNotice && (
            <div className={`notice notice-${blockedNotice.type} notice-flush`}>
              <span className="notice-body">
                {blockedNotice.type === 'success'
                  ? <CheckCircle2 size={16} />
                  : <AlertCircle size={16} />}
                {blockedNotice.text}
              </span>
            </div>
          )}

          <form onSubmit={handleBlockedSubmit} className="flex flex-col gap-4 py-2">
            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Desde <span className="req">*</span>
                </label>
                <DatePicker
                  value={blockedForm.fecha_inicio}
                  onChange={(val) => setBlockedForm(p => ({
                    ...p,
                    fecha_inicio: val,
                    // Un día suelto: la fecha de fin acompaña a la de inicio
                    fecha_fin: !p.fecha_fin || p.fecha_fin < val ? val : p.fecha_fin
                  }))}
                  placeholder="Fecha de inicio…"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hasta</label>
                <DatePicker
                  value={blockedForm.fecha_fin}
                  onChange={(val) => setBlockedForm(p => ({ ...p, fecha_fin: val }))}
                  placeholder="Igual que la fecha de inicio"
                />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Tipo de bloqueo</label>
                <Combobox
                  items={TIPOS_BLOQUEO}
                  value={blockedForm.tipo}
                  onChange={(val) => setBlockedForm(p => ({ ...p, tipo: val || 'Feriado' }))}
                  placeholder="Seleccionar tipo…"
                  clearable={false}
                  icon={<Ban size={15} />}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Motivo <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Día de la Independencia"
                  maxLength={255}
                  value={blockedForm.motivo}
                  onChange={e => setBlockedForm(p => ({ ...p, motivo: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isSubmitting}>
                <Plus size={14} />
                {isSubmitting
                  ? 'Guardando…'
                  : editingBlockedId ? 'Guardar cambios' : 'Bloquear estas fechas'}
              </button>
              {editingBlockedId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancelEditBlocked}
                  disabled={isSubmitting}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          {/* Listado de bloqueos vigentes */}
          <div className="blocked-list">
            {blockedDays.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon text-brand-text-light mb-2">
                  <CalendarOff size={30} />
                </div>
                <p className="font-medium text-brand-text">No hay días bloqueados</p>
                <p className="text-xs text-muted">
                  Registre los feriados o las vacaciones para que no se puedan agendar citas en esas fechas.
                </p>
              </div>
            ) : (
              blockedDays.map(b => (
                <div className={`blocked-row${editingBlockedId === b.id ? ' is-editing' : ''}`} key={b.id}>
                  <div className="blocked-info">
                    <div className="blocked-motivo">
                      <span className="tag tag-warning">{b.tipo}</span>
                      {b.motivo}
                    </div>
                    <div className="blocked-range">{blockedRangeLabel(b)}</div>
                  </div>

                  {confirmDeleteBlockedId === b.id ? (
                    <div className="day-actions">
                      <span className="text-xs text-muted">¿Habilitar estas fechas?</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteBlocked(b)}
                        disabled={isSubmitting}
                      >
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setConfirmDeleteBlockedId(null)}
                        disabled={isSubmitting}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="day-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm flex items-center gap-1"
                        title="Editar este bloqueo"
                        onClick={() => handleEditBlocked(b)}
                        disabled={isSubmitting}
                      >
                        <Pencil size={13} />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm flex items-center gap-1"
                        title="Eliminar el bloqueo y habilitar estas fechas"
                        onClick={() => setConfirmDeleteBlockedId(b.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="dialog-sep flex flex-row justify-end gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowBlockedModal(false)}
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DETALLE DE CITA ================= */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="flat-page sm:max-w-md rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <Eye className="text-brand-slate" size={20} />
              Detalle de Cita {selectedAppointment ? `#${selectedAppointment.id}` : ''}
            </DialogTitle>
            <DialogDescription className="text-muted">
              Consulte la cita y edítela o reagéndela sin salir de la agenda.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (() => {
            const startParsed = parseBackendDateTime(selectedAppointment.fecha_hora_inicio);
            const endParsed = parseBackendDateTime(selectedAppointment.fecha_hora_fin);
            const isCancelled = selectedAppointment.estado === 'Cancelada';
            const canConfirm =
              selectedAppointment.estado === 'Programada' || selectedAppointment.estado === 'Reagendada';

            return (
              <div className="flex flex-col gap-3 py-2 text-sm">
                <div className="detail-row">
                  <span className="detail-key">Estado:</span>
                  <span className={`tag ${tagClass[selectedAppointment.estado] || 'tag-info'}`}>
                    {selectedAppointment.estado}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-key">Paciente:</span>
                  <span className="detail-val">{getPatientDisplayName(selectedAppointment)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-key">Médico:</span>
                  <span className="detail-val">{getDoctorDisplayName(selectedAppointment)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-key">Fecha:</span>
                  <span className="detail-val capitalize">{fmtDate(startParsed.date)}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-key">Horario:</span>
                  <span className="detail-val font-mono">
                    {startParsed.time || '—'} – {endParsed.time || '—'}
                  </span>
                </div>

                <div className="detail-row detail-row-stacked">
                  <span className="detail-key">Motivo de Consulta:</span>
                  <p className="detail-block">
                    {selectedAppointment.motivo || 'Sin motivo registrado'}
                  </p>
                </div>

                {selectedAppointment.notas && (
                  <div className="detail-row detail-row-stacked">
                    <span className="detail-key">Notas:</span>
                    <p className="detail-block">
                      {selectedAppointment.notas}
                    </p>
                  </div>
                )}

                {/* Mientras la cita sigue cancelada, el motivo es la razón vigente */}
                {selectedAppointment.motivo_cancelacion && isCancelled && (
                  <div className="notice notice-danger notice-flush" style={{ display: 'block' }}>
                    <span className="detail-key">Motivo de Cancelación:</span>
                    <p className="text-xs">
                      {selectedAppointment.motivo_cancelacion}
                    </p>
                  </div>
                )}

                {/* Si ya fue reactivada, el motivo queda como historial, no como alerta */}
                {selectedAppointment.motivo_cancelacion && !isCancelled && (
                  <div className="detail-row detail-row-stacked">
                    <span className="detail-key">
                      <RotateCcw size={12} className="inline mr-1" />
                      Cancelación previa (cita reactivada):
                    </span>
                    <p className="detail-block text-muted">
                      {selectedAppointment.motivo_cancelacion}
                    </p>
                  </div>
                )}

                {/* Acciones rápidas sobre la cita mostrada */}
                <div className="detail-actions">
                  {canConfirm && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm flex items-center gap-1.5"
                      onClick={() => {
                        handleConfirmAppointment(selectedAppointment);
                        setShowDetailModal(false);
                      }}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 size={14} />
                      Confirmar
                    </button>
                  )}

                  {isCancelled && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                      onClick={() => {
                        handleReactivateAppointment(selectedAppointment);
                        setShowDetailModal(false);
                      }}
                      disabled={isSubmitting}
                    >
                      <RotateCcw size={14} />
                      Reactivar
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    onClick={handleAssignPatientFromDetail}
                  >
                    <UserCheck size={14} />
                    Reasignar paciente
                  </button>

                  {!isCancelled && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm flex items-center gap-1.5"
                      onClick={handleCancelFromDetail}
                    >
                      <XCircle size={14} />
                      Cancelar cita
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="dialog-sep flex flex-row justify-between gap-3 sm:justify-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDetailModal(false)}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-primary flex items-center gap-2"
              onClick={handleEditFromDetail}
              disabled={!selectedAppointment}
            >
              <Pencil size={14} />
              Editar / Reagendar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}

export default Citas;
