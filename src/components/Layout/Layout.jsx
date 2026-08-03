import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Clipboard, BarChart3, Stethoscope, Bell, Receipt, Settings, LogOut, UserCog } from 'lucide-react';
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
          <div className="sidebar-logo-icon"><Stethoscope size={18} /></div>
          <div>
            <div className="sidebar-logo-title">VENS</div>
            <div className="sidebar-logo-sub">Flebología</div>
          </div>
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
  const { logoutUser } = useAuth();
  
  const today = new Date().toLocaleDateString('es-GT', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
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
        <button className="topbar-notif" title="Cerrar sesión" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
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
