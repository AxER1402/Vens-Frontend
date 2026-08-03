import { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  CalendarX,
  Eye,
  Pencil,
  Calendar as CalendarIcon,
  Clock,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  UserCheck,
  User,
  Phone,
  Filter,
  RefreshCw,
  MapPin,
  Heart
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox } from '@/components/ui/combobox';
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

const EMPTY_PATIENT_FORM = {
  nombre: '',
  edad: '',
  telefono: '',
  lugar_residencia: '',
  estado_civil: '',
  religion: '',
  estado: 'Activo'
};

const tagClass = {
  Programada: 'tag-info',
  Confirmada: 'tag-success',
  Reagendada: 'bg-blue-100 text-blue-800 border-blue-200',
  Completada: 'bg-purple-100 text-purple-800 border-purple-200',
  Cancelada: 'tag-danger'
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

  // Primary data state
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Messages state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    if (filterYear) params.year = filterYear;
    if (filterMonth) params.month = filterMonth;
    if (filterDate) params.date = filterDate;
    if (filterEstado && filterEstado !== 'Todos') params.estado = filterEstado;
    if (filterPatientId) params.patient_id = filterPatientId;

    const res = await appointmentService.getAppointments(params);
    if (res.success && res.data) {
      setAppointments(res.data);
    } else {
      setErrorMessage(res.message || 'Error al cargar el listado de citas.');
    }
    setLoading(false);
  }, [filterYear, filterMonth, filterDate, filterEstado, filterPatientId]);

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

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, [fetchPatients, fetchDoctors]);

  // Patient items formatted for Combobox
  const patientOptions = useMemo(() => {
    return patients.map(p => ({
      value: String(p.id),
      label: `${p.nombre} ${p.telefono ? `— Tel: ${p.telefono}` : ''}`
    }));
  }, [patients]);

  // Handlers for Modals
  const handleOpenCreate = () => {
    setAppointmentForm({
      ...EMPTY_APPOINTMENT_FORM,
      medico_id: doctors.length > 0 ? String(doctors[0].id) : ''
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

    const fecha_hora_inicio = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_inicio);
    const fecha_hora_fin = formatBackendDateTime(appointmentForm.fecha, appointmentForm.hora_fin);

    // Detectar si cambió la fecha o la hora con respecto a la cita original
    const origStart = parseBackendDateTime(selectedAppointment.fecha_hora_inicio);
    const origEnd = parseBackendDateTime(selectedAppointment.fecha_hora_fin);
    const isDateTimeChanged =
      appointmentForm.fecha !== origStart.date ||
      appointmentForm.hora_inicio !== origStart.time ||
      appointmentForm.hora_fin !== origEnd.time;

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

  // Statistics calculation
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmadas = appointments.filter(a => a.estado === 'Confirmada').length;
    const programadas = appointments.filter(a => a.estado === 'Programada').length;
    const reagendadas = appointments.filter(a => a.estado === 'Reagendada').length;
    const canceladas = appointments.filter(a => a.estado === 'Cancelada').length;
    return { total, confirmadas, programadas, reagendadas, canceladas };
  }, [appointments]);

  return (
    <Layout breadcrumb="Citas">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Citas Médicas</h1>
          <p className="page-subtitle">
            Agendamiento, reprogramación y seguimiento multianual de citas del sistema Vens.
          </p>
        </div>
        <div className="page-actions flex items-center gap-2">
          <button
            id="btn-agendar-cita"
            className="btn btn-primary flex items-center gap-2"
            onClick={handleOpenCreate}
          >
            <CalendarIcon size={16} />
            + Agendar Cita
          </button>
        </div>
      </div>

      {/* Banner de mensajes de éxito */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-1 rounded transition-colors"
            onClick={() => setSuccessMessage('')}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="citas-summary">
        <div className="cita-sum sum-ok">
          <span className="cita-sum-count">{stats.confirmadas}</span>
          <span className="cita-sum-label">Confirmadas</span>
        </div>
        <div className="cita-sum sum-pend">
          <span className="cita-sum-count">{stats.programadas}</span>
          <span className="cita-sum-label">Programadas</span>
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
          <span className="cita-sum-label">Total Citas</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="toolbar mb-6 flex flex-wrap gap-3 items-center justify-between bg-white p-4 border border-brand-border-light rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-brand-slate font-semibold uppercase tracking-wider pr-2 border-r border-gray-200">
            <Filter size={15} />
            <span>Filtros:</span>
          </div>

          {/* Fecha Exacta */}
          <input
            type="date"
            className="form-control"
            style={{ width: 160 }}
            value={filterDate}
            onChange={e => {
              setFilterDate(e.target.value);
              if (e.target.value) {
                setFilterYear('');
                setFilterMonth('');
              }
            }}
            title="Filtrar por fecha exacta"
          />

          {/* Año */}
          <select
            className="form-control"
            style={{ width: 120 }}
            value={filterYear}
            onChange={e => {
              setFilterYear(e.target.value);
              if (e.target.value) setFilterDate('');
            }}
          >
            <option value="">Año (Todos)</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          {/* Mes */}
          <select
            className="form-control"
            style={{ width: 140 }}
            value={filterMonth}
            onChange={e => {
              setFilterMonth(e.target.value);
              if (e.target.value) setFilterDate('');
            }}
          >
            <option value="">Mes (Todos)</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>

          {/* Estado */}
          <select
            className="form-control"
            style={{ width: 150 }}
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            {ESTADOS_CITA.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Paciente Filter */}
          <select
            className="form-control"
            style={{ width: 180 }}
            value={filterPatientId}
            onChange={e => setFilterPatientId(e.target.value)}
          >
            <option value="">Todos los Pacientes</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.telefono ? `(${p.telefono})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Appointment List by Date Group */}
      {loading ? (
        <div className="py-12 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-brand-slate">Cargando agenda de citas...</span>
        </div>
      ) : Object.keys(groupedAppointments).length === 0 ? (
        <div className="empty-state py-12 bg-white border border-gray-100 rounded-xl">
          <div className="empty-icon text-gray-300 mb-2">
            <CalendarX size={44} />
          </div>
          <p className="font-semibold text-gray-700">No hay citas registradas</p>
          <p className="text-xs text-gray-500 max-w-sm text-center">
            No se encontraron citas para los criterios seleccionados. Puede agendar una nueva cita o modificar los filtros de búsqueda.
          </p>
        </div>
      ) : (
        Object.keys(groupedAppointments).sort().map(dateKey => {
          const list = groupedAppointments[dateKey];
          return (
            <div key={dateKey} className="citas-group mb-6">
              <div className="citas-group-head flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-teal-700" />
                  <span className="citas-group-date">
                    {dateKey !== 'Sin Fecha' ? fmtDate(dateKey) : 'Sin Fecha Asignada'}
                  </span>
                </div>
                <span className="tag tag-info font-medium">{list.length} cita(s)</span>
              </div>

              <div className="table-wrap bg-white shadow-2xs border border-gray-100 rounded-xl overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Horario</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Motivo de Consulta</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(c => {
                      const startParsed = parseBackendDateTime(c.fecha_hora_inicio);
                      const endParsed = parseBackendDateTime(c.fecha_hora_fin);
                      const patientName = getPatientDisplayName(c);
                      const doctorName = getDoctorDisplayName(c);

                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className="cita-hora font-mono">
                                {startParsed.time || '—'} - {endParsed.time || '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-brand-deep text-sm flex items-center gap-2">
                              <span>{patientName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-sm text-gray-700">{doctorName}</span>
                          </td>
                          <td>
                            <span className="text-sm text-gray-600">{c.motivo || 'Sin motivo'}</span>
                          </td>
                          <td>
                            <span className={`tag ${tagClass[c.estado] || 'tag-info'}`}>
                              {c.estado}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Confirmar Asistencia de Cita */}
                              {(c.estado === 'Programada' || c.estado === 'Reagendada') && (
                                <button
                                  className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 flex items-center gap-1"
                                  title="Confirmar Asistencia del Paciente"
                                  onClick={() => handleConfirmAppointment(c)}
                                >
                                  <CheckCircle2 size={14} />
                                  <span className="hidden sm:inline">Confirmar</span>
                                </button>
                              )}

                              {/* Reactivar Cita Cancelada */}
                              {c.estado === 'Cancelada' && (
                                <button
                                  className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 flex items-center gap-1"
                                  title="Reactivar Cita como Programada"
                                  onClick={() => handleReactivateAppointment(c)}
                                >
                                  <RotateCcw size={14} />
                                  <span className="hidden sm:inline">Reactivar</span>
                                </button>
                              )}

                              <button
                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                title="Ver Detalle de Cita"
                                onClick={() => handleOpenDetail(c)}
                              >
                                <Eye size={14} />
                                <span className="hidden sm:inline">Ver</span>
                              </button>

                              <button
                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                title="Editar / Reagendar Cita"
                                onClick={() => handleOpenEdit(c)}
                              >
                                <Pencil size={14} />
                                <span className="hidden sm:inline">Editar</span>
                              </button>

                              <button
                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                title="Reasignar Paciente"
                                onClick={() => handleOpenAssignPatient(c)}
                              >
                                <UserCheck size={14} />
                                <span className="hidden sm:inline">Paciente</span>
                              </button>

                              {c.estado !== 'Cancelada' && (
                                <button
                                  className="btn btn-sm bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 flex items-center gap-1"
                                  title="Cancelar Cita"
                                  onClick={() => handleOpenCancel(c)}
                                >
                                  <XCircle size={14} />
                                  <span className="hidden sm:inline">Cancelar</span>
                                </button>
                              )}
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
      )}

      {/* ================= MODAL AGENDAR CITA ================= */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <CalendarIcon className="text-brand-teal" size={22} />
              Agendar Nueva Cita
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Complete los detalles para programar la cita médica en el sistema.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2.5 shadow-2xs">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
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
              <select
                className="form-control"
                value={appointmentForm.medico_id}
                onChange={(e) => setAppointmentForm(p => ({ ...p, medico_id: e.target.value }))}
                required
              >
                <option value="">-- Seleccione Médico --</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.rol || 'Médico'})
                  </option>
                ))}
              </select>
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
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Hora Inicio <span className="req">*</span>
                </label>
                <div className="relative flex items-center">
                  <Clock size={16} className="absolute left-3 text-brand-slate pointer-events-none z-10" />
                  <input
                    type="time"
                    className="form-control pl-9 bg-white cursor-pointer h-[42px]"
                    value={appointmentForm.hora_inicio}
                    onChange={e => setAppointmentForm(p => ({ ...p, hora_inicio: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hora Fin <span className="req">*</span>
                </label>
                <div className="relative flex items-center">
                  <Clock size={16} className="absolute left-3 text-brand-slate pointer-events-none z-10" />
                  <input
                    type="time"
                    className="form-control pl-9 bg-white cursor-pointer h-[42px]"
                    value={appointmentForm.hora_fin}
                    onChange={e => setAppointmentForm(p => ({ ...p, hora_fin: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Motivo de Consulta */}
            <div className="form-group">
              <label className="form-label">Motivo de consulta</label>
              <Combobox
                items={MOTIVOS_DEFAULT}
                value={appointmentForm.motivo}
                onChange={(val) => setAppointmentForm(p => ({ ...p, motivo: val }))}
                placeholder="Seleccionar o escribir motivo…"
                searchPlaceholder="Buscar motivo…"
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

            <DialogFooter className="pt-3 flex justify-between gap-3 border-t border-gray-100">
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Agendando…' : 'Confirmar Cita'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL EDITAR / REAGENDAR CITA ================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <Pencil className="text-brand-teal" size={20} />
              Editar / Reagendar Cita
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Modifique el horario, médico o estado. Si cambian las fechas, el sistema marcará automáticamente la cita como Reagendada.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2.5 shadow-2xs">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 py-2">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              <strong>Paciente:</strong> {selectedAppointment ? getPatientDisplayName(selectedAppointment) : '—'}
            </div>

            <div className="form-group">
              <label className="form-label">
                Médico Tratante <span className="req">*</span>
              </label>
              <select
                className="form-control"
                value={appointmentForm.medico_id}
                onChange={(e) => setAppointmentForm(p => ({ ...p, medico_id: e.target.value }))}
                required
              >
                <option value="">-- Seleccione Médico --</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.rol || 'Médico'})
                  </option>
                ))}
              </select>
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
                <input
                  type="time"
                  className="form-control h-[42px]"
                  value={appointmentForm.hora_inicio}
                  onChange={e => setAppointmentForm(p => ({ ...p, hora_inicio: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hora Fin <span className="req">*</span>
                </label>
                <input
                  type="time"
                  className="form-control h-[42px]"
                  value={appointmentForm.hora_fin}
                  onChange={e => setAppointmentForm(p => ({ ...p, hora_fin: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de Cita</label>
              <select
                className="form-control"
                value={appointmentForm.estado}
                onChange={e => setAppointmentForm(p => ({ ...p, estado: e.target.value }))}
              >
                {ESTADOS_CITA.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de consulta</label>
              <input
                type="text"
                className="form-control"
                value={appointmentForm.motivo}
                onChange={e => setAppointmentForm(p => ({ ...p, motivo: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas Adicionales</label>
              <textarea
                className="form-control"
                rows={3}
                value={appointmentForm.notas}
                onChange={e => setAppointmentForm(p => ({ ...p, notas: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-3 flex justify-between gap-3 border-t border-gray-100">
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
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-brand-deep flex items-center gap-2">
              <UserCheck className="text-brand-teal" size={20} />
              Reasignar Paciente
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Seleccione el nuevo paciente que estará asociado a esta cita.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
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

            <DialogFooter className="pt-2 flex justify-between gap-3 border-t border-gray-100">
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
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <XCircle className="text-rose-600" size={20} />
              Cancelar Cita
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-1">
              Esta acción actualizará el estado de la cita a <strong>Cancelada</strong>. Por favor especifique el motivo.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
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

            <DialogFooter className="pt-2 flex justify-between gap-3 border-t border-gray-100">
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
                className="btn bg-rose-600 text-white hover:bg-rose-700"
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
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <UserPlus className="text-brand-teal" size={22} />
              Registrar Nuevo Paciente
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Registre al paciente en la base de datos para seleccionarlo inmediatamente en la cita.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleQuickRegisterPatient} className="flex flex-col gap-4 py-2">
            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Nombre completo <span className="req">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control pl-8"
                    placeholder="Ej. Carlos Pérez"
                    value={patientForm.nombre}
                    onChange={(e) => setPatientForm(p => ({ ...p, nombre: e.target.value }))}
                    required
                  />
                  <User size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Edad</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="form-control"
                  placeholder="Ej. 38"
                  value={patientForm.edad}
                  onChange={(e) => setPatientForm(p => ({ ...p, edad: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Teléfono <span className="req">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control pl-8"
                    placeholder="+503 7890-1234"
                    value={patientForm.telefono}
                    onChange={(e) => setPatientForm(p => ({ ...p, telefono: e.target.value }))}
                    required
                  />
                  <Phone size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lugar de residencia</label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control pl-8"
                    placeholder="Ciudad / Colonia"
                    value={patientForm.lugar_residencia}
                    onChange={(e) => setPatientForm(p => ({ ...p, lugar_residencia: e.target.value }))}
                  />
                  <MapPin size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Estado civil</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Soltero/a, Casado/a..."
                  value={patientForm.estado_civil}
                  onChange={(e) => setPatientForm(p => ({ ...p, estado_civil: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Religión</label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control pl-8"
                    placeholder="Ej. Católica"
                    value={patientForm.religion}
                    onChange={(e) => setPatientForm(p => ({ ...p, religion: e.target.value }))}
                  />
                  <Heart size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 flex justify-between gap-3 border-t border-gray-100">
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

      {/* ================= MODAL DETALLE DE CITA ================= */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <Eye className="text-brand-teal" size={20} />
              Detalle de Cita
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="flex flex-col gap-3 py-2 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Estado:</span>
                <span className={`tag ${tagClass[selectedAppointment.estado] || 'tag-info'}`}>
                  {selectedAppointment.estado}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Paciente:</span>
                <span className="font-semibold text-gray-900">{getPatientDisplayName(selectedAppointment)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Médico:</span>
                <span className="font-medium text-gray-800">{getDoctorDisplayName(selectedAppointment)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Inicio:</span>
                <span className="font-mono text-gray-800">{selectedAppointment.fecha_hora_inicio}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Fin:</span>
                <span className="font-mono text-gray-800">{selectedAppointment.fecha_hora_fin}</span>
              </div>

              <div className="pb-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium block mb-1">Motivo de Consulta:</span>
                <p className="text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {selectedAppointment.motivo || 'Sin motivo registrado'}
                </p>
              </div>

              {selectedAppointment.notas && (
                <div className="pb-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium block mb-1">Notas:</span>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {selectedAppointment.notas}
                  </p>
                </div>
              )}

              {selectedAppointment.motivo_cancelacion && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-rose-800 font-bold block mb-1">Motivo de Cancelación:</span>
                  <p className="text-rose-700 text-xs">
                    {selectedAppointment.motivo_cancelacion}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-gray-100">
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => setShowDetailModal(false)}
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default Citas;
