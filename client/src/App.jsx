import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/AppLayout/AppLayout.jsx';
import AuthLayout from './components/AuthLayout/AuthLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import RecurringPage from './pages/RecurringPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AdminRoute from './components/AdminRoute/AdminRoute.jsx';
import PreferencesSync from './components/PreferencesSync/PreferencesSync.jsx';
import LoginPage from'./pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StyleGuidePage from './pages/StyleGuidePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  // Subscribes to the language, so everything below renders again when it changes
  useTranslation();

  return (
    <>
      <PreferencesSync />
      <Routes>
        {/* Pages without the sidebar */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Pages with the sidebar / top bar. They need a signed-in user. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Only for an admin; anybody else is sent to the Dashboard */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        {/* Temporary page to review the design tokens. Only available in dev mode. */}
        {import.meta.env.DEV && <Route path="/style-guide" element={<StyleGuidePage />} />}

        {/* Any other address */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
