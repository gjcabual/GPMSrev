# CSU GPMS - Gate Pass Management System

CSU GPMS is a full-stack vehicle gate pass platform for campus access control.
It supports applicant submission, staff/admin evaluation, payment-slip workflow, document handling, and dashboard/reporting.

This repository contains:
- `GPMS-A` - Frontend (React + Vite)
- `GPMS-B` - Backend API (FastAPI + PostgreSQL + OCR utilities)

---

## 1. System Overview

The system is role-based:

- **Applicant**
  - Creates applications for gate pass stickers.
  - Uploads and confirms required documents (OR, CR, DL).
  - Requests payment slip, uploads cashier receipt, and waits for evaluation.
  - Views history and approved applications.

- **Staff**
  - Reviews pending/waiting applications.
  - Verifies submitted data and uploaded receipt.
  - Approves/rejects applications.
  - Monitors dashboard and management modules.

- **Admin**
  - Has staff-level operational visibility plus staff-management functions.
  - Monitors reports and system-level records.

Core idea: applicants submit complete data + payment proof, then staff/admin process applications to final decision.

---

## 2. Main User Flows

## 2.1 Applicant New Application Flow

Current flow in frontend is a multi-step process:

1. **Personal Information**
2. **Confirm Email Address (OTP verification)**
3. **Documents** (CR, OR, DL upload + extracted detail confirmation)
4. **Vehicle Information**
5. **Confirm Details**

After submission:
- Initial status is **Pending**.
- Applicant can click **Get Payment Slip**.
- Status transitions to **Waiting for Approval**.
- Applicant uploads cashier receipt + OR number/amount.
- Staff/Admin can then review and decide.

## 2.2 Staff/Admin Processing Flow

- Open pending queue.
- Inspect applicant profile, documents, vehicle info, and receipt details.
- Approve or reject application.
- Approved applications move to management/logs/reporting datasets.

---

## 3. Status Lifecycle

Common status progression:

- `Pending` -> `Waiting for Approval` -> `Approved` or `Rejected`

Notes:
- `Waiting for Approval` means payment slip already requested and applicant is now in the review stage.
- Receipt upload state is tracked separately and should be visible in review/management views.

---

## 4. Architecture

## 4.1 Frontend (`GPMS-A`)

- **Framework**: React 19 + Vite
- **Routing**: React Router
- **UI**: Tailwind CSS + React Icons + Sonner toasts
- **Main route entry**: `GPMS-A/src/App.jsx`

Primary route groups:
- `/` and `/gpms` -> landing
- `/applicant/*` -> applicant module
- `/staff/*` -> staff module
- `/admin/*` -> admin module
- Auth routes include `/applicant-login`, `/staff-login`, `/admin-login`, signup/reset flows

## 4.2 Backend (`GPMS-B`)

- **Framework**: FastAPI
- **DB access**: SQLAlchemy async + asyncpg
- **Database**: PostgreSQL
- **Auth**: JWT with role checks
- **API docs**: `/docs`
- **Main app entry**: `GPMS-B/main.py`

Backend mounts role-specific and domain routers under `/api/v1`.

---

## 5. Repository Structure

Top-level:

```text
CSU GPMS/
|-- GPMS-A/            # Frontend app
|-- GPMS-B/            # Backend app
|-- DIRECTORY_TREE.md  # Expanded tree snapshot
`-- README.md
```

See detailed tree in [DIRECTORY_TREE.md](DIRECTORY_TREE.md).

---

## 6. Backend Modules and Key API Areas

Base URL (local): `http://127.0.0.1:8000/api/v1`

### Authentication and profile

- Applicant auth: `/applicant/*`
  - signup, verify-email, login
- Staff auth: `/staff/login`
- Admin auth: `/admin/login`
- Common auth/profile endpoints:
  - logout
  - forgot/reset password flow
  - profile update and profile image endpoints

### Applicant application endpoints

Under applicant route module (examples):

- Document extraction:
  - `POST /applicant/application/extract`
  - `POST /applicant/application/extract-one`
  - `POST /applicant/application/extract-slip`
- Create/update/delete application:
  - `POST /applicant/application`
  - `PUT /applicant/application/{application_id}`
  - `DELETE /applicant/application/{application_id}`
