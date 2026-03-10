# CSU GPMS - Directory Tree

```text
CSU GPMS/
|-- .cursor
|   |-- plans
|   |   |-- ocr_extract-only_and_separated_document_upload_5f3c79ce.plan.md
|   |   `-- ocr_extract-only_and_separated_document_upload_8828f111.plan.md
|   |-- debug.log
|   `-- debug-6cd765.log
|-- .vscode
|   `-- settings.json
|-- GPMS-A
|   |-- public
|   |   |-- applicant
|   |   |   |-- bgCard.png
|   |   |   |-- cardDashboard.png
|   |   |   `-- sampleFile.png
|   |   |-- auth
|   |   |   |-- bg_login.png
|   |   |   `-- wrong.jpg
|   |   |-- loading
|   |   |   `-- emptyList.jpg
|   |   |-- tempo
|   |   |   |-- noApplication.jpg
|   |   |   `-- tempoProfile.png
|   |   |-- check-symbol-4794.png
|   |   |-- csu_logo.png
|   |   |-- main_logo.png
|   |   |-- sampleimage.png
|   |   `-- vite.svg
|   |-- src
|   |   |-- assets
|   |   |   `-- react.svg
|   |   |-- components
|   |   |   |-- admin
|   |   |   |-- applicant
|   |   |   |-- auth
|   |   |   |-- dashboard
|   |   |   |-- management
|   |   |   |-- profile
|   |   |   |-- report
|   |   |   |-- response
|   |   |   |-- AuthRouteGuard.jsx
|   |   |   |-- DocumentUpload.jsx
|   |   |   |-- Header.jsx
|   |   |   |-- ProtectedRoute.jsx
|   |   |   `-- Sidebar.jsx
|   |   |-- data
|   |   |   `-- data.js
|   |   |-- layouts
|   |   |   |-- AdminLayout.jsx
|   |   |   |-- ApplicantLayout.jsx
|   |   |   `-- StaffLayout.jsx
|   |   |-- pages
|   |   |   |-- admin
|   |   |   |-- applicant
|   |   |   |-- auth
|   |   |   |-- reports
|   |   |   |-- staff
|   |   |   `-- ApplicationForm.jsx
|   |   |-- routes
|   |   |   |-- AdminRoutes.jsx
|   |   |   |-- ApplicantRoutes.jsx
|   |   |   |-- AuthRoutes.jsx
|   |   |   `-- StaffRoutes.jsx
|   |   |-- utils
|   |   |   |-- Auth.jsx
|   |   |   |-- buildUrl.js
|   |   |   |-- ocrService.js
|   |   |   `-- psgcApi.js
|   |   |-- App.jsx
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- .env
|   |-- .env.example
|   |-- .gitignore
|   |-- .prettierrc
|   |-- eslint.config.js
|   |-- gpms-frontend@0.0.0
|   |-- index.html
|   |-- package.json
|   |-- package-lock.json
|   |-- README.md
|   |-- vercel.json
|   |-- vite
|   `-- vite.config.js
|-- GPMS-B
|   |-- app
|   |   |-- api
|   |   |   `-- v1
|   |   |-- core
|   |   |   |-- config.py
|   |   |   |-- ocr_doc_validator.py
|   |   |   `-- security.py
|   |   |-- db
|   |   |   |-- models
|   |   |   |-- repositories
|   |   |   |-- seeders
|   |   |   `-- session.py
|   |   |-- routes
|   |   |   `-- ocr.py
|   |   |-- schemas
|   |   |   |-- application.py
|   |   |   |-- batch_sticker.py
|   |   |   |-- dashboard.py
|   |   |   |-- management.py
|   |   |   |-- profile.py
|   |   |   |-- staff.py
|   |   |   |-- temp.py
|   |   |   |-- token.py
|   |   |   `-- user.py
|   |   |-- services
|   |   |   `-- auth_service.py
|   |   |-- static
|   |   |   `-- images
|   |   `-- utils
|   |       |-- application_utils.py
|   |       |-- common_utils.py
|   |       |-- date_ocr_utils.py
|   |       |-- document_ocr_utils.py
|   |       |-- email.py
|   |       |-- image.py
|   |       |-- lto_extractor.py
|   |       |-- seed_db.py
|   |       |-- tesseract_ocr_utils.py
|   |       |-- text_ocr_utils.py
|   |       `-- validators.py
|   |-- data_samples
|   |   `-- Testing
|   |       |-- CR
|   |       |-- DL
|   |       |-- old
|   |       |-- OR
|   |       `-- references
|   |-- result
|   |   |-- cr_reference_ocr.txt
|   |   |-- dl_reference_boxes.jpg
|   |   |-- dl_reference_ocr.txt
|   |   |-- or_reference_ocr.txt
|   |   |-- temp_CR_robertoCR_ocr.txt
|   |   |-- temp_DL_dl-papa_boxes.jpg
|   |   |-- temp_DL_dl-papa_ocr.txt
|   |   |-- temp_DL_driverslicense_boxes.jpg
|   |   |-- temp_DL_driverslicense_ocr.txt
|   |   `-- temp_OR_robertoOR_ocr.txt
|   |-- scripts
|   |   |-- add_batch_name_to_batch_sticker_sessions.sql
|   |   `-- test_openrouter.py
|   |-- .env
|   |-- .env.example
|   |-- .gitignore
|   |-- backfill_application_status.sql
|   |-- init_gpmsdb.sql
|   |-- main.py
|   |-- README.md
|   `-- requirements.txt
|-- .gitignore
|-- DIRECTORY_TREE.md
`-- README.md
```

Excluded from tree: `.git`, `node_modules`, `.venv`, `__pycache__`, `dist`, `.pytest_cache`.

Last updated: 2026-03-10
