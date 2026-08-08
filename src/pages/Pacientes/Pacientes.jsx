import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Activity,
  ShieldAlert
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
import {
  PatientFormFields,
  EMPTY_PATIENT_FORM,
  ESTADO_PATIENT_OPTIONS
} from '@/components/forms/PatientFormFields';
import { useAuth } from '../../context/AuthContext';
import * as patientService from '../../services/patientService';

const ACTIVACION_FILTER_OPTIONS = [
  { value: 'true', label: 'Pacientes Activos' },
  { value: 'false', label: 'Pacientes Inactivos' }
];

const tagClass = {
  Activo: 'tag-success',
  Seguimiento: 'tag-warning',
  Alta: 'tag-info'
};

function Pacientes() {
  const navigate = useNavigate();
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
  const [form, setForm] = useState(EMPTY_PATIENT_FORM);
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
    setForm(EMPTY_PATIENT_FORM);
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
      <div className="flat-page">
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
              className="notice notice-warning notice-flush"
              title="Permisos insuficientes para crear pacientes"
            >
              <span className="notice-body">
                <ShieldAlert size={14} />
                Modo lectura para rol: {user?.rol}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Banner de mensajes de éxito */}
      {successMessage && (
        <div className="notice notice-success">
          <span className="notice-body">
            <CheckCircle2 size={16} />
            {successMessage}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
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

          <div style={{ width: 190 }}>
            <Combobox
              items={ESTADO_PATIENT_OPTIONS}
              value={filterEstado}
              onChange={setFilterEstado}
              placeholder="Todos los estados"
              icon={<Activity size={15} />}
            />
          </div>

          <div style={{ width: 190 }}>
            <Combobox
              items={ACTIVACION_FILTER_OPTIONS}
              value={filterActivo}
              onChange={setFilterActivo}
              placeholder="Todos (Activación)"
              icon={<Power size={15} />}
            />
          </div>
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
                    <div className="empty-icon text-brand-text-light mb-2">
                      <UserX size={36} />
                    </div>
                    <p className="font-medium text-brand-text">No se encontraron pacientes</p>
                    <p className="text-xs text-muted">
                      Intente buscando por otro nombre, teléfono o modifique los filtros.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              patients.map((p) => {
                const isPatientActive = Boolean(p.activo);
                return (
                  <tr key={p.id} className={!isPatientActive ? 'row-off' : ''}>
                    <td>
                      <span className="id-chip">#{p.id}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar-sq">{getInitials(p.nombre)}</div>
                        <div className="font-semibold text-brand-text text-sm">{p.nombre}</div>
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
                      <span className="state-inline">
                        <span className={`dot ${isPatientActive ? 'dot-on' : 'dot-off'}`}></span>
                        {isPatientActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          title="Ver Historia Clínica"
                          onClick={() => navigate(`/historia-clinica?patientId=${p.id}`)}
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
                              isPatientActive ? 'btn-danger' : 'btn-success'
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
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <UserPlus className="text-brand-slate" size={22} />
              Nuevo Paciente
            </DialogTitle>
            <DialogDescription className="text-muted">
              Ingrese los datos del paciente para registrarlo en la plataforma.
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

          <form onSubmit={handleCreateSubmit} id="form-nuevo-paciente" className="flex flex-col gap-4 py-2">
            <PatientFormFields form={form} setForm={setForm} />

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
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <Pencil className="text-brand-slate" size={20} />
              Editar Paciente #{selectedPatient?.id}
            </DialogTitle>
            <DialogDescription className="text-muted">
              Actualice los datos del paciente registrado en el sistema.
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
            <PatientFormFields form={form} setForm={setForm} />

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

      {/* ================= MODAL DESACTIVAR / REACTIVAR PACIENTE ================= */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="flat-page sm:max-w-md rounded-none bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-text">
              <Power
                className={selectedPatient?.activo ? 'text-brand-slate' : 'text-brand-slate'}
                size={20}
              />
              {selectedPatient?.activo ? 'Desactivar Paciente' : 'Activar Paciente'}
            </DialogTitle>
            <DialogDescription className="text-muted">
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
            <div className="notice notice-danger notice-flush">
              <span className="notice-body">
                <AlertCircle size={16} />
                {errorMessage}
              </span>
            </div>
          )}

          <DialogFooter className="dialog-sep flex flex-row justify-end gap-3">
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
                selectedPatient?.activo ? 'btn-danger' : 'btn-primary'
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
      </div>
    </Layout>
  );
}

export default Pacientes;
