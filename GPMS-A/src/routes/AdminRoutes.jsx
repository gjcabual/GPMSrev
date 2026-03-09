import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "../pages/admin/Dashboard";
import { Staff } from "../pages/admin/Staff";
import { Reports } from "../pages/admin/Reports";
import { Management } from "../pages/admin/Management";
import { Settings } from "../pages/admin/Settings";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const AdminRoutes = () => {
  return (
   <>
    <Routes>
     <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
     <Route
      path="/dashboard"
      element={
      <ProtectedRoute allowedRole="admin">
       <Dashboard />
      </ProtectedRoute>
     }
    />
    <Route
     path="/staff"
     element={
      <ProtectedRoute allowedRole="admin">
       <Staff />
      </ProtectedRoute>
     }
    />
    <Route
     path="/report"
     element={
      <ProtectedRoute allowedRole="admin">
       <Reports />
      </ProtectedRoute>
     }
    />
    <Route
     path="/management"
     element={
      <ProtectedRoute allowedRole="admin">
       <Management />
      </ProtectedRoute>
     }
    />
    <Route
     path="/setting"
     element={
      <ProtectedRoute allowedRole="admin">
       <Settings />
      </ProtectedRoute>
     }
     />
     <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
   </>
  );
};
