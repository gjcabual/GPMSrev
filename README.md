# CSU GPMS – Gate Pass Management System

Vehicle pass authorization system for campus access control. It manages vehicle registration, applications, and document handling (Official Receipt, Certificate of Registration, Driver's License) with **user-assisted OCR** using **pytesseract**.

---

## How the system works

### Roles

| Role       | Purpose |
|-----------|---------|
| **Applicant** | Submits gate pass applications, uploads documents (OR, CR, DL), enters vehicle and personal info. Can use “use my account details” to prefill from profile. |
| **Staff**     | Reviews and processes applications, manages vehicle stickers, views reports. |
| **Admin**     | Manages staff, system settings, and high-level oversight. |

### Applicant flow (5 steps)

1. **Personal information** – Building, application type, plate number. Optional: “Use my account details” prefills from profile (read-only).
2. **Confirm email** – OTP sent to email; applicant enters code to verify (no profile update in this step).
3. **Documents** – Upload **Certificate of Registration (CR)**, **Official Receipt (OR)**, and **Driver's License (DL)** one at a time. For each document:
   - Backend runs **OCR (pytesseract)** on the image and returns extracted fields.
   - Form is **user-assisted**: fields are pre-filled from the document; the user reviews, corrects, or fills missing data, then proceeds.
4. **Vehicle information** – Vehicle type, front/back photos. Optionally add authorized drivers (with DL upload and validation).
5. **Confirm details** – Review OR/CR/DL file numbers and dates, confirm, and submit.

### Document extraction (OCR)

- **Technology:** **pytesseract** (Tesseract OCR). The system does **not** use EasyOCR, OpenRouter, Claude, or Ollama.
- **Process:** Uploaded image → Tesseract extracts text → backend parses fields (file number, dates, CR fields: owner name, address, engine/chassis, make, year model, body type, piston displacement, plate).
- **User-assisted:** Extracted values are shown in the form; the user can edit or add anything. Validation (e.g. OR/CR file number match) runs at submit.
- **Requirements:** Tesseract binary must be installed on the machine running the backend (see [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)).

### Backend flow

- **Auth:** JWT-based; role-specific routes (applicant, staff, admin).
- **Database:** PostgreSQL (async via asyncpg). Tables: users, profiles, tokens, applications, application_status, vehicles, documents, authorized_drivers, stickers, etc.
- **APIs:** REST under `/api/v1` (auth, applicant application, management, staff, admin, reports). Document extraction: `POST /api/v1/applicant/application/extract-one` (single doc) or `/application/extract` (OR, CR, DL).
- **Email:** Optional; used for OTP, password reset, and staff invite (SMTP in `.env`).

### Staff / admin

- Staff see pending applications, approve/reject, manage stickers, view management and reports.
- Admin manages staff and has broader access. Dashboards and reports use the same backend APIs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GPMS-A (Frontend)                               │
│  React 19 + Vite 6 · Tailwind CSS · Port 5173                            │
│  Applicant portal · Staff UI · Admin UI                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                  │ HTTP /api/v1
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          GPMS-B (Backend)                                │
│  FastAPI · Uvicorn · Port 8000                                           │
│  Auth (JWT) · Applicant routes · Management · Staff · Admin · Reports   │
│  OCR: pytesseract (Tesseract) for OR/CR/DL extraction                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
           ┌───────────────┐           ┌─────────────────┐
           │  PostgreSQL   │           │ Tesseract OCR   │
           │  (gpmsdb)     │           │ (system binary)  │
           └───────────────┘           └─────────────────┘
```

- **GPMS-A:** React 19 + Vite 6 frontend (port 5173).
- **GPMS-B:** FastAPI backend (port 8000); uses PostgreSQL and pytesseract (Tesseract binary).
- **PostgreSQL:** Database (e.g. `gpmsdb`).
- **Tesseract:** Required for document text extraction (installed separately; pytesseract is the Python wrapper).

---

## Prerequisites

| Requirement   | Version / details |
|---------------|--------------------|
| **Node.js**   | 18+ (LTS) for npm and Vite |
| **Python**    | 3.10+ (3.11 recommended for asyncpg) |
| **PostgreSQL**| 12+ (local or Docker) |
| **Tesseract** | Required for document extraction. Install the binary; see [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki) or your OS package manager. |
| **Git**       | Optional, for cloning |

---

## Project structure

| Path | Description |
|------|-------------|
| **GPMS-A/** | React 19 + Vite 6 frontend (applicant, staff, admin UIs) |
| **GPMS-B/** | FastAPI backend (auth, applications, OCR, management, reports) |
| **GPMS-B/app/utils/** | `tesseract_ocr_utils.py` (OCR), `document_ocr_utils.py` (parsing & validation) |
| **GPMS-B/scripts/** | e.g. `test_openrouter.py` (pytesseract extraction test script) |
| **GPMS-B/.env.example** | Example backend env (DB, Tesseract, email) |

---

## Environment variables

### GPMS-A (frontend)

Create **GPMS-A/.env**:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### GPMS-B (backend)

Create **GPMS-B/.env** (from **GPMS-B/.env.example**):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gpmsdb
DB_USER=postgres
DB_PASSWORD=your_password

# Document extraction uses pytesseract (Tesseract binary must be installed)
# Optional: TESSERACT_CONFIG=--psm 6

# Optional – for OTP, password reset, staff invite
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

---

## Database setup

1. Create the database:

   ```sql
   CREATE DATABASE gpmsdb;
   ```

2. Start the backend once; FastAPI creates tables on startup.

3. Seed initial data (admin, staff, applicant accounts):

   ```bash
   cd GPMS-B
   python -m app.utils.seed_db --action seed
   ```

---

## Installation and run

### 1. Backend (GPMS-B)

```bash
cd GPMS-B
python -m venv .venv
```

Activate the virtual environment:

- **Windows:** `.venv\Scripts\activate`
- **macOS/Linux:** `source .venv/bin/activate`

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Install and configure **Tesseract** so the `tesseract` command is on PATH (or set `pytesseract.pytesseract.tesseract_cmd` if needed).

### 2. Frontend (GPMS-A)

```bash
cd GPMS-A
npm install
npm run dev
```

Open **http://localhost:5173**.

### 3. Test OCR (optional)

From **GPMS-B**:

```bash
python scripts/test_openrouter.py
python scripts/test_openrouter.py path/to/cr_image.jpg CR
```

---

## Default login credentials (after seed)

| Role       | Email               | Password      |
|-----------|---------------------|---------------|
| Admin     | admin@example.com    | admin123      |
| Staff     | staff@example.com    | staff123      |
| Applicant | applicant@example.com | applicant123 |

Applicant login: `/applicant-login` · Staff: `/staff-login` · Admin: `/admin-login`.

---

## Verification

- [ ] Backend: http://127.0.0.1:8000 → `{"message":"GPMS Server is Running!"}`
- [ ] API docs: http://127.0.0.1:8000/docs
- [ ] Frontend: http://localhost:5173 (login page)
- [ ] Applicant can complete the 5-step flow and upload OR/CR/DL (user-assisted extraction).
- [ ] Staff can view and process applications.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **CORS errors** | Backend on port 8000; `VITE_API_BASE_URL` in GPMS-A must point to it. |
| **DB connection failed** | PostgreSQL running; check `DB_*` in GPMS-B `.env`. |
| **OCR / extraction fails** | Install Tesseract binary and add it to PATH. Run `pip install -r GPMS-B/requirements.txt` (includes pytesseract). Test with `python scripts/test_openrouter.py path/to/cr.jpg CR`. |
| **No data extracted** | Image quality, stamps, or watermarks can limit OCR. User can always type data manually (user-assisted). |
| **Email OTP not sending** | Set SMTP in `.env`; for Gmail use an [App Password](https://support.google.com/accounts/answer/185833). |
| **Module not found** | Activate backend venv; run `npm install` in GPMS-A. |

---

## Production notes

- Set a strong `SECRET_KEY` (or equivalent) via environment; do not commit secrets.
- Restrict CORS (avoid `allow_origins=["*"]` when using credentials).
- Build frontend: `cd GPMS-A && npm run build`; serve the build with Nginx, Vercel, or similar.
- Run backend with a production ASGI server (e.g. Uvicorn with workers) behind a reverse proxy.

---

## Additional documentation

- [GPMS-A/README.md](GPMS-A/README.md) – Frontend overview and routes.
- [GPMS-B/README.md](GPMS-B/README.md) – Backend setup and API.
