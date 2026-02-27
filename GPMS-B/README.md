# GPMS-B – Backend (FastAPI)

Backend for the Gate Pass Management System. Handles auth (JWT), applicant applications, document extraction (OCR via **pytesseract**), management, staff, admin, and reports.

## Prerequisites

- **Python 3.10+** (3.11 recommended)
- **PostgreSQL 12+**
- **Tesseract OCR** – required for document extraction. Install the binary; see [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki) or your OS package manager.

## Setup

### 1. Clone and enter project

```bash
cd GPMS-B
```

### 2. Virtual environment

```bash
python -m venv .venv
```

Activate:

- **Windows:** `.venv\Scripts\activate`
- **macOS/Linux:** `source .venv/bin/activate`

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment

Copy **.env.example** to **.env** and set:

- **Database:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (database name used by seed: `gpmsdb`)
- **Optional:** `TESSERACT_CONFIG` for Tesseract (e.g. `--psm 6`)
- **Optional (email):** `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, `SMTP_SERVER`, `SMTP_PORT` for OTP, password reset, staff invite

### 5. Database

1. Create the database:

   ```sql
   CREATE DATABASE gpmsdb;
   ```

2. Start the app once so tables are created:

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. Seed initial data (admin, staff, applicant):

   ```bash
   python -m app.utils.seed_db --action seed
   ```

### 6. Run

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

## OCR (document extraction)

- **Technology:** **pytesseract** (Tesseract binary must be installed and on PATH).
- **Usage:** `extract_document_data()` in `app/utils/document_ocr_utils.py` uses `app/utils/tesseract_ocr_utils.py` for OR, CR, and DL.
- **Test script:** `python scripts/test_openrouter.py [image_path] [OR|CR|DL]`

## Deactivate venv

```bash
deactivate
```
