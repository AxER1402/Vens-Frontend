import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { Download, Clipboard, CheckCircle, Clock, BarChart3, Eye, Printer, Calendar } from 'lucide-react';

const DATA = [
  { id: 'R-001', paciente: 'Ana García López',   fecha: '2026-07-22', tipo: 'Historia clínica',  dx: 'Vasculopatía periférica',    medico: 'Dr. Ramírez', estado: 'Completo' },
  { id: 'R-002', paciente: 'Carlos Méndez Ruiz', fecha: '2026-07-21', tipo: 'Doppler venoso',     dx: 'Insuf. venosa crónica',      medico: 'Dr. Ramírez', estado: 'Completo' },
  { id: 'R-003', paciente: 'María Velásquez',     fecha: '2026-07-20', tipo: 'Control post-op',   dx: 'Bypass femoro-poplíteo',     medico: 'Dr. Ramírez', estado: 'Pendiente' },
  { id: 'R-004', paciente: 'Roberto Herrera',     fecha: '2026-07-19', tipo: 'Historia clínica',  dx: 'Aneurisma aorta abdominal',  medico: 'Dr. Ramírez', estado: 'Completo' },
  { id: 'R-005', paciente: 'Sofía Ramírez Cruz',  fecha: '2026-07-18', tipo: 'Primera consulta',  dx: 'Varices MMII bilaterales',   medico: 'Dr. Ramírez', estado: 'Completo' },
  { id: 'R-006', paciente: 'Julio Torres',        fecha: '2026-07-17', tipo: 'Doppler venoso',     dx: 'TVP segmento femoral',       medico: 'Dr. Ramírez', estado: 'Revisión' },
  { id: 'R-007', paciente: 'Laura Morales',       fecha: '2026-07-16', tipo: 'Historia clínica',  dx: 'Arteroesclerosis MMII',      medico: 'Dr. Ramírez', estado: 'Completo' },
  { id: 'R-008', paciente: 'Fernando Castillo',   fecha: '2026-07-15', tipo: 'Control post-op',   dx: 'Stent ilíaco bilateral',     medico: 'Dr. Ramírez', estado: 'Pendiente' },
];

const TIPOS    = [...new Set(DATA.map(r => r.tipo))];
const PATIENTS = [...new Set(DATA.map(r => r.paciente))];
const tagClass = { Completo: 'tag-success', Pendiente: 'tag-warning', Revisión: 'tag-info' };

