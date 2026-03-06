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

export const AuthRoutes = () => {
 return (
  <>
   <Routes>
    <Route path="/role" element={<Role />} />
    <Route path="/*" element={<Role />} />
    <Route path="/applicant-login" element={<ApplicantLogin />} />
    <Route path="/admin-login" element={<Login />} />
    <Route path="/staff-login" element={<Login />} />
    <Route path="/applicant-signup" element={<ApplicantSignup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/verify-reset-password" element={<VerifyResetPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
   </Routes>
  </>
 );
};
