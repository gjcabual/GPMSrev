import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthRoutes } from "./routes/AuthRoutes";
import { AdminRoutes } from "./routes/AdminRoutes";
import { StaffRoutes } from "./routes/StaffRoutes";
import { ApplicantRoutes } from "./routes/ApplicantRoutes";
import { Landing } from "./pages/applicant/Landing";
import { Toaster } from "sonner";

function App() {
 return (
  <>
   <Toaster richColors position="top-center" />
   <Router>
    <Routes>
     <Route path="/" element={<Landing />} />
     <Route path="/gpms" element={<Landing />} />
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