function Reportes() {
  const [filters, setFilters] = useState({ desde: '', hasta: '', tipo: '', paciente: '' });
  const [results, setResults] = useState(DATA);
  const [searched, setSearched] = useState(false);

  const applyFilters = (e) => {
    e.preventDefault();
    let r = [...DATA];
    if (filters.desde)    r = r.filter(x => x.fecha >= filters.desde);
    if (filters.hasta)    r = r.filter(x => x.fecha <= filters.hasta);
    if (filters.tipo)     r = r.filter(x => x.tipo === filters.tipo);
    if (filters.paciente) r = r.filter(x => x.paciente === filters.paciente);
    setResults(r);
    setSearched(true);
  };

  const clear = () => {
    setFilters({ desde: '', hasta: '', tipo: '', paciente: '' });
    setResults(DATA);
    setSearched(false);
  };

  const exportCSV = () => {
    const header = ['ID','Paciente','Fecha','Tipo','Diagnóstico','Médico','Estado'];
    const rows   = results.map(r => [r.id, r.paciente, r.fecha, r.tipo, r.dx, r.medico, r.estado]);
    const csv    = [header, ...rows].map(row => row.join(',')).join('\n');
    const url    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a      = document.createElement('a');
    a.href = url; a.download = `reportes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const ch = (e) => setFilters(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Layout breadcrumb="Reportes">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Consulta y exporta reportes clínicos del sistema</p>
        </div>
        <div className="page-actions">
          <button id="btn-exportar" className="btn btn-primary" onClick={exportCSV}>
            <Download size={16} className="mr-2" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="reportes-stats">
        {[
          { icon: <Clipboard size={26} />, val: DATA.length,                                      label: 'Total de reportes' },
          { icon: <CheckCircle size={26} />, val: DATA.filter(r => r.estado === 'Completo').length,  label: 'Completados' },
          { icon: <Clock size={26} />, val: DATA.filter(r => r.estado !== 'Completo').length,  label: 'Pendientes / Revisión' },
        ].map((s, i) => (
          <div className="rep-stat" key={i}>
            <div className="rep-stat-icon flex justify-center mb-2 text-primary">{s.icon}</div>
            <div className="rep-stat-val">{s.val}</div>
            <div className="rep-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="reportes-filter-card">
        <div className="section-header mb-4">
          <span className="section-bar"></span>
          <span className="section-title">Filtros de búsqueda</span>
        </div>
        <form onSubmit={applyFilters} id="form-filtros-reportes">
          <div className="filter-grid">
            <div className="form-group col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">Rango de fechas (Date Range)</label>
                <div className="flex gap-1.5">
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-xs text-xs py-0.5 px-2"
                    onClick={() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                      const today = now.toISOString().split('T')[0];
                      setFilters(p => ({ ...p, desde: firstDay, hasta: today }));
                    }}
                  >
                    Este mes
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-xs text-xs py-0.5 px-2"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
                      setFilters(p => ({ ...p, desde: thirtyDaysAgo, hasta: today }));
                    }}
                  >
                    Últimos 30 días
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-brand-surface border border-brand-border-light rounded-lg p-1.5">
                <div className="relative flex-1 flex items-center">
                  <Calendar size={15} className="absolute left-2.5 text-brand-slate pointer-events-none" />
                  <input 
                    name="desde" 
                    type="date" 
                    className="form-control pl-8 text-xs h-9 border-none bg-transparent" 
                    value={filters.desde} 
                    onChange={ch} 
                  />
                </div>
                <span className="text-brand-text-muted font-medium text-xs">➔</span>
                <div className="relative flex-1 flex items-center">
                  <Calendar size={15} className="absolute left-2.5 text-brand-slate pointer-events-none" />
                  <input 
                    name="hasta" 
                    type="date" 
                    className="form-control pl-8 text-xs h-9 border-none bg-transparent" 
                    value={filters.hasta} 
                    onChange={ch} 
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de reporte</label>
              <select name="tipo" className="form-control" value={filters.tipo} onChange={ch}>
                <option value="">Todos los tipos</option>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Paciente</label>
              <select name="paciente" className="form-control" value={filters.paciente} onChange={ch}>
                <option value="">Todos los pacientes</option>
                {PATIENTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center" style={{ paddingTop: 22 }}>
              <button id="btn-buscar-reportes" type="submit" className="btn btn-primary">Buscar</button>
              {searched && <button type="button" className="btn btn-secondary" onClick={clear}>Limpiar</button>}
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="rep-results">
        <div className="rep-results-head">
          <div>
            <span className="card-title-text">Resultados</span>
            <span className="text-muted text-sm"> — {results.length} registro(s)</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={14} className="mr-1" /> Exportar selección</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Paciente</th><th>Fecha</th><th>Tipo</th>
                <th>Diagnóstico</th><th>Médico</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon"><BarChart3 size={40} /></div>
                      <p>No se encontraron registros con los filtros aplicados</p>
                    </div>
                  </td>
                </tr>
              ) : results.map(r => (
                <tr key={r.id}>
                  <td><span className="text-xs text-muted">{r.id}</span></td>
                  <td className="text-medium">{r.paciente}</td>
                  <td className="text-muted text-sm">{r.fecha}</td>
                  <td><span className="tag tag-info">{r.tipo}</span></td>
                  <td className="text-sm">{r.dx}</td>
                  <td className="text-muted text-sm">{r.medico}</td>
                  <td><span className={`tag ${tagClass[r.estado] || 'tag-info'}`}>{r.estado}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm"><Eye size={14} /></button>
                      <button className="btn btn-secondary btn-sm"><Printer size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default Reportes;