- Payment slip and submission:
  - `POST /applicant/application/{application_id}/payment-slip`
  - `POST /applicant/applications/submit-pending`
- Driver operations:
  - `POST /applicant/authorized-driver`
  - `DELETE /applicant/authorized-driver/{driver_id}`
  - `POST /applicant/application/{application_id}/assign-drivers`
- Applicant list/history/review endpoints:
  - `GET /applicant/applications/to-submit`
  - `GET /applicant/applications/approved`
  - `GET /applicant/application/{application_id}`

### Staff/admin review + management

- Staff application actions:
  - `POST /staff/application-status/update`
  - `GET /staff/applications/pending`
  - `GET /staff/applications/{application_id}`
- Management/dashboard/reports:
  - `/management/dashboard`
  - `/management/reports/*`
  - approved applications and applicant logs routes

For exact request/response schemas, use live OpenAPI docs at `/docs`.

---

## 7. OCR and Document Processing

The backend includes OCR utility modules in `GPMS-B/app/utils/`.

Current utilities include:
- `document_ocr_utils.py`
- `date_ocr_utils.py`
- `text_ocr_utils.py`
- `image_ocr_utils.py`
- `tesseract_ocr_utils.py`
- `lto_extractor.py`

OCR is used for extraction assistance on:
- OR (Official Receipt)
- CR (Certificate of Registration)
- DL (Driver's License)

Design approach:
- OCR pre-fills fields.
- User confirms/edits extracted details before proceeding.
- Validation continues at submit/review stages.

---

## 8. Data Model (Core Entities)

Main model modules under `GPMS-B/app/db/models/` include:

- `user`, `token`, `profile`
- `application`, `application_status`
- `vehicle`, `document`, `slip`
- `auth_driver`, `assigned_driver`
- `sticker`, `batch_sticker_sessions`

These represent identity, application workflow, documents, payment slips, and sticker issuance lifecycle.

---

## 9. Environment Variables

## 9.1 Frontend (`GPMS-A/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## 9.2 Backend (`GPMS-B/.env`)

Use `GPMS-B/.env.example` as baseline.

Required DB config:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gpmsdb
DB_USER=postgres
DB_PASSWORD=your_password
```

Optional email config (OTP, password reset, invitations):

```env
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

OCR note:
- Install Tesseract binary if your OCR path depends on it.

---

## 10. Local Development Setup

## 10.1 Backend

```bash
cd GPMS-B
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend health check:
- `GET http://127.0.0.1:8000/` -> `{"message": "GPMS Server is Running!"}`

## 10.2 Frontend

```bash
cd GPMS-A
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## 10.3 Database seed (optional but recommended)

```bash
cd GPMS-B
python -m app.utils.seed_db --action seed
```

---

## 11. Reports and Dashboards

Dashboard/report modules are implemented in:
- Frontend charts: `GPMS-A/src/components/report/*`
- Backend aggregation: `GPMS-B/app/api/v1/management_route/dashboard` and `.../reports`

Metrics include:
- total applications by status
- payment status totals
- sticker distribution and related trend views

---

## 12. Security Notes

Current local/dev defaults may be permissive (e.g., broad CORS). For production:

- Restrict CORS origins.
- Use strong secrets/keys and secure environment handling.
- Enforce HTTPS and secure reverse proxy configuration.
- Use least-privilege database credentials.
- Validate file uploads and enforce size/type constraints.

---

## 13. Troubleshooting

- **Frontend cannot reach API**
  - Verify `VITE_API_BASE_URL` and backend port.
- **DB connection errors**
  - Check PostgreSQL service and `.env` credentials.
- **OCR extraction quality issues**
  - Use clear, high-contrast images and verify extraction manually before submission.
- **Email OTP not sent**
  - Confirm SMTP credentials and provider settings (app password if required).

---

## 14. Related Documentation

- Frontend module docs: [GPMS-A/README.md](GPMS-A/README.md)
- Backend module docs: [GPMS-B/README.md](GPMS-B/README.md)
- Repository tree: [DIRECTORY_TREE.md](DIRECTORY_TREE.md)

---

Last updated: 2026-03-06
