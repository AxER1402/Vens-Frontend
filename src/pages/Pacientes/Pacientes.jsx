import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { Search, UserX, ClipboardList, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';

const INITIAL = [
  { id: 'P-001', nombre: 'Ana García López',   edad: '39', tel: '+502 5555-1234', residencia: 'Ciudad de Guatemala', estadoCivil: 'Casada', religion: 'Católica', estado: 'Activo' },
  { id: 'P-002', nombre: 'Carlos Méndez Ruiz', edad: '45', tel: '+502 5555-5678', residencia: 'Mixco', estadoCivil: 'Soltero', religion: 'Evangélica', estado: 'Activo' },
  { id: 'P-003', nombre: 'María Velásquez',     edad: '32', tel: '+502 5555-9012', residencia: 'Villa Nueva', estadoCivil: 'Unión Libre', religion: 'Ninguna', estado: 'Seguimiento' },
  { id: 'P-004', nombre: 'Roberto Herrera',     edad: '59', tel: '+502 5555-3456', residencia: 'Ciudad de Guatemala', estadoCivil: 'Casado', religion: 'Católica', estado: 'Activo' },
];

const EMPTY_FORM = { nombre: '', edad: '', tel: '', residencia: '', estadoCivil: '', religion: '', estado: 'Activo' };
const tagClass = { Activo: 'tag-success', Seguimiento: 'tag-warning', Alta: 'tag-info' };

function Pacientes() {
  const [patients, setPatients] = useState(INITIAL);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = patients.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.tel.includes(search);
    const matchEstado = !filterEstado || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const handleSave = (e) => {
    e.preventDefault();
    const id = `P-${String(patients.length + 1).padStart(3, '0')}`;
    setPatients(prev => [{ id, ...form }, ...prev]);
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  return (
    <Layout breadcrumb="Pacientes">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">{patients.length} pacientes registrados en el sistema</p>
        </div>
        <div className="page-actions">
          <button id="btn-nuevo-paciente" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo paciente
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap" style={{ minWidth: 320 }}>
            <span className="search-icon-inner"><Search size={16} /></span>
            <input
              id="search-pacientes"
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o teléfono…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option>Activo</option>
            <option>Seguimiento</option>
            <option>Alta</option>
          </select>
        </div>
        <div className="toolbar-right">
          <span className="text-xs text-muted">{filtered.length} resultado(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Edad</th>
              <th>Teléfono</th>
              <th>Lugar de Residencia</th>
              <th>Est. Civil / Religión</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon"><UserX size={40} /></div>
                    <p>No se encontraron pacientes</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td><span className="text-xs text-muted">{p.id}</span></td>
                <td className="text-medium">{p.nombre}</td>
                <td className="text-muted text-sm">{p.edad} años</td>
                <td className="text-muted">{p.tel}</td>
                <td className="text-muted text-sm">{p.residencia || '—'}</td>
                <td className="text-muted text-sm">{p.estadoCivil || '—'} / {p.religion || '—'}</td>
                <td><span className={`tag ${tagClass[p.estado] || 'tag-info'}`}>{p.estado}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" title="Ver historia"><ClipboardList size={14} /></button>
                    <button className="btn btn-secondary btn-sm" title="Editar"><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* shadcn Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep">Nuevo Paciente</DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Ingrese los datos requeridos para registrar a un nuevo paciente en el sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} id="form-nuevo-paciente" className="flex flex-col gap-4 py-2">
            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Nombre completo <span className="req">*</span></label>
                <input name="nombre" className="form-control" placeholder="Nombre completo"
                  value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Edad</label>
                <input name="edad" type="number" className="form-control" placeholder="Años"
                  value={form.edad} onChange={e => setForm(p => ({ ...p, edad: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Teléfono <span className="req">*</span></label>
                <input name="tel" className="form-control" placeholder="+502 5555-0000"
                  value={form.tel} onChange={e => setForm(p => ({ ...p, tel: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Lugar de residencia</label>
                <input name="residencia" className="form-control" placeholder="Ciudad, Zona..."
                  value={form.residencia} onChange={e => setForm(p => ({ ...p, residencia: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Estado civil</label>
                <Combobox
                  items={['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a']}
                  value={form.estadoCivil}
                  onChange={(val) => setForm(p => ({ ...p, estadoCivil: val }))}
                  placeholder="Seleccionar estado civil…"
                  searchPlaceholder="Buscar estado civil…"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Religión</label>
                <input name="religion" className="form-control" placeholder="Ej: Católica, Evangélica..."
                  value={form.religion} onChange={e => setForm(p => ({ ...p, religion: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado actual del paciente</label>
              <Combobox
                items={['Activo', 'Seguimiento', 'Alta']}
                value={form.estado}
                onChange={(val) => setForm(p => ({ ...p, estado: val }))}
                placeholder="Seleccionar estado…"
                searchPlaceholder="Buscar estado…"
              />
            </div>

            <DialogFooter className="pt-2 flex justify-between gap-3 mt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button id="btn-guardar-paciente" type="submit" className="btn btn-primary">
                Guardar paciente
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default Pacientes;
