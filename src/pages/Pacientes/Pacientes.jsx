import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout/Layout';
import {
  Search,
  UserX,
  ClipboardList,
  Pencil,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Power,
  Phone,
  MapPin,
  Heart,
  User,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '../../context/AuthContext';
import * as patientService from '../../services/patientService';

const EMPTY_FORM = {
  nombre: '',
  edad: '',
  telefono: '',
  lugar_residencia: '',
  estado_civil: '',
  religion: '',
  estado: 'Activo'
};

const ESTADO_CIVIL_OPTIONS = [
  'Soltero/a',
  'Casado/a',
  'Unión Libre',
  'Divorciado/a',
  'Viudo/a'
];

const ESTADO_PATIENT_OPTIONS = [
  'Activo',
  'Seguimiento',
  'Alta'
];

const tagClass = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info'
};

function Pacientes() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterActivo, setFilterActivo] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form & submit state
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Permisos según Backend:
  // - Crear y Editar: administrador, medico, recepcionista
  // - Desactivar / Activar (Toggle): administrador, medico
  const canCreateOrEditPatients = ['administrador', 'medico', 'recepcionista'].includes(user?.rol);
  const canDeactivatePatients = ['administrador', 'medico'].includes(user?.rol);

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const res = await patientService.getPatients({
      search,
      estado: filterEstado,
      activo: filterActivo
    });

    if (res.success && res.data) {
      setPatients(res.data);
    } else {
      setErrorMessage(res.message || 'No se pudo conectar con el servidor.');
    }
    setLoading(false);
  }, [search, filterEstado, filterActivo]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setErrorMessage('');
    setSuccessMessage('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (patient) => {
    setSelectedPatient(patient);
    setForm({
      nombre: patient.nombre || '',
      edad: patient.edad !== null && patient.edad !== undefined ? String(patient.edad) : '',
      telefono: patient.telefono || '',
      lugar_residencia: patient.lugar_residencia || '',
      estado_civil: patient.estado_civil || '',
      religion: patient.religion || '',
      estado: patient.estado || 'Activo'
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowEditModal(true);
  };

  // Open Deactivate / Reactivate Modal
  const handleOpenDeactivate = (patient) => {
    setSelectedPatient(patient);
    setErrorMessage('');
    setShowDeactivateModal(true);
  };

  // Submit Create Patient
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.nombre.trim()) {
      setErrorMessage('El nombre del paciente es obligatorio.');
      return;
    }
    if (!form.telefono.trim()) {
      setErrorMessage('El teléfono del paciente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    const res = await patientService.createPatient(form);

    if (res.success) {
      setSuccessMessage('Paciente registrado exitosamente.');
      setShowCreateModal(false);
      fetchPatients();
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al crear el paciente.');
      }
    }
    setIsSubmitting(false);
  };

  // Submit Edit Patient
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.nombre.trim()) {
      setErrorMessage('El nombre del paciente es obligatorio.');
      return;
    }
    if (!form.telefono.trim()) {
      setErrorMessage('El teléfono del paciente es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    const res = await patientService.updatePatient(selectedPatient.id, form);

    if (res.success) {
      setSuccessMessage('Paciente actualizado exitosamente.');
      setShowEditModal(false);
      fetchPatients();
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al actualizar el paciente.');
      }
    }
    setIsSubmitting(false);
  };

  // Confirm Deactivate or Reactivate Patient
  const handleConfirmToggleActive = async () => {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    setErrorMessage('');

    let res;
    if (selectedPatient.activo) {
      // Use DELETE /api/v1/patients/{id}
      res = await patientService.deactivatePatient(selectedPatient.id);
    } else {
      // Use PATCH /api/v1/patients/{id}/toggle-active
      res = await patientService.toggleActivePatient(selectedPatient.id, true);
    }

    if (res.success) {
      setSuccessMessage(
        res.message || `Paciente ${selectedPatient.activo ? 'desactivado' : 'activado'} exitosamente.`
      );
      setShowDeactivateModal(false);
      fetchPatients();
    } else {
      setErrorMessage(res.message || 'Error al cambiar el estado del paciente.');
    }
    setIsSubmitting(false);
  };

  // Format initials for avatar
  const getInitials = (name) => {
    if (!name) return 'PA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Layout breadcrumb="Pacientes">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">
            Gestión completa del registro, seguimiento y expediente de pacientes.
          </p>
        </div>
        <div className="page-actions">
          {canCreateOrEditPatients ? (
            <button
              id="btn-nuevo-paciente"
              className="btn btn-primary flex items-center gap-2"
              onClick={handleOpenCreate}
            >
              <UserPlus size={16} />
              + Nuevo paciente
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg"
              title="Permisos insuficientes para crear pacientes"
            >
              <ShieldAlert size={14} />
              <span>Modo lectura para rol: {user?.rol}</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner de mensajes de éxito */}
      {successMessage && (
        <div
          className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between shadow-xs"
          style={{ padding: '14px 18px' }}
        >
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

      {/* Toolbar / Filtros */}
      <div className="toolbar">
        <div className="toolbar-left flex flex-wrap gap-3">
          <div className="search-wrap" style={{ minWidth: 320 }}>
            <span className="search-icon-inner">
              <Search size={16} />
            </span>
            <input
              id="search-pacientes"
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 180 }}
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Seguimiento">Seguimiento</option>
            <option value="Alta">Alta</option>
          </select>

          <select
            className="form-control"
            style={{ width: 170 }}
            value={filterActivo}
            onChange={(e) => setFilterActivo(e.target.value)}
          >
            <option value="">Todos (Activación)</option>
            <option value="true">Pacientes Activos</option>
            <option value="false">Pacientes Inactivos</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span className="text-xs text-muted">
            {patients.length} paciente(s) encontrado(s)
          </span>
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Paciente</th>
              <th>Edad</th>
              <th>Teléfono</th>
              <th>Lugar de Residencia</th>
              <th>Est. Civil / Religión</th>
              <th>Estado Clínico</th>
              <th>Activación</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-2 text-brand-slate">
                    <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Cargando pacientes…</span>
                  </div>
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state py-8">
                    <div className="empty-icon text-gray-400 mb-2">
                      <UserX size={40} />
                    </div>
                    <p className="font-medium text-gray-700">No se encontraron pacientes</p>
                    <p className="text-xs text-gray-500">
                      Intente buscando por otro nombre, teléfono o modifique los filtros.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              patients.map((p) => {
                const isPatientActive = Boolean(p.activo);
                return (
                  <tr key={p.id} className={!isPatientActive ? 'opacity-70 bg-gray-50/50' : ''}>
                    <td>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        #{p.id}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-800 shrink-0">
                          {getInitials(p.nombre)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{p.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted text-sm">
                      {p.edad !== null && p.edad !== undefined ? `${p.edad} años` : '—'}
                    </td>
                    <td className="text-muted text-sm font-mono">
                      {p.telefono || '—'}
                    </td>
                    <td className="text-muted text-sm">
                      {p.lugar_residencia || '—'}
                    </td>
                    <td className="text-muted text-sm">
                      {p.estado_civil || '—'} / {p.religion || '—'}
                    </td>
                    <td>
                      <span className={`tag ${tagClass[p.estado] || 'tag-info'}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td>
                      {isPatientActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          title="Ver Historia Clínica"
                        >
                          <ClipboardList size={14} />
                          <span className="hidden sm:inline">Historia</span>
                        </button>

                        {canCreateOrEditPatients && (
                          <button
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            title="Editar paciente"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil size={14} />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                        )}

                        {canDeactivatePatients && (
                          <button
                            className={`btn btn-sm flex items-center gap-1 ${
                              isPatientActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={isPatientActive ? 'Desactivar paciente' : 'Activar paciente'}
                            onClick={() => handleOpenDeactivate(p)}
                          >
                            <Power size={14} />
                            <span className="hidden sm:inline">
                              {isPatientActive ? 'Desactivar' : 'Activar'}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL CREAR PACIENTE ================= */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <UserPlus className="text-brand-teal" size={22} />
              Nuevo Paciente
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Ingrese los datos del paciente para registrarlo en la plataforma.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2.5 shadow-2xs"
              style={{ padding: '12px 16px' }}
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} id="form-nuevo-paciente" className="flex flex-col gap-4 py-2">
            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Nombre completo <span className="req">*</span>
                </label>
                <div className="relative">
                  <input
                    name="nombre"
                    type="text"
                    className="form-control pl-8"
                    placeholder="Ej. María Eugenia López"
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    required
                  />
                  <User size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Edad</label>
                <div className="relative">
                  <input
                    name="edad"
                    type="number"
                    min="0"
                    max="120"
                    className="form-control pl-8"
                    placeholder="Ej. 42"
                    value={form.edad}
                    onChange={(e) => setForm((p) => ({ ...p, edad: e.target.value }))}
                  />
                  <Calendar size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Teléfono <span className="req">*</span>
                </label>
                <div className="relative">
                  <input
                    name="telefono"
                    type="text"
                    className="form-control pl-8"
                    placeholder="+503 7890-1234"
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    required
                  />
                  <Phone size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lugar de residencia</label>
                <div className="relative">
                  <input
                    name="lugar_residencia"
                    type="text"
                    className="form-control pl-8"
                    placeholder="Colonia Escalón, San Salvador"
                    value={form.lugar_residencia}
                    onChange={(e) => setForm((p) => ({ ...p, lugar_residencia: e.target.value }))}
                  />
                  <MapPin size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Estado civil</label>
                <Combobox
                  items={ESTADO_CIVIL_OPTIONS}
                  value={form.estado_civil}
                  onChange={(val) => setForm((p) => ({ ...p, estado_civil: val }))}
                  placeholder="Seleccionar estado civil…"
                  searchPlaceholder="Buscar estado civil…"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Religión</label>
                <div className="relative">
                  <input
                    name="religion"
                    type="text"
                    className="form-control pl-8"
                    placeholder="Ej. Católica"
                    value={form.religion}
                    onChange={(e) => setForm((p) => ({ ...p, religion: e.target.value }))}
                  />
                  <Heart size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado actual del paciente</label>
              <Combobox
                items={ESTADO_PATIENT_OPTIONS}
                value={form.estado}
                onChange={(val) => setForm((p) => ({ ...p, estado: val }))}
                placeholder="Seleccionar estado…"
                searchPlaceholder="Buscar estado…"
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
                id="btn-guardar-paciente"
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando…' : 'Guardar paciente'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL EDITAR PACIENTE ================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <Pencil className="text-brand-teal" size={20} />
              Editar Paciente #{selectedPatient?.id}
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Actualice los datos del paciente registrado en el sistema.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2.5 shadow-2xs"
              style={{ padding: '12px 16px' }}
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 py-2">
            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Nombre completo <span className="req">*</span>
                </label>
                <input
                  name="nombre"
                  type="text"
                  className="form-control"
                  placeholder="Nombre completo"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Edad</label>
                <input
                  name="edad"
                  type="number"
                  min="0"
                  max="120"
                  className="form-control"
                  placeholder="Años"
                  value={form.edad}
                  onChange={(e) => setForm((p) => ({ ...p, edad: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  Teléfono <span className="req">*</span>
                </label>
                <input
                  name="telefono"
                  type="text"
                  className="form-control"
                  placeholder="+503 7890-1234"
                  value={form.telefono}
                  onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lugar de residencia</label>
                <input
                  name="lugar_residencia"
                  type="text"
                  className="form-control"
                  placeholder="Ciudad, Colonia..."
                  value={form.lugar_residencia}
                  onChange={(e) => setForm((p) => ({ ...p, lugar_residencia: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Estado civil</label>
                <Combobox
                  items={ESTADO_CIVIL_OPTIONS}
                  value={form.estado_civil}
                  onChange={(val) => setForm((p) => ({ ...p, estado_civil: val }))}
                  placeholder="Seleccionar estado civil…"
                  searchPlaceholder="Buscar estado civil…"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Religión</label>
                <input
                  name="religion"
                  type="text"
                  className="form-control"
                  placeholder="Ej. Católica"
                  value={form.religion}
                  onChange={(e) => setForm((p) => ({ ...p, religion: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado actual del paciente</label>
              <Combobox
                items={ESTADO_PATIENT_OPTIONS}
                value={form.estado}
                onChange={(val) => setForm((p) => ({ ...p, estado: val }))}
                placeholder="Seleccionar estado…"
                searchPlaceholder="Buscar estado…"
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

      {/* ================= MODAL DESACTIVAR / REACTIVAR PACIENTE ================= */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Power
                className={selectedPatient?.activo ? 'text-rose-600' : 'text-emerald-600'}
                size={20}
              />
              {selectedPatient?.activo ? 'Desactivar Paciente' : 'Activar Paciente'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2">
              {selectedPatient?.activo ? (
                <>
                  ¿Estás seguro de que deseas desactivar al paciente{' '}
                  <strong>{selectedPatient?.nombre}</strong> (ID: #{selectedPatient?.id})?
                  <br />
                  El paciente quedará desactivado lógicamente (<em>activo: false</em>).
                </>
              ) : (
                <>
                  ¿Deseas activar al paciente <strong>{selectedPatient?.nombre}</strong> (ID: #{selectedPatient?.id})?
                  <br />
                  El paciente volverá a figurar como activo en el sistema.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2 shadow-2xs"
              style={{ padding: '12px 16px' }}
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDeactivateModal(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`btn ${
                selectedPatient?.activo ? 'bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'
              }`}
              onClick={handleConfirmToggleActive}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Procesando…'
                : selectedPatient?.activo
                ? 'Sí, Desactivar'
                : 'Sí, Activar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default Pacientes;
