# GPMS-B - Backend (FastAPI)

Backend module for CSU GPMS. Handles authentication, applications, document processing/OCR, approval workflow, and management reports.

## Tech Stack

- FastAPI
- SQLAlchemy (async)
- asyncpg
- PostgreSQL
- JWT auth
- pytesseract OCR utilities

## Prerequisites

- Python 3.10+
- PostgreSQL 12+
- Tesseract OCR binary installed and accessible

## Local Setup

```bash
cd GPMS-B
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` and configure:

- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Optional email: `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, `SMTP_SERVER`, `SMTP_PORT`
- Optional OCR config: `TESSERACT_CONFIG`

## Run API

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API root: `http://127.0.0.1:8000`
- OpenAPI docs: `http://127.0.0.1:8000/docs`

## Optional Seed Data

```bash
python -m app.utils.seed_db --action seed
```

## Main Source Structure

```text
app/
|-- api/v1/
|-- core/
|-- db/
|-- schemas/
|-- services/
|-- utils/
`-- routes/
```

## OCR Notes

- OCR extraction is implemented in `app/utils/document_ocr_utils.py` and related helpers.
- Input document types include OR, CR, and DL.

Last updated: 2026-03-10
