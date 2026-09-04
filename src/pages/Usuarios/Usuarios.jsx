import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout/Layout';
import { useAvisos } from '../../components/Avisos';
import Paginador from '../../components/Paginador';
import {
  Search,
  UserX,
  Pencil,
  UserPlus,
  AlertCircle,
  Phone,
  Mail,
  Power,
  ShieldCheck
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
  UserFormFields,
  EMPTY_USER_FORM,
  ROLE_MAP,
  ROLE_FILTER_OPTIONS
} from '@/components/forms/UserFormFields';

import * as userService from '../../services/userService';

const ESTADO_FILTER_OPTIONS = [
  { value: 'activo', label: 'Usuarios Activos' },
  { value: 'inactivo', label: 'Usuarios Inactivos' }
];

function Usuarios() {
  const avisos = useAvisos();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar usuarios desde la API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await userService.getUsers({
      search,
      rol: filterRole,
      activo: filterStatus === 'activo' ? true : filterStatus === 'inactivo' ? false : '',
      page: pagina,
    });

    if (res.success && res.data) {
      setUsers(res.data);
      setMeta(res.meta);
    } else {
      // Si la API falla o no hay conexión aún, mantenemos arreglo vacío y notificamos
      setErrorMessage(res.message || 'No se pudo conectar con el servidor.');
    }
    setLoading(false);
  }, [search, filterRole, filterStatus, pagina]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Cambiar un filtro con una página avanzada abierta dejaría mirando un tramo
  // que quizá ya no existe en el resultado nuevo.
  useEffect(() => {
    setPagina(1);
  }, [search, filterRole, filterStatus]);

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setForm(EMPTY_USER_FORM);
    setErrorMessage('');
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
      avisos.exito('Usuario creado exitosamente.');
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
      avisos.exito('Usuario actualizado exitosamente.');
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
        avisos.exito('Usuario desactivado exitosamente.');
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
        avisos.exito('Usuario reactivado exitosamente.');
        setShowDeactivateModal(false);
        fetchUsers();
      } else {
        setErrorMessage(res.message || 'Error al reactivar usuario.');
      }
    }
    setIsSubmitting(false);
  };

  // El filtrado lo hace el servidor: sobre una lista paginada, filtrar aquí
  // solo miraría los treinta de la página abierta.
  const filteredUsers = users;

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Layout breadcrumb="Gestión de Usuarios">
      <div className="flat-page">
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
              + Nuevo usuario
            </button>
          </div>
        </div>


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

            <div style={{ width: 190 }}>
              <Combobox
                items={ROLE_FILTER_OPTIONS}
                value={filterRole}
                onChange={setFilterRole}
                placeholder="Todos los roles"
                icon={<ShieldCheck size={15} />}
              />
            </div>

            <div style={{ width: 190 }}>
              <Combobox
                items={ESTADO_FILTER_OPTIONS}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Todos los estados"
                icon={<Power size={15} />}
              />
            </div>
          </div>

          <div className="toolbar-right">
            <span className="text-xs text-muted">
              {meta ? `${meta.total} usuario(s)` : `${users.length} usuario(s)`}
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
                      <div className="empty-icon text-brand-text-light mb-2">
                        <UserX size={36} />
                      </div>
                      <p className="font-medium text-brand-text">No se encontraron usuarios</p>
                      <p className="text-xs text-muted">
                        Intente ajustando los términos de búsqueda o los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleInfo = ROLE_MAP[u.rol] || { label: u.rol, tagClass: 'tag-info' };
                  const isUserActive = Boolean(u.activo);

                  return (
                    <tr key={u.id} className={!isUserActive ? 'row-off' : ''}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar-sq">{getInitials(u.name)}</div>
                          <div>
                            <div className="font-semibold text-brand-text text-sm">{u.name}</div>
                            <span className="id-chip">#{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-muted text-sm flex items-center gap-1.5">
                          <Mail size={13} className="text-brand-text-light" />
                          {u.email}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${roleInfo.tagClass}`}>{roleInfo.label}</span>
                      </td>
                      <td>
                        <span className="text-muted text-sm font-mono flex items-center gap-1.5">
                          <Phone size={13} className="text-brand-text-light" />
                          {u.telefono || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="state-inline">
                          <span className={`dot ${isUserActive ? 'dot-on' : 'dot-off'}`}></span>
                          {isUserActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            title="Editar usuario"
                            onClick={() => handleOpenEdit(u)}
                          >
                            <Pencil size={14} />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            className={`btn btn-sm flex items-center gap-1 ${
                              isUserActive ? 'btn-danger' : 'btn-success'
                            }`}
                            title={isUserActive ? 'Desactivar usuario' : 'Activar usuario'}
                            onClick={() => handleOpenDeactivate(u)}
                          >
                            <Power size={14} />
                            <span className="hidden sm:inline">
                              {isUserActive ? 'Desactivar' : 'Activar'}
                            </span>
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

        <Paginador
          pagina={meta?.pagina ?? 1}
          paginas={meta?.paginas ?? 1}
          total={meta?.total ?? users.length}
          porPagina={meta?.por_pagina ?? users.length}
          onCambiar={setPagina}
          etiqueta="usuarios"
        />

        {/* ================= MODAL CREAR USUARIO ================= */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-brand-text">
                <UserPlus className="text-brand-slate" size={22} />
                Nuevo Usuario
              </DialogTitle>
              <DialogDescription className="text-muted">
                Cree un usuario asignándole uno de los roles del sistema: Administrador, Doctor o Recepcionista.
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

            <form onSubmit={handleCreateSubmit} id="form-nuevo-usuario" className="flex flex-col gap-4 py-2">
              <UserFormFields form={form} setForm={setForm} mode="create" />

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
                  id="btn-guardar-usuario"
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando…' : 'Crear usuario'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================= MODAL EDITAR USUARIO ================= */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-brand-text">
                <Pencil className="text-brand-slate" size={20} />
                Editar Usuario #{selectedUser?.id}
              </DialogTitle>
              <DialogDescription className="text-muted">
                Actualice los datos, el rol o el acceso del usuario registrado.
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
              <UserFormFields form={form} setForm={setForm} mode="edit" />

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

        {/* ================= MODAL DESACTIVAR / REACTIVAR USUARIO ================= */}
        <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
          <DialogContent className="flat-page sm:max-w-md rounded-none bg-brand-surface">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-brand-text">
                <Power className="text-brand-slate" size={20} />
                {selectedUser?.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
              </DialogTitle>
              <DialogDescription className="text-muted">
                {selectedUser?.activo ? (
                  <>
                    ¿Estás seguro de que deseas desactivar al usuario{' '}
                    <strong>{selectedUser?.name}</strong> (<em>{selectedUser?.email}</em>)?
                    <br />
                    El usuario no podrá acceder al sistema hasta ser reactivado.
                  </>
                ) : (
                  <>
                    ¿Deseas activar al usuario <strong>{selectedUser?.name}</strong>{' '}
                    (<em>{selectedUser?.email}</em>)?
                    <br />
                    El usuario podrá volver a ingresar al sistema con sus credenciales.
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
                className={`btn ${selectedUser?.activo ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleConfirmToggleActive}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Procesando…'
                  : selectedUser?.activo
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

export default Usuarios;
