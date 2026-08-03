import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-surface-alt">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-brand-slate">Cargando sesión…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
