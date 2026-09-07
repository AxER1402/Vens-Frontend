import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AvisosProvider } from './components/Avisos';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProveedorCambiosSinGuardar } from './context/CambiosSinGuardar';
import { AdminRoute } from './components/AdminRoute';

import Login           from './pages/Login/Login';
import RecuperarPassword    from './pages/Login/RecuperarPassword';
import RestablecerPassword  from './pages/Login/RestablecerPassword';
import Dashboard       from './pages/Dashboard/Dashboard';
import Pacientes       from './pages/Pacientes/Pacientes';
import Citas           from './pages/Citas/Citas';
import HistoriaClinica  from './pages/HistoriaClinica/HistoriaClinica';
import Reportes        from './pages/Reportes/Reportes';
import Facturacion     from './pages/Facturacion/Facturacion';
import ReporteDoppler  from './pages/ReporteDoppler/ReporteDoppler';
import MapeoVenoso     from './pages/MapeoVenoso/MapeoVenoso';
import Usuarios        from './pages/Usuarios/Usuarios';
import Configuracion   from './pages/Configuracion/Configuracion';

import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Lo que envuelve a todas las rutas y necesita estar dentro del router.
 *
 * El guardián de cambios sin guardar frena la navegación con useBlocker, que
 * solo existe dentro del router y solo en su forma de datos: por eso las rutas
 * se declaran con createBrowserRouter en lugar del <BrowserRouter> con <Routes>
 * de antes. Sin él, las flechas de atrás y adelante del navegador se saltaban
 * el aviso y se llevaban por delante la consulta a medias.
 */
function Raiz() {
  return (
    <ProveedorCambiosSinGuardar>
      <Outlet />
    </ProveedorCambiosSinGuardar>
  );
}

const router = createBrowserRouter([
  {
    element: <Raiz />,
    children: [
      { path: '/',      element: <Navigate to="/dashboard" replace /> },
      { path: '/login', element: <Login /> },

      // Recuperación de contraseña (públicas)
      { path: '/recuperar-contrasena',   element: <RecuperarPassword /> },
      { path: '/restablecer-contrasena', element: <RestablecerPassword /> },

      // Rutas protegidas de la aplicación
      { path: '/dashboard',        element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: '/pacientes',        element: <ProtectedRoute><Pacientes /></ProtectedRoute> },
      { path: '/citas',            element: <ProtectedRoute><Citas /></ProtectedRoute> },
      { path: '/historia-clinica', element: <ProtectedRoute><HistoriaClinica /></ProtectedRoute> },
      { path: '/reportes',         element: <ProtectedRoute><Reportes /></ProtectedRoute> },
      { path: '/facturacion',      element: <ProtectedRoute><Facturacion /></ProtectedRoute> },
      { path: '/reporte-doppler',  element: <ProtectedRoute><ReporteDoppler /></ProtectedRoute> },
      { path: '/mapeo-venoso',     element: <ProtectedRoute><MapeoVenoso /></ProtectedRoute> },
      { path: '/usuarios',         element: <AdminRoute><Usuarios /></AdminRoute> },

      // Configuración: protegida, no restringida a administrador. Su cuenta la
      // gestiona cada quien; las secciones de administración se filtran dentro
      // de la pantalla y las cierra el backend.
      { path: '/configuracion',    element: <ProtectedRoute><Configuracion /></ProtectedRoute> },

      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

function App() {
  return (
    <AvisosProvider>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </AuthProvider>
    </AvisosProvider>
  );
}

export default App;
