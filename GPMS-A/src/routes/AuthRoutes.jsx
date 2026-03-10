import { Routes, Route } from "react-router-dom";
import { Role } from "../pages/auth/Role";
import { Login } from "../pages/auth/Login";
import { ForgotPassword } from "../pages/auth/ForgotPassword";
import { ApplicantLogin } from "../pages/auth/applicant/ApplicantLogin";
import { ApplicantSignup } from "../pages/auth/applicant/ApplicantSignup";
import {
 ResetPassword,
 VerifyResetPassword,
} from "../pages/auth/ResetPassword";
import { AuthRouteGuard } from "../components/AuthRouteGuard";

export const AuthRoutes = () => {
 return (
  <>
    <Routes>
     <Route
      path="/role"
      element={
       <AuthRouteGuard>
        <Role />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/*"
      element={
       <AuthRouteGuard>
        <Role />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/applicant-login"
      element={
       <AuthRouteGuard>
        <ApplicantLogin />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/admin-login"
      element={
       <AuthRouteGuard>
        <Login />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/staff-login"
      element={
       <AuthRouteGuard>
        <Login />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/applicant-signup"
      element={
       <AuthRouteGuard>
        <ApplicantSignup />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/forgot-password"
      element={
       <AuthRouteGuard>
        <ForgotPassword />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/verify-reset-password"
      element={
       <AuthRouteGuard>
        <VerifyResetPassword />
       </AuthRouteGuard>
      }
     />
     <Route
      path="/reset-password"
      element={
       <AuthRouteGuard>
        <ResetPassword />
       </AuthRouteGuard>
      }
     />
    </Routes>
  </>
 );
};
