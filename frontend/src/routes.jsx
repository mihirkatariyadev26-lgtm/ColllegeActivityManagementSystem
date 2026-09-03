import { Navigate, useRoutes } from "react-router-dom";
import Login from './component/Login';
import Dashboard from './component/Dashboard';
import { useAuth } from './authcontex';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

function ProjectRoutes() {
  return useRoutes([
    { path: '/', element: <LoginRoute /> },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
}

export default ProjectRoutes