import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { CalendarX, Eye, Pencil, Calendar, Clock } from 'lucide-react';
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

const PATIENTS = ['Ana García López', 'Carlos Méndez Ruiz', 'María Velásquez', 'Roberto Herrera', 'Sofía Ramírez Cruz', 'Julio Torres', 'Laura Morales'];
const TIPOS = ['Consulta inicial', 'Seguimiento vascular', 'Control post-op', 'Doppler venoso', 'Primera consulta', 'Urgencia vascular'];

const INITIAL_CITAS = [
  { id: 'C-001', paciente: 'Ana García López', fecha: '2026-07-25', hora: '08:00', tipo: 'Consulta inicial', estado: 'Confirmada' },
  { id: 'C-002', paciente: 'Carlos Méndez Ruiz', fecha: '2026-07-25', hora: '09:30', tipo: 'Seguimiento vascular', estado: 'Confirmada' },
  { id: 'C-003', paciente: 'María Velásquez', fecha: '2026-07-25', hora: '11:00', tipo: 'Control post-op', estado: 'Pendiente' },
  { id: 'C-004', paciente: 'Julio Torres', fecha: '2026-07-25', hora: '14:00', tipo: 'Doppler venoso', estado: 'Confirmada' },
  { id: 'C-005', paciente: 'Laura Morales', fecha: '2026-07-26', hora: '09:00', tipo: 'Primera consulta', estado: 'Pendiente' },
  { id: 'C-006', paciente: 'Roberto Herrera', fecha: '2026-07-26', hora: '10:30', tipo: 'Seguimiento vascular', estado: 'Confirmada' },
  { id: 'C-007', paciente: 'Sofía Ramírez Cruz', fecha: '2026-07-28', hora: '15:00', tipo: 'Control post-op', estado: 'Cancelada' },
];

const EMPTY = { paciente: '', fecha: '', hora: '', tipo: '', notas: '' };
const tagClass = { Confirmada: 'tag-success', Pendiente: 'tag-warning', Cancelada: 'tag-danger' };

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es-GT', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

function Citas() {
  const [citas, setCitas] = useState(INITIAL_CITAS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filterDate, setFilterDate] = useState('');

  const filtered = citas.filter(c => !filterDate || c.fecha === filterDate);
  const grouped = filtered.reduce((acc, c) => { acc[c.fecha] = acc[c.fecha] || []; acc[c.fecha].push(c); return acc; }, {});

  const handleSave = (e) => {
    e.preventDefault();
    const id = `C-${String(citas.length + 1).padStart(3, '0')}`;
    setCitas(prev => [{ id, ...form, estado: 'Pendiente' }, ...prev]);
    setShowModal(false);
    setForm(EMPTY);
  };

  return (
    <Layout breadcrumb="Citas">
      <div className="page-header">
        <div>
          <h1 className="page-title">Citas</h1>
          <p className="page-subtitle">{citas.length} citas programadas en el sistema</p>
        </div>
        <div className="page-actions">
          <input
            type="date" className="form-control" style={{ width: 180 }}
            value={filterDate} onChange={e => setFilterDate(e.target.value)}
          />
          <button id="btn-agendar-cita" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Agendar cita
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="citas-summary">
        {[
          { label: 'Confirmadas', count: citas.filter(c => c.estado === 'Confirmada').length, cls: 'sum-ok' },
          { label: 'Pendientes', count: citas.filter(c => c.estado === 'Pendiente').length, cls: 'sum-pend' },
          { label: 'Canceladas', count: citas.filter(c => c.estado === 'Cancelada').length, cls: 'sum-cancel' },
          { label: 'Total', count: citas.length, cls: 'sum-total' },
        ].map((s, i) => (
          <div key={i} className={`cita-sum ${s.cls}`}>
            <span className="cita-sum-count">{s.count}</span>
            <span className="cita-sum-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).sort().map(date => (
        <div key={date} className="citas-group">
          <div className="citas-group-head">
            <span className="citas-group-date">{fmtDate(date)}</span>
            <span className="tag tag-info">{grouped[date].length} cita(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Hora</th><th>Paciente</th><th>Tipo</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grouped[date].map(c => (
                  <tr key={c.id}>
                    <td><span className="text-xs text-muted">{c.id}</span></td>
                    <td><span className="cita-hora">{c.hora}</span></td>
                    <td className="text-medium">{c.paciente}</td>
                    <td>{c.tipo}</td>
                    <td><span className={`tag ${tagClass[c.estado] || 'tag-info'}`}>{c.estado}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm"><Eye size={14} /></button>
                        <button className="btn btn-secondary btn-sm"><Pencil size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><CalendarX size={40} /></div>
          <p>No hay citas para la fecha seleccionada.</p>
        </div>
      )}

      {/* shadcn Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep">Agendar Cita</DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Complete la información de la cita para agendarla en la agenda médica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} id="form-agendar-cita" className="flex flex-col gap-4 py-2">
            <div className="form-group">
              <label className="form-label">Paciente <span className="req">*</span></label>
              <Combobox
                items={PATIENTS}
                value={form.paciente}
                onChange={(val) => setForm(p => ({ ...p, paciente: val }))}
                placeholder="Seleccionar paciente…"
                searchPlaceholder="Buscar paciente por nombre…"
              />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Fecha <span className="req">*</span></label>
                <DatePicker
                  value={form.fecha}
                  onChange={(val) => setForm(p => ({ ...p, fecha: val }))}
                  placeholder="Seleccionar fecha…"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hora <span className="req">*</span></label>
                <div className="relative flex items-center">
                  <Clock size={16} className="absolute left-3 text-brand-slate pointer-events-none z-10" />
                  <input
                    type="time"
                    className="form-control pl-9 bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer h-[42px]"
                    value={form.hora}
                    onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de consulta <span className="req">*</span></label>
              <Combobox
                items={TIPOS}
                value={form.tipo}
                onChange={(val) => setForm(p => ({ ...p, tipo: val }))}
                placeholder="Seleccionar tipo de consulta…"
                searchPlaceholder="Buscar tipo de consulta…"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea className="form-control" rows={3} placeholder="Observaciones…"
                value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
            </div>

            <DialogFooter className="pt-2 flex justify-between gap-3 mt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button id="btn-guardar-cita" type="submit" className="btn btn-primary">
                Confirmar cita
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default Citas;
