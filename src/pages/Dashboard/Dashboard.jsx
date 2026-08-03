import { Link } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { 
  Users, Calendar, Stethoscope, Clipboard, UserPlus, BarChart3, 
  TrendingUp, TrendingDown, Minus, ChevronRight, Phone, Clock, 
  ClipboardList 
} from 'lucide-react';
import './Dashboard.css';

const stats = [
  { 
    to: '/pacientes',
    label: 'Total Pacientes', 
    value: '248', 
    change: '+12 este mes', 
    trend: 'up', 
    icon: <Users size={24} />, 
    cls: 'stat-icon-rose' 
  },
  { 
    to: '/citas',
    label: 'Citas Hoy', 
    value: '14', 
    change: '3 pendientes', 
    trend: 'neutral', 
    icon: <Calendar size={24} />, 
    cls: 'stat-icon-plum' 
  },
  { 
    to: '/historia-clinica',
    label: 'Consultas / Mes', 
    value: '186', 
    change: '+8% vs anterior', 
    trend: 'up', 
    icon: <Stethoscope size={24} />, 
    cls: 'stat-icon-sage' 
  },
  { 
    to: '/reportes',
    label: 'Sin completar', 
    value: '17', 
    change: 'historias abiertas', 
    trend: 'down', 
    icon: <Clipboard size={24} />, 
    cls: 'stat-icon-amber' 
  },
];

const recentPatients = [
  { id: 'P-001', initials: 'AG', name: 'Ana García López',   tel: '+502 5555-1234', last: '22 Jul 2026', estado: 'Activo', statusType: 'success' },
  { id: 'P-002', initials: 'CM', name: 'Carlos Méndez Ruiz', tel: '+502 5555-5678', last: '21 Jul 2026', estado: 'Activo', statusType: 'success' },
  { id: 'P-003', initials: 'MV', name: 'María Velásquez',     tel: '+502 5555-9012', last: '20 Jul 2026', estado: 'Seguimiento', statusType: 'warning' },
  { id: 'P-004', initials: 'RH', name: 'Roberto Herrera',     tel: '+502 5555-3456', last: '19 Jul 2026', estado: 'Activo', statusType: 'success' },
  { id: 'P-005', initials: 'SR', name: 'Sofía Ramírez Cruz', tel: '+502 5555-7890', last: '18 Jul 2026', estado: 'Alta', statusType: 'info' },
];

const appointments = [
  { hour: '08:00', period: 'AM', patient: 'Ana García López',  type: 'Consulta inicial', status: 'Confirmada', statusType: 'success' },
  { hour: '09:30', period: 'AM', patient: 'Carlos Méndez',    type: 'Seguimiento vascular', status: 'En espera', statusType: 'warning' },
  { hour: '11:00', period: 'AM', patient: 'María Velásquez',   type: 'Control post-op', status: 'Confirmada', statusType: 'success' },
  { hour: '02:00', period: 'PM', patient: 'Julio Torres',      type: 'Doppler venoso', status: 'Confirmada', statusType: 'success' },
  { hour: '03:30', period: 'PM', patient: 'Laura Morales',     type: 'Primera consulta', status: 'Pendiente', statusType: 'info' },
];

function Dashboard() {
  const todayFormatted = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <Layout breadcrumb="Dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="page-subtitle">Resumen general — <span className="capitalize">{todayFormatted}</span></p>
        </div>
        <div className="page-actions">
          <Link to="/citas" className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Calendar size={15} /> Ver agenda
          </Link>
          <Link to="/historia-clinica" className="btn btn-primary btn-sm flex items-center gap-1.5">
            <ClipboardList size={15} /> + Nueva historia
          </Link>
        </div>
      </div>

      {/* Interactive Stat Cards Grid */}
      <div className="grid grid-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <Link to={s.to} className="stat-card" key={i} title={`Ir a ${s.label}`}>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-change ${s.trend}`}>
                {s.trend === 'up' ? <TrendingUp size={13} /> : s.trend === 'down' ? <TrendingDown size={13} /> : <Minus size={13} />}
                <span>{s.change}</span>
              </div>
            </div>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid: Recent Patients Table + Today's Appointments */}
      <div className="dashboard-grid mb-6">

        {/* Recent Patients Table */}
        <div className="card-base">
          <div className="card-header-row flex items-center justify-between p-5 border-b border-border-light">
            <div>
              <h3 className="text-lg font-semibold text-brand-deep">Pacientes recientes</h3>
              <p className="text-xs text-muted mt-0.5">Últimas interacciones registradas</p>
            </div>
            <Link to="/pacientes" className="btn btn-secondary btn-xs flex items-center gap-1">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table-enhanced">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Teléfono</th>
                  <th>Última visita</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recentPatients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="patient-avatar">{p.initials}</div>
                        <div>
                          <div className="font-semibold text-brand-deep">{p.name}</div>
                          <div className="text-xs text-muted">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-brand-warm">
                        <Phone size={13} className="text-muted" />
                        <span>{p.tel}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-brand-warm">{p.last}</span>
                    </td>
                    <td>
                      <span className={`status-dot-pill ${p.statusType}`}>
                        <span className={`status-dot ${p.statusType}`}></span>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to="/historia-clinica" 
                        className="btn btn-ghost btn-xs text-brand-slate hover:bg-brand-surface-alt flex items-center gap-1 justify-end ml-auto"
                        title="Ver Historia Clínica"
                      >
                        <ClipboardList size={14} />
                        <span>Ver HC</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Appointments List */}
        <div className="card-base">
          <div className="card-header-row flex items-center justify-between p-5 border-b border-border-light">
            <div>
              <h3 className="text-lg font-semibold text-brand-deep">Citas de hoy</h3>
              <p className="text-xs text-muted mt-0.5">{appointments.length} agendadas para hoy</p>
            </div>
            <Link to="/citas" className="btn btn-secondary btn-xs flex items-center gap-1">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {appointments.map((a, i) => (
              <div className="appt-card-item" key={i}>
                <div className="appt-time-pill">
                  <span className="appt-time-hour">{a.hour}</span>
                  <span className="appt-time-period">{a.period}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-brand-deep truncate">{a.patient}</div>
                  <div className="text-xs text-muted truncate mt-0.5 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{a.type}</span>
                  </div>
                </div>
                <span className={`status-dot-pill ${a.statusType}`}>
                  <span className={`status-dot ${a.statusType}`}></span>
                  {a.status}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 pt-0">
            <Link to="/citas" className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
              <Calendar size={14} />
              <span>Gestionar agenda completa</span>
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default Dashboard;
