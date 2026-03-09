import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "../pages/staff/Dashboard";
import { Applicant } from "../pages/staff/Applicant";
import { Report } from "../pages/staff/Report";
import { Management } from "../pages/staff/Management";
import { Setting } from "../pages/staff/Setting";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const StaffRoutes = () => {
  return (
   <>
    <Routes>
     <Route path="/" element={<Navigate to="/staff/dashboard" replace />} />
     <Route
      path="/dashboard"
      element={
      <ProtectedRoute allowedRole="staff">
       <Dashboard />
      </ProtectedRoute>
     }
    />
    <Route
     path="/application"
     element={
      <ProtectedRoute allowedRole="staff">
       <Applicant />
      </ProtectedRoute>
     }
    />
    <Route
     path="/report"
     element={
      <ProtectedRoute allowedRole="staff">
       <Report />
      </ProtectedRoute>
     }
    />
    <Route
     path="/management"
     element={
      <ProtectedRoute allowedRole="staff">
       <Management />
      </ProtectedRoute>
     }
    />
    <Route
     path="/setting"
     element={
      <ProtectedRoute allowedRole="staff">
       <Setting />
      </ProtectedRoute>
     }
     />
     <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
   </>
  );
};
