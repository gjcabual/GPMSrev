import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { buildAuthUrl } from "../utils/buildUrl";
import { toast } from "sonner";

export const ProtectedRoute = ({ children, allowedRole }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const endpoint = `/${allowedRole}`;
        const res = await fetch(buildAuthUrl(endpoint), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok) {
          setIsAuthorized(true);
        } else {
          toast.error("You are not authorized to access this page", {
            id: "auth-unauthorized",
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while checking authorization", {
          id: "auth-check-error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token, allowedRole]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return children;
};
