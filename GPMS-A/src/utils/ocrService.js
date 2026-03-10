// GPMS-A/src/utils/ocrService.js

const API = import.meta.env.VITE_API_BASE_URL  // http://127.0.0.1:8000/api/v1

export async function extractDocument(file) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API}/ocr/extract`, {
        method: 'POST',
        body: formData
    })

    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'OCR failed')
    }

    return await res.json()
    // returns { doc_type: "CR_A", fields: { plate_no: "...", ... } }
}