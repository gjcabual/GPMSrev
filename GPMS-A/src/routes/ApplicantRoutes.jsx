import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "../pages/applicant/Dashboard";
import { MyApplication } from "../pages/applicant/MyApplication";
import { Profile } from "../pages/applicant/Profile";
import { Application } from "../pages/applicant/application/Application";
import { ApplicationReview } from "../pages/applicant/ApplicationReview";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const ApplicantRoutes = () => {
  return (
   <>
    <Routes>
     <Route path="/" element={<Navigate to="/applicant/dashboard" replace />} />
     <Route
      path="dashboard"
      element={
      <ProtectedRoute allowedRole="applicant">
       <Dashboard />
      </ProtectedRoute>
     }
    />
    <Route
     path="my-application"
     element={
      <ProtectedRoute allowedRole="applicant">
       <MyApplication />
      </ProtectedRoute>
     }
    />
    <Route
     path="profile"
     element={
      <ProtectedRoute allowedRole="applicant">
       <Profile />
      </ProtectedRoute>
     }
    />
    <Route
     path="application"
     element={
      <ProtectedRoute allowedRole="applicant">
       <Application />
      </ProtectedRoute>
     }
    />
    <Route
     path="application/review/:id"
     element={
      <ProtectedRoute allowedRole="applicant">
       <ApplicationReview />
      </ProtectedRoute>
     }
     />
     <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
   </>
  );
};
