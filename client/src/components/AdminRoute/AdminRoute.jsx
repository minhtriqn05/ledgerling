import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Wraps the pages only an admin may open. Used as a layout route inside ProtectedRoute in App.jsx,
// so the user is already known: an admin sees the child routes, anybody else goes back to the Dashboard.
// This only hides the page; the API is what really refuses (403) a request from a normal user.
export default function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return <Outlet />;
}
