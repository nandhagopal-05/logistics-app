import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';
import ShipmentRegistry from './pages/ShipmentRegistry';
import ClearanceSchedule from './pages/ClearanceSchedule';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Containers from './pages/Containers';
import DeliveryNotes from './pages/DeliveryNotes';
import ChangePassword from './pages/ChangePassword';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import Payments from './pages/Payments';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = window.location.pathname;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user?.must_change_password && location !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!user?.must_change_password && location === '/change-password') {
    // Optional: Redirect away if they don't need to change password (or allow them to stay)
    // For now, let's allow access or better, redirect to dashboard if they try to hit the forced reset page manually
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* ... other routes ... */}

          <Route
            path="/registry"
            element={
              <ProtectedRoute>
                <ShipmentRegistry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <ClearanceSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/containers"
            element={
              <ProtectedRoute>
                <Containers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-notes"
            element={
              <ProtectedRoute>
                <DeliveryNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <Logs />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
