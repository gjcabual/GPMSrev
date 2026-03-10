# CSU GPMS - Gate Pass Management System

CSU GPMS is a full-stack vehicle gate pass platform for campus access control.

## Repository Modules

- `GPMS-A` - Frontend (React + Vite)
- `GPMS-B` - Backend API (FastAPI + PostgreSQL + OCR utilities)

## System Roles

- Applicant: submits applications, uploads documents, requests payment slip, uploads receipt, tracks status.
- Staff: reviews submitted records and receipt details, then approves/rejects applications.
- Admin: has staff capabilities plus broader management/reporting visibility.

## Status Lifecycle

`Pending` -> `Waiting for Approval` -> `Approved` or `Rejected`

## Architecture

### Frontend (`GPMS-A`)

- React 19 + Vite
- React Router
- Tailwind CSS + React Icons + Sonner

### Backend (`GPMS-B`)

- FastAPI
- SQLAlchemy async + asyncpg
- PostgreSQL
- JWT authentication with role checks
- Swagger UI at `/docs`

## Quick Start

### 1. Backend

```bash
cd GPMS-B
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://127.0.0.1:8000`  
Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend

```bash
cd GPMS-A
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Environment Variables

### Frontend (`GPMS-A/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### Backend (`GPMS-B/.env`)

Use `GPMS-B/.env.example` as baseline.

Required database variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gpmsdb
DB_USER=postgres
DB_PASSWORD=your_password
```

Optional SMTP variables:

```env
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

## Documentation

- Repository tree: [DIRECTORY_TREE.md](DIRECTORY_TREE.md)
- Frontend docs: [GPMS-A/README.md](GPMS-A/README.md)
- Backend docs: [GPMS-B/README.md](GPMS-B/README.md)

Last updated: 2026-03-10
