import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthRoutes } from "./routes/AuthRoutes";
import { AdminRoutes } from "./routes/AdminRoutes";
import { StaffRoutes } from "./routes/StaffRoutes";
import { ApplicantRoutes } from "./routes/ApplicantRoutes";
import { Landing } from "./pages/applicant/Landing";
import { Toaster } from "sonner";
import { AuthRouteGuard } from "./components/AuthRouteGuard";

function App() {
 return (
  <>
   <Toaster richColors position="top-center" closeButton />
   <Router>
     <Routes>
      <Route
       path="/"
       element={
        <AuthRouteGuard>
         <Landing />
        </AuthRouteGuard>
       }
      />
      <Route
       path="/gpms"
       element={
        <AuthRouteGuard>
         <Landing />
        </AuthRouteGuard>
       }
      />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/staff/*" element={<StaffRoutes />} />
      <Route path="/applicant/*" element={<ApplicantRoutes />} />
     <Route path="/*" element={<AuthRoutes />} />
    </Routes>
   </Router>
  </>
 );
}

export default App;
