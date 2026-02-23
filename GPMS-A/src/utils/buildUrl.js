const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export const buildUrl = (path) => {
  return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
};

/** Base URL without /api/v1 for root-level auth endpoints (e.g. /admin, /staff, /applicant) */
export const buildAuthUrl = (path) => {
  const root = apiBase.replace(/\/api\/v1\/?$/, "") || "http://127.0.0.1:8000";
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
};
