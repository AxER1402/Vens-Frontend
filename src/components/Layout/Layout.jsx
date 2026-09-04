import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Clipboard, BarChart3, Bell, Receipt, Settings, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/citas', icon: Calendar, label: 'Citas' },
  { to: '/historia-clinica', icon: Clipboard, label: 'Historia Clínica' },
  { to: '/facturacion', icon: Receipt, label: 'Facturación' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/usuarios', icon: UserCog, label: 'Usuarios', adminOnly: true },
];

const getInitials = (name) => {
  if (!name) return 'US';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

function AppSidebar() {
  const { user } = useAuth();

  const roleLabels = {
    administrador: 'Administrador',
    medico: 'Doctor(a)',
    recepcionista: 'Recepción',
    enfermera: 'Enfermera',
  };

  const isAdmin = user?.rol?.toLowerCase() === 'administrador';
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const displayName = user?.name || 'Usuario';
  const displayRole = roleLabels[user?.rol] || user?.rol || 'Personal';

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-screen border-none">
      <SidebarHeader className="p-0 border-none">
        <Link to="/dashboard" className="sidebar-logo">
          <span
            className="sidebar-logo-marca"
            role="img"
            aria-label="Doctora Yojana Mendoza — Flebología"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="sidebar-nav">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="sidebar-logo-sub">
            Menú principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-[2px]">
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-item-icon"><item.icon size={18} /></span>
                    <span className="nav-item-text">{item.label}</span>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{getInitials(displayName)}</div>
          <div>
            <div className="sidebar-user-name" title={displayName}>{displayName}</div>
            <div className="sidebar-user-role capitalize">{displayRole}</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const { logoutUser, user } = useAuth();

  // Cerrar sesión no es inmediato: primero se pregunta, porque el botón queda
  // junto a los de notificaciones y ajustes y se toca sin querer.
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const today = new Date().toLocaleDateString('es-GT', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleConfirmLogout = async () => {
    setCerrando(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } finally {
      setCerrando(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left"></div>
      <div className="topbar-right">
        <span className="topbar-date">{today}</span>
        <button className="topbar-notif" title="Notificaciones" style={{ position: 'relative' }}>
          <Bell size={16} strokeWidth={2} />
          <span className="notif-dot"></span>
        </button>
        <button className="topbar-notif" title="Ajustes">
          <Settings size={16} strokeWidth={2} />
        </button>
        <button
          className="topbar-notif"
          title="Cerrar sesión"
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ================= CONFIRMAR CIERRE DE SESIÓN ================= */}
      {/* AlertDialog y no Dialog: no se descarta tocando fuera del recuadro,
          que es justo el gesto con el que se sale sin querer de un modal. */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <LogOut className="text-brand-slate" />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Cerrar la sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              {user?.name ? <>Se cerrará la sesión de <strong>{user.name}</strong>. </> : null}
              Se perderá cualquier cambio sin guardar y deberá ingresar sus
              credenciales para volver a entrar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cerrando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmLogout}
              disabled={cerrando}
            >
              {cerrando ? 'Cerrando…' : 'Sí, cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function Layout({ children }) {
  return (
    <SidebarProvider open={true}>
      <AppSidebar />
      <SidebarInset style={{ background: 'var(--brand-surface-alt)', minHeight: '100vh' }}>
        <Topbar />
        <main className="page-content">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Layout;
