import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AvisosProvider } from './components/Avisos';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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

import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <AvisosProvider>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/"                  element={<Navigate to="/dashboard" replace />} />
              <Route path="/login"             element={<Login />} />

              {/* Recuperación de contraseña (públicas) */}
              <Route path="/recuperar-contrasena"   element={<RecuperarPassword />} />
              <Route path="/restablecer-contrasena" element={<RestablecerPassword />} />

              {/* Protected Application Routes */}
              <Route path="/dashboard"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/pacientes"         element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
              <Route path="/citas"             element={<ProtectedRoute><Citas /></ProtectedRoute>} />
              <Route path="/historia-clinica"  element={<ProtectedRoute><HistoriaClinica /></ProtectedRoute>} />
              <Route path="/reportes"          element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
              <Route path="/facturacion"       element={<ProtectedRoute><Facturacion /></ProtectedRoute>} />
              <Route path="/reporte-doppler"   element={<ProtectedRoute><ReporteDoppler /></ProtectedRoute>} />
              <Route path="/mapeo-venoso"      element={<ProtectedRoute><MapeoVenoso /></ProtectedRoute>} />
              <Route path="/usuarios"          element={<AdminRoute><Usuarios /></AdminRoute>} />

              <Route path="*"                  element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AvisosProvider>
  );
}

export default App;
