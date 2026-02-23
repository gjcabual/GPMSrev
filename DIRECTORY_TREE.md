# CSU GPMS – Directory Tree

```
CSU GPMS/
├── 2. MANUSCRIPT_GATEPASS. MANUSCRIPT_GATEPASS. MANUSCRIPT_GATEPASS
├── DIRECTORY_TREE.md
├── GPMS-A/
│   ├── .env
│   ├── .gitignore
│   ├── .prettierrc
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── vercel.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── applicant/
│   │   │   ├── bgCard.png
│   │   │   ├── cardDashboard.png
│   │   │   └── sampleFile.png
│   │   ├── auth/
│   │   │   ├── bg_login.png
│   │   │   └── wrong.jpg
│   │   ├── loading/
│   │   │   └── emptyList.jpg
│   │   ├── tempo/
│   │   │   ├── noApplication.jpg
│   │   │   └── tempoProfile.png
│   │   ├── check-symbol-4794.png
│   │   ├── csu_logo.png
│   │   ├── main_logo.png
│   │   ├── sampleimage.png
│   │   └── vite.svg
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── assets/
│       │   └── react.svg
│       ├── data/
│       │   └── data.js
│       ├── layouts/
│       │   ├── AdminLayout.jsx
│       │   ├── ApplicantLayout.jsx
│       │   └── StaffLayout.jsx
│       ├── routes/
│       │   ├── AdminRoutes.jsx
│       │   ├── ApplicantRoutes.jsx
│       │   ├── AuthRoutes.jsx
│       │   └── StaffRoutes.jsx
│       ├── utils/
│       │   ├── Auth.jsx
│       │   └── buildUrl.js
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Sidebar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── admin/
│       │   │   ├── AddStaff.jsx
│       │   │   └── DeleteStaff.jsx
│       │   ├── applicant/
│       │   │   ├── ApplicationInfo.jsx
│       │   │   ├── ApplicationLog.jsx
│       │   │   ├── ApplicationReview.jsx
│       │   │   ├── ApproveModal.jsx
│       │   │   ├── GatePassRulesRegulations.jsx
│       │   │   └── VerifyModal.jsx
│       │   ├── auth/
│       │   │   └── VerifyEmail.jsx
│       │   ├── dashboard/
│       │   │   └── Overview.jsx
│       │   ├── management/
│       │   │   ├── ApplicationInfo.jsx
│       │   │   ├── ApplicationList.jsx
│       │   │   └── HeaderManagement.jsx
│       │   ├── profile/
│       │   │   ├── ChangePassword.jsx
│       │   │   └── ProfileContent.jsx
│       │   ├── report/
│       │   │   ├── DonutChart.jsx
│       │   │   ├── DonutChartv2.jsx
│       │   │   ├── OverviewDashboard.jsx
│       │   │   ├── PaymentStatusChart.jsx
│       │   │   ├── PaymentStickerChart.jsx
│       │   │   ├── PieChart.jsx
│       │   │   ├── ReportGenerator.jsx
│       │   │   ├── TotalPaymentChart.jsx
│       │   │   └── VehicleStickersChart.jsx
│       │   └── response/
│       │       └── ResponseModal.jsx
│       └── pages/
│           ├── admin/
│           │   ├── BatchSticker.jsx
│           │   ├── Dashboard.jsx
│           │   ├── Management.jsx
│           │   ├── Reports.jsx
│           │   ├── Settings.jsx
│           │   └── Staff.jsx
│           ├── applicant/
│           │   ├── application/
│           │   │   └── Application.jsx
│           │   ├── ApplicationReview.jsx
│           │   ├── Dashboard.jsx
│           │   ├── Landing.jsx
│           │   ├── MyApplication.jsx
│           │   └── Profile.jsx
│           ├── auth/
│           │   ├── applicant/
│           │   │   ├── ApplicantLogin.jsx
│           │   │   └── ApplicantSignup.jsx
│           │   ├── ForgotPassword.jsx
│           │   ├── Login.jsx
│           │   ├── ResetPassword.jsx
│           │   └── Role.jsx
│           ├── reports/
│           │   └── dashboardReport.js
│           └── staff/
│               ├── Applicant.jsx
│               ├── Dashboard.jsx
│               ├── Management.jsx
│               ├── Report.jsx
│               └── Setting.jsx
│
└── GPMS-B/
    ├── .env
    ├── .gitignore
    ├── main.py
    ├── README.md
    ├── requirements.txt
    ├── app/
    │   ├── api/
    │   │   └── v1/
    │   │       ├── adminAuth/
    │   │       │   ├── controller.py
    │   │       │   ├── routes.py
    │   │       │   └── views.py
    │   │       ├── admin_route/
    │   │       │   └── staff_page/
    │   │       │       ├── controller.py
    │   │       │       ├── routes.py
    │   │       │       └── views.py
    │   │       ├── applicantAuth/
    │   │       │   ├── controller.py
    │   │       │   ├── routes.py
    │   │       │   └── views.py
    │   │       ├── applicant_route/
    │   │       │   ├── controller.py
    │   │       │   ├── routes.py
    │   │       │   └── views.py
    │   │       ├── commonAuth/
    │   │       │   ├── controller.py
    │   │       │   ├── routes.py
    │   │       │   └── views.py
    │   │       ├── management_route/
    │   │       │   ├── appliant_logs/
    │   │       │   │   ├── controller.py
    │   │       │   │   ├── route.py
    │   │       │   │   └── view.py
    │   │       │   ├── dashboard/
    │   │       │   │   ├── controller.py
    │   │       │   │   ├── routes.py
    │   │       │   │   └── views.py
    │   │       │   ├── management/
    │   │       │   │   ├── controller.py
    │   │       │   │   ├── routes.py
    │   │       │   │   └── views.py
    │   │       │   └── reports/
    │   │       │       ├── controller.py
    │   │       │       ├── routes.py
    │   │       │       └── views.py
    │   │       ├── staffAuth/
    │   │       │   ├── controller.py
    │   │       │   ├── routes.py
    │   │       │   └── views.py
    │   │       ├── staff_route/
    │   │       │   ├── controller.py
    │   │       │   ├── route.py
    │   │       │   └── views.py
    │   │       └── temp_route/
    │   │           ├── controller.py
    │   │           ├── routes.py
    │   │           └── views.py
    │   ├── core/
    │   │   ├── config.py
    │   │   ├── ocr_doc_validator.py
    │   │   └── security.py
    │   ├── db/
    │   │   ├── session.py
    │   │   ├── models/
    │   │   │   ├── application.py
    │   │   │   ├── application_status.py
    │   │   │   ├── assigned_driver.py
    │   │   │   ├── auth_driver.py
    │   │   │   ├── batch_sticker_sessions.py
    │   │   │   ├── document.py
    │   │   │   ├── profile.py
    │   │   │   ├── slip.py
    │   │   │   ├── sticker.py
    │   │   │   ├── token.py
    │   │   │   ├── user.py
    │   │   │   └── vehicle.py
    │   │   ├── repositories/
    │   │   │   ├── profile.py
    │   │   │   ├── token.py
    │   │   │   └── user.py
    │   │   └── seeders/
    │   │       ├── application_seeder.py
    │   │       ├── application_status.py
    │   │       ├── assigned_driver_seeder.py
    │   │       ├── auth_driver_seeder.py
    │   │       ├── base_seeder.py
    │   │       ├── batch_sticker_sessions_seeder.py
    │   │       ├── document_seeder.py
    │   │       ├── profile_seeder.py
    │   │       ├── slip_seeder.py
    │   │       ├── sticker_seeder.py
    │   │       ├── user_seeder.py
    │   │       └── vehicle_seeder.py
    │   ├── schemas/
    │   │   ├── application.py
    │   │   ├── batch_sticker.py
    │   │   ├── dashboard.py
    │   │   ├── management.py
    │   │   ├── profile.py
    │   │   ├── staff.py
    │   │   ├── temp.py
    │   │   ├── token.py
    │   │   └── user.py
    │   ├── services/
    │   │   └── auth_service.py
    │   ├── static/
    │   │   └── images/
    │   │       ├── CR_reference.png
    │   │       ├── dl_reference.jpg
    │   │       ├── or_reference.jpg
    │   │       ├── profile.png
    │   │       ├── vehicle_back.png
    │   │       └── vehicle_front.png
    │   └── utils/
    │       ├── application_utils.py
    │       ├── common_utils.py
    │       ├── date_ocr_utils.py
    │       ├── document_ocr_utils.py
    │       ├── email.py
    │       ├── image.py
    │       ├── image_ocr_utils.py
    │       ├── seed_db.py
    │       └── text_ocr_utils.py
    └── data_samples/
        └── Testing/
            ├── CR/                      (... sample images)
            ├── DL/                      (... sample images)
            ├── OR/                      (... sample images)
            ├── old/                     (... legacy sample data)
            └── references/              (... reference images)
```

**Excluded directories (not shown in tree):** `node_modules`, `.git`, `.venv`, `__pycache__`, `.vscode`, `dist`, `.pytest_cache`
