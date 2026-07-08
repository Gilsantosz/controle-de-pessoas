import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { AppShell } from '../components/layout/AppShell';

// Importação das Páginas
import { LoginPage } from '../pages/login';
import { DashboardPage } from '../pages/dashboard';
import { EmployeesPage } from '../pages/employees';
import { EmployeeDetailPage } from '../pages/employees/detail';
import { CellsPage } from '../pages/cells';
import { TeamsPage } from '../pages/teams';
import { VacationsPage } from '../pages/vacations';
import { VacationRequestPage } from '../pages/vacations/request';
import { ApprovalsPage } from '../pages/approvals';
import { CalendarPage } from '../pages/calendar';
import { VacationPanelPage } from '../pages/vacation-panel';
import { AbsencesPage } from '../pages/absences';
import { AbsenceAnalysisPage } from '../pages/absence-analysis';
import { CapacityPage } from '../pages/capacity';
import { SimulatorPage } from '../pages/simulator';
import { OperationsPage } from '../pages/operations';
import { NotificationsPage } from '../pages/notifications';
import { ReportsPage } from '../pages/reports';
import { AdminUsersPage } from '../pages/admin-users';
import { SettingsPage } from '../pages/settings';
import { RhCrossCheckPage } from '../pages/rh-crosscheck';

// Guard para proteger rotas autenticadas
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser } = useAppStore();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Guard para redirecionar se já logado
const AnonymousRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser } = useAppStore();
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AnonymousRoute>
        <LoginPage />
      </AnonymousRoute>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/new', element: <EmployeeDetailPage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'cells', element: <CellsPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'absences', element: <AbsencesPage /> },
      { path: 'vacations', element: <VacationsPage /> },
      { path: 'vacations/request', element: <VacationRequestPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'vacation-panel', element: <VacationPanelPage /> },
      { path: 'absence-analysis', element: <AbsenceAnalysisPage /> },
      { path: 'capacity', element: <CapacityPage /> },
      { path: 'simulator', element: <SimulatorPage /> },
      { path: 'operations', element: <OperationsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'rh-crosscheck', element: <RhCrossCheckPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
], {
  basename: import.meta.env.BASE_URL
});
