import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingState from '../LoadingState/LoadingState.jsx';

// Wraps the pages that need a signed-in user. Used as a layout route in App.jsx:
// signed in -> render the child routes, not signed in -> go to /login.
// A visitor who opens the home address (/) sees the landing page instead: it is the first thing a new person meets.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // A stored token is still being checked with the API: do not redirect yet.
  if (loading) return <LoadingState fullScreen />;

  // `state.from` remembers the page the visitor wanted, so after logging in they can be sent back to it.
  if (!user) {
    if (location.pathname === '/') return <Navigate to="/welcome" replace />;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
