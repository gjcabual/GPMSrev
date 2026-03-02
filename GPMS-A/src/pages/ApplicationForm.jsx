// GPMS-A/src/pages/ApplicationForm.jsx
import { useState } from 'react'
import DocumentUpload from '../components/DocumentUpload'

export default function ApplicationForm() {
    const [form, setForm] = useState({
        owner_name: '', plate_no: '', engine_no: '',
        chassis_no: '', year_model: '', or_no: '',
        license_no: '', expiration_date: ''
    })

    function handleExtracted(docType, fields) {
        // Merge extracted fields into form
        setForm(prev => ({ ...prev, ...fields }))
    }

    return (
        <div>
            <h2>Gate Pass Application</h2>

            {/* Upload + auto-extract */}
            <DocumentUpload onExtracted={handleExtracted} />

            {/* Auto-filled form */}
            <input value={form.owner_name}
                onChange={e => setForm({...form, owner_name: e.target.value})}
                placeholder="Owner Name" />
            <input value={form.plate_no}
                onChange={e => setForm({...form, plate_no: e.target.value})}
                placeholder="Plate No." />
            <input value={form.or_no}
                onChange={e => setForm({...form, or_no: e.target.value})}
                placeholder="OR No." />
            {/* ...more fields */}

            <button type="submit">Submit Application</button>
        </div>
    )
}
// ```

// ---

// **Summary of the full flow:**
// // ```
// User uploads photo
//       ↓
// React sends to POST /api/v1/ocr/extract
//       ↓
// FastAPI saves to temp file → calls lto_extractor.extract()
//       ↓
// Tesseract OCR → detect doc type → extract fields
//       ↓
// Returns { doc_type, fields } JSON
//       ↓
// React auto-fills the application form
//       ↓
// User reviews & submits
