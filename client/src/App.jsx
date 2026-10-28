import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout/AppLayout.jsx';
import AuthLayout from './components/AuthLayout/AuthLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StyleGuidePage from './pages/StyleGuidePage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Pages without the sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Pages with the sidebar / bottom tab bar */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
      </Route>

      {/* Temporary page to review the design tokens. Only available in dev mode. */}
      {import.meta.env.DEV && <Route path="/style-guide" element={<StyleGuidePage />} />}

      {/* Any other address goes back to the Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
