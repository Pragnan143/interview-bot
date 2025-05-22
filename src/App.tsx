import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTests from "./pages/admin/Tests";
import AdminUsers from "./pages/admin/Users";
import AdminCreateTest from "./pages/admin/CreateTest";
import UserDashboard from "./pages/user/Dashboard";
import NotFound from "./pages/NotFound";
import CreateAdmin from "./pages/admin/CreateAdmin";
import ReportPage from "./pages/user/ReportPage";
import TestIntroPage from "./pages/user/TestIntroPage";
import TestTakingPage from "./pages/user/TestTakingPage";
function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Admin routes */}
            <Route path="/create-admin" element={<CreateAdmin />} />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tests"
              element={
                <AdminRoute>
                  <AdminTests />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tests/create"
              element={
                <AdminRoute>
                  <AdminCreateTest />
                </AdminRoute>
              }
            />

            {/* User routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:testId"
              element={
                <ProtectedRoute>
                  <TestIntroPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:testId/take"
              element={
                <ProtectedRoute>
                  <TestTakingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:testId/report"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect and 404 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
