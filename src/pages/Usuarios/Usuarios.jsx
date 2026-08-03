import { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import { 
  Search, 
  UserX, 
  Pencil, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  User,
  Power
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import * as userService from '../../services/userService';


const ROLE_MAP = {
  administrador: { label: 'Administrador', tagClass: 'tag-purple', colorBadge: 'bg-purple-100 text-purple-700 font-medium' },
  medico: { label: 'Doctor', tagClass: 'tag-blue', colorBadge: 'bg-blue-100 text-blue-700 font-medium' },
  recepcionista: { label: 'Recepcionista', tagClass: 'tag-info', colorBadge: 'bg-teal-100 text-teal-700 font-medium' },
  enfermera: { label: 'Enfermera', tagClass: 'tag-warning', colorBadge: 'bg-amber-100 text-amber-700 font-medium' }
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  rol: 'medico',
  telefono: '',
  activo: true
};

function Usuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar usuarios desde la API
  const fetchUsers = async () => {
    setLoading(true);
    const res = await userService.getUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      // Si la API falla o no hay conexión aún, mantenemos arreglo vacío y notificamos
      setErrorMessage(res.message || 'No se pudo conectar con el servidor.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setErrorMessage('');
    setSuccessMessage('');
    setShowCreateModal(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      password_confirmation: '',
      rol: user.rol || 'medico',
      telefono: user.telefono || '',
      activo: Boolean(user.activo)
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowEditModal(true);
  };

  // Abrir Modal de Desactivación / Cambio de Estado
  const handleOpenDeactivate = (user) => {
    setSelectedUser(user);
    setErrorMessage('');
    setShowDeactivateModal(true);
  };

  // Enviar formulario de Creación
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (form.password !== form.password_confirmation) {
      setErrorMessage('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);
    const res = await userService.createUser(form);

    if (res.success) {
      setSuccessMessage('Usuario creado exitosamente.');
      setShowCreateModal(false);
      fetchUsers();
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al crear usuario.');
      }
    }
    setIsSubmitting(false);
  };

  // Enviar formulario de Edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (form.password && form.password !== form.password_confirmation) {
      setErrorMessage('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);
    const res = await userService.updateUser(selectedUser.id, form);

    if (res.success) {
      setSuccessMessage('Usuario actualizado exitosamente.');
      setShowEditModal(false);
      fetchUsers();
    } else {
      if (res.errors) {
        const firstErr = Object.values(res.errors)[0]?.[0];
        setErrorMessage(firstErr || res.message);
      } else {
        setErrorMessage(res.message || 'Error al actualizar usuario.');
      }
    }
    setIsSubmitting(false);
  };

  // Confirmar Desactivación o Reactivación
  const handleConfirmToggleActive = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    if (selectedUser.activo) {
      // Desactivar usuario utilizando la ruta DELETE /users/{id}
      const res = await userService.deactivateUser(selectedUser.id);
      if (res.success) {
        setSuccessMessage('Usuario desactivado exitosamente.');
        setShowDeactivateModal(false);
        fetchUsers();
      } else {
        setErrorMessage(res.message || 'Error al desactivar usuario.');
      }
    } else {
      // Activar usuario enviando activo: true en PUT /users/{id}
      const res = await userService.updateUser(selectedUser.id, {
        name: selectedUser.name,
        email: selectedUser.email,
        rol: selectedUser.rol,
        activo: true
      });
      if (res.success) {
        setSuccessMessage('Usuario reactivado exitosamente.');
        setShowDeactivateModal(false);
        fetchUsers();
      } else {
        setErrorMessage(res.message || 'Error al reactivar usuario.');
      }
    }
    setIsSubmitting(false);
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchSearch =
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.telefono && u.telefono.toLowerCase().includes(term));

    const matchRole = !filterRole || u.rol === filterRole;
    const matchStatus =
      !filterStatus ||
      (filterStatus === 'activo' && Boolean(u.activo)) ||
      (filterStatus === 'inactivo' && !u.activo);

    return matchSearch && matchRole && matchStatus;
  });

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Layout breadcrumb="Gestión de Usuarios">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">
            Administra los accesos, roles y permisos de los usuarios del sistema VENS.
          </p>
        </div>
        <div className="page-actions">
          <button
            id="btn-nuevo-usuario"
            className="btn btn-primary flex items-center gap-2"
            onClick={handleOpenCreate}
          >
            <UserPlus size={16} />
            + Nuevo Usuario
          </button>
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
          <div className="search-wrap" style={{ minWidth: 300 }}>
            <span className="search-icon-inner">
              <Search size={16} />
            </span>
            <input
              id="search-usuarios"
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, correo o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 180 }}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="medico">Doctor</option>
            <option value="recepcionista">Recepcionista</option>
          </select>

          <select
            className="form-control"
            style={{ width: 160 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span className="text-xs text-muted">
            {filteredUsers.length} de {users.length} usuario(s)
          </span>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo Electrónico</th>
              <th>Rol de Acceso</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-2 text-brand-slate">
                    <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Cargando usuarios…</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state py-8">
                    <div className="empty-icon text-gray-400 mb-2">
                      <UserX size={36} />
                    </div>
                    <p className="font-medium text-gray-700">No se encontraron usuarios</p>
                    <p className="text-xs text-gray-500">
                      Prueba ajustando los términos de búsqueda o filtros.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const roleInfo = ROLE_MAP[u.rol] || { label: u.rol, colorBadge: 'bg-gray-100 text-gray-700' };
                const isUserActive = Boolean(u.activo);

                return (
                  <tr key={u.id} className={!isUserActive ? 'opacity-70 bg-gray-50/50' : ''}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-surface-alt border border-brand-border-light flex items-center justify-center font-bold text-xs text-brand-deep shadow-xs">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{u.name}</div>
                          <div className="text-xs text-gray-400">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-700 flex items-center gap-1.5">
                        <Mail size={13} className="text-gray-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleInfo.colorBadge}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-gray-600 flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        <span>{u.telefono || '—'}</span>
                      </div>
                    </td>
                    <td>
                      {isUserActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1.5"
                          title="Editar usuario"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Pencil size={13} />
                          <span>Editar</span>
                        </button>
                        <button
                          className={`btn btn-sm flex items-center gap-1.5 ${
                            isUserActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={isUserActive ? 'Desactivar usuario' : 'Activar usuario'}
                          onClick={() => handleOpenDeactivate(u)}
                        >
                          <Power size={13} />
                          <span>{isUserActive ? 'Desactivar' : 'Activar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL CREAR USUARIO ================= */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <UserPlus className="text-brand-teal" size={22} />
              Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Crea un nuevo usuario asignándole uno de los 3 roles del sistema (Administrador, Doctor o Recepcionista).
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

          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 py-2">
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="req">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  className="form-control pl-8"
                  placeholder="Ej. Dr. Juan Pérez"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <User size={15} className="absolute left-2.5 top-3 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Correo Electrónico <span className="req">*</span></label>
                <div className="relative">
                  <input
                    type="email"
                    className="form-control pl-8"
                    placeholder="juan.perez@vens.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                  <Mail size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control pl-8"
                    placeholder="+503 7123-4567"
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                  />
                  <Phone size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Rol de Usuario <span className="req">*</span></label>
              <select
                className="form-control"
                value={form.rol}
                onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                required
              >
                <option value="administrador">Administrador</option>
                <option value="medico">Doctor (Flebólogo)</option>
                <option value="recepcionista">Recepcionista</option>
              </select>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Contraseña <span className="req">*</span></label>
                <div className="relative">
                  <input
                    type="password"
                    className="form-control pl-8"
                    placeholder="Password123!"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <Lock size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar Contraseña <span className="req">*</span></label>
                <div className="relative">
                  <input
                    type="password"
                    className="form-control pl-8"
                    placeholder="Password123!"
                    value={form.password_confirmation}
                    onChange={(e) => setForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <Lock size={15} className="absolute left-2.5 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="create-activo"
                checked={form.activo}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                className="rounded border-gray-300 text-brand-deep focus:ring-brand-teal"
              />
              <label htmlFor="create-activo" className="text-sm font-medium text-gray-700 cursor-pointer">
                Usuario activo (Permite iniciar sesión de inmediato)
              </label>
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
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando…' : 'Crear Usuario'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL EDITAR USUARIO ================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-deep flex items-center gap-2">
              <Pencil className="text-brand-teal" size={20} />
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-text-muted">
              Modifica la información del usuario #{selectedUser?.id}.
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
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="req">*</span></label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Correo Electrónico <span className="req">*</span></label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.telefono}
                  onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Rol de Usuario <span className="req">*</span></label>
              <select
                className="form-control"
                value={form.rol}
                onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                required
              >
                <option value="administrador">Administrador</option>
                <option value="medico">Doctor (Flebólogo)</option>
                <option value="recepcionista">Recepcionista</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Cambiar Contraseña (Opcional - dejar en blanco para mantener la actual)
              </p>
              <div className="grid grid-2 gap-3">
                <div className="form-group mb-0">
                  <label className="text-xs text-gray-500">Nueva Contraseña</label>
                  <input
                    type="password"
                    className="form-control text-sm"
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-gray-500">Confirmar Contraseña</label>
                  <input
                    type="password"
                    className="form-control text-sm"
                    placeholder="Confirmación"
                    value={form.password_confirmation}
                    onChange={(e) => setForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-activo"
                checked={form.activo}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                className="rounded border-gray-300 text-brand-deep focus:ring-brand-teal"
              />
              <label htmlFor="edit-activo" className="text-sm font-medium text-gray-700 cursor-pointer">
                Estado Activo
              </label>
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

      {/* ================= MODAL DESACTIVAR / REACTIVAR USUARIO ================= */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-brand-border-light shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Power className={selectedUser?.activo ? 'text-rose-600' : 'text-emerald-600'} size={20} />
              {selectedUser?.activo ? 'Desactivar Usuario' : 'Reactivar Usuario'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2">
              {selectedUser?.activo ? (
                <>
                  ¿Estás seguro de que deseas desactivar al usuario <strong>{selectedUser?.name}</strong> (<em>{selectedUser?.email}</em>)?
                  <br />
                  El usuario ya no podrá acceder al sistema hasta ser reactivado.
                </>
              ) : (
                <>
                  ¿Deseas reactivar al usuario <strong>{selectedUser?.name}</strong> (<em>{selectedUser?.email}</em>)?
                  <br />
                  El usuario podrá volver a ingresar al sistema con sus credenciales.
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
              className={`btn ${selectedUser?.activo ? 'bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}`}
              onClick={handleConfirmToggleActive}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Procesando…'
                : selectedUser?.activo
                ? 'Sí, Desactivar'
                : 'Sí, Reactivar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default Usuarios;
