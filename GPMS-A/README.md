# GPMS-A - Frontend (React + Vite)

Frontend module for CSU GPMS. This app provides applicant, staff, and admin interfaces for gate pass processing.

## Tech Stack

- React 19
- Vite
- React Router
- Tailwind CSS
- React Icons
- Sonner (toast notifications)

## Local Setup

```bash
cd GPMS-A
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Environment

Create `.env` (or copy from `.env.example`) and set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Build

```bash
npm run build
npm run preview
```

## Main Source Structure

```text
src/
|-- components/
|-- layouts/
|-- pages/
|-- routes/
|-- utils/
|-- App.jsx
`-- main.jsx
```

## Route Groups

- Public/Landing: `/`, `/gpms`
- Applicant module: `/applicant/*`
- Staff module: `/staff/*`
- Admin module: `/admin/*`
- Auth pages include applicant, staff, and admin login flows.

## Notes

- API base URL is resolved from `VITE_API_BASE_URL`.
- OCR-related upload/extract requests are sent to backend applicant endpoints.

Last updated: 2026-03-10
