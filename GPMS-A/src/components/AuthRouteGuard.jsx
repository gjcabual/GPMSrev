import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { buildAuthUrl } from "../utils/buildUrl";

const ROLE_PATHS = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  applicant: "/applicant/dashboard",
};

export const AuthRouteGuard = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let isMounted = true;

    const resolveRole = async () => {
      if (!token) {
        if (isMounted) setIsChecking(false);
        return;
      }

      try {
        const endpoints = ["admin", "staff", "applicant"];
        const checks = await Promise.all(
          endpoints.map(async (role) => {
            const res = await fetch(buildAuthUrl(`/${role}`), {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });
            return { role, ok: res.ok };
          })
        );

        const matchedRole = checks.find((check) => check.ok)?.role;
        if (isMounted) {
          setRedirectPath(matchedRole ? ROLE_PATHS[matchedRole] : null);
        }
      } catch {
        if (isMounted) {
          setRedirectPath(null);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    resolveRole();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

