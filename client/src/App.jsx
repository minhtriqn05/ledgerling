import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/AppLayout/AppLayout.jsx';
import AuthLayout from './components/AuthLayout/AuthLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute/AdminRoute.jsx';
import LoadingState from './components/LoadingState/LoadingState.jsx';
import PreferencesSync from './components/PreferencesSync/PreferencesSync.jsx';

// Every page is its own file in the build, downloaded the first time its address opens (code splitting).
// The first page then loads only its own code, and the Recharts library only comes with the pages that draw charts.
// The layouts above stay in the main file: they are on screen while a page is still downloading.
// Each layout has a <Suspense> around its <Outlet />, and the one below catches the pages outside the layouts.
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.jsx'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage.jsx'));
const RecurringPage = lazy(() => import('./pages/RecurringPage.jsx'));
const GoalsPage = lazy(() => import('./pages/GoalsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const WelcomePage = lazy(() => import('./pages/WelcomePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
// null in the production build: the condition is known when building, so that page is not even built
const StyleGuidePage = import.meta.env.DEV ? lazy(() => import('./pages/StyleGuidePage.jsx')) : null;
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  // Subscribes to the language, so everything below renders again when it changes
  useTranslation();

  return (
    <>
      <PreferencesSync />
      <Suspense fallback={<LoadingState fullScreen />}>
        <Routes>
          {/* The public landing page: for a visitor, "/" leads here (ProtectedRoute); a signed-in user is sent to the Dashboard */}
          <Route path="/welcome" element={<WelcomePage />} />

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
      </Suspense>
    </>
  );
}
