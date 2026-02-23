import { Routes, Route } from "react-router-dom";
import { Dashboard } from "../pages/admin/Dashboard";
import { Staff } from "../pages/admin/Staff";
import { Reports } from "../pages/admin/Reports";
import { Management } from "../pages/admin/Management";
import { Settings } from "../pages/admin/Settings";
import { Toaster } from "sonner";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const AdminRoutes = () => {
 return (
  <>
   <Toaster richColors position="top-center" />
   <Routes>
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
   </Routes>
  </>
 );
};
