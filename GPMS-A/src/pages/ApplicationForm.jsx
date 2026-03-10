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

    function handleChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div>
            <h2>Gate Pass Application</h2>

            {/* Upload + auto-extract */}
            <DocumentUpload onExtracted={handleExtracted} />

            {/* Auto-filled form */}
            <form onSubmit={e => e.preventDefault()}>
                <input value={form.owner_name}
                    onChange={e => handleChange('owner_name', e.target.value)}
                    placeholder="Owner Name" />
                <input value={form.plate_no}
                    onChange={e => handleChange('plate_no', e.target.value)}
                    placeholder="Plate No." />
                <input value={form.engine_no}
                    onChange={e => handleChange('engine_no', e.target.value)}
                    placeholder="Engine No." />
                <input value={form.chassis_no}
                    onChange={e => handleChange('chassis_no', e.target.value)}
                    placeholder="Chassis No." />
                <input value={form.year_model}
                    onChange={e => handleChange('year_model', e.target.value)}
                    placeholder="Year Model" />
                <input value={form.or_no}
                    onChange={e => handleChange('or_no', e.target.value)}
                    placeholder="OR No." />
                <input value={form.license_no}
                    onChange={e => handleChange('license_no', e.target.value)}
                    placeholder="License No." />
                <input type="date" value={form.expiration_date}
                    onChange={e => handleChange('expiration_date', e.target.value)}
                    placeholder="Expiration Date" />

                <button type="submit">Submit Application</button>
            </form>
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
