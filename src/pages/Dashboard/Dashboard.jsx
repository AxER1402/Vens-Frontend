import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import {
  Users, Calendar, Stethoscope, Activity, ChevronRight,
  ClipboardList, CalendarX, RefreshCw
} from 'lucide-react';
import * as patientService from '../../services/patientService';
import * as appointmentService from '../../services/appointmentService';
import './Dashboard.css';

const PATIENT_TAG = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info'
};

const APPT_TAG = {
  Programada: 'tag-info',
  Confirmada: 'tag-success',
  Reagendada: 'tag-warning',
  Completada: 'tag-primary',
  Cancelada: 'tag-danger'
};

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  const s = String(dateTimeStr).trim();
  const sep = s.includes('T') ? 'T' : ' ';
  return (s.split(sep)[1] || '').substring(0, 5);
};

const getInitials = (name) => {
  if (!name) return 'PA';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getPatientName = (appointment, patients) => {
  if (appointment.paciente?.nombre) return appointment.paciente.nombre;
  if (appointment.patient?.nombre) return appointment.patient.nombre;
  const p = patients.find(x => Number(x.id) === Number(appointment.patient_id));
  return p ? p.nombre : `Paciente #${appointment.patient_id || '—'}`;
};

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);

  const todayFormatted = today.toLocaleDateString('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError('');

      const [patientsRes, todayRes, monthRes] = await Promise.all([
        patientService.getPatients(),
        appointmentService.getAppointments({ date: todayISO }),
        appointmentService.getAppointments({
          year: today.getFullYear(),
          month: today.getMonth() + 1
        })
      ]);

      if (!isMounted) return;

      if (patientsRes.success) setPatients(patientsRes.data || []);
      if (todayRes.success) setTodayAppointments(todayRes.data || []);
      if (monthRes.success) setMonthAppointments(monthRes.data || []);

      if (!patientsRes.success || !todayRes.success || !monthRes.success) {
        setLoadError('No se pudieron cargar todos los datos del resumen.');
      }
      setLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [todayISO, today]);

  const stats = useMemo(() => {
    const activos = patients.filter(p => Boolean(p.activo)).length;
    const seguimiento = patients.filter(p => p.estado === 'Seguimiento').length;
    const porConfirmar = todayAppointments.filter(a => a.estado === 'Programada').length;
    const confirmadasMes = monthAppointments.filter(a => a.estado === 'Confirmada').length;

    return [
      {
        to: '/pacientes',
        label: 'Pacientes registrados',
        value: patients.length,
        detail: `${activos} activos`,
        icon: <Users size={20} />
      },
      {
        to: '/citas',
        label: 'Citas de hoy',
        value: todayAppointments.length,
        detail: porConfirmar > 0 ? `${porConfirmar} por confirmar` : 'todas confirmadas',
        icon: <Calendar size={20} />
      },
      {
        to: '/citas',
        label: 'Citas del mes',
        value: monthAppointments.length,
        detail: `${confirmadasMes} confirmadas`,
        icon: <Stethoscope size={20} />
      },
      {
        to: '/pacientes',
        label: 'En seguimiento',
        value: seguimiento,
        detail: 'pacientes en control',
        icon: <Activity size={20} />
      }
    ];
  }, [patients, todayAppointments, monthAppointments]);

  const recentPatients = useMemo(
    () => [...patients].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5),
    [patients]
  );

  const sortedTodayAppointments = useMemo(
    () => [...todayAppointments].sort((a, b) =>
      String(a.fecha_hora_inicio || '').localeCompare(String(b.fecha_hora_inicio || ''))
    ),
    [todayAppointments]
  );

  return (
    <Layout breadcrumb="Dashboard">
      <div className="flat-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Inicio</h1>
            <p className="page-subtitle">
              Resumen general — <span className="capitalize">{todayFormatted}</span>
            </p>
          </div>
          <div className="page-actions">
            <Link to="/citas" className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <Calendar size={14} /> Ver agenda
            </Link>
            <Link to="/historia-clinica" className="btn btn-primary btn-sm flex items-center gap-1.5">
              <ClipboardList size={14} /> Nueva historia
            </Link>
          </div>
        </div>

        {loadError && (
          <div className="notice notice-danger">
            <span className="notice-body">{loadError}</span>
          </div>
        )}

        {/* Indicadores */}
        <div className="stat-grid">
          {stats.map((s, i) => (
            <Link to={s.to} className="stat-card" key={i} title={`Ir a ${s.label}`}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{loading ? '—' : s.value}</div>
                <div className="stat-change neutral">
                  <span>{loading ? 'cargando…' : s.detail}</span>
                </div>
              </div>
              <div className="stat-icon stat-icon-rose">{s.icon}</div>
            </Link>
          ))}
        </div>

        <div className="dashboard-grid">

          {/* Pacientes recientes */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">
                <Users size={14} />
                Pacientes recientes
                <span className="panel-sub">últimos registros</span>
              </span>
              <Link to="/pacientes" className="btn btn-secondary btn-sm flex items-center gap-1">
                Ver todos <ChevronRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="panel-empty flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Cargando pacientes…
              </div>
            ) : recentPatients.length === 0 ? (
              <div className="panel-empty">Aún no hay pacientes registrados.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Teléfono</th>
                      <th>Residencia</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map(p => (
                      <tr key={p.id} className={p.activo ? '' : 'row-off'}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar-sq">{getInitials(p.nombre)}</div>
                            <div>
                              <div className="font-semibold text-brand-text">{p.nombre}</div>
                              <div className="id-chip">#{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted">{p.telefono || '—'}</td>
                        <td className="text-muted">{p.lugar_residencia || '—'}</td>
                        <td>
                          <span className={`tag ${PATIENT_TAG[p.estado] || 'tag-info'}`}>
                            {p.estado || 'Activo'}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/historia-clinica?patientId=${p.id}`}
                            className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                            title="Ver historia clínica"
                          >
                            <ClipboardList size={13} /> Historia
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Citas de hoy */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">
                <Calendar size={14} />
                Citas de hoy
                <span className="panel-sub">
                  {loading ? '—' : `${sortedTodayAppointments.length} agendadas`}
                </span>
              </span>
            </div>

            {loading ? (
              <div className="panel-empty flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Cargando agenda…
              </div>
            ) : sortedTodayAppointments.length === 0 ? (
              <div className="panel-empty flex flex-col items-center gap-2">
                <CalendarX size={28} className="text-brand-text-light" />
                No hay citas programadas para hoy.
              </div>
            ) : (
              sortedTodayAppointments.map(a => (
                <div className="appt-row" key={a.id}>
                  <span className="appt-hour">{parseTime(a.fecha_hora_inicio) || '—'}</span>
                  <div className="appt-main">
                    <div className="appt-name">{getPatientName(a, patients)}</div>
                    <div className="appt-motivo">{a.motivo || 'Sin motivo'}</div>
                  </div>
                  <span className={`tag ${APPT_TAG[a.estado] || 'tag-info'}`}>{a.estado}</span>
                </div>
              ))
            )}

            <div className="panel-foot">
              <Link to="/citas" className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
                <Calendar size={13} /> Gestionar agenda completa
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
