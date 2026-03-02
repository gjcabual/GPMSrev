// GPMS-A/src/components/DocumentUpload.jsx
import { useState } from 'react'
import { extractDocument } from '../utils/ocrService'

export default function DocumentUpload({ onExtracted }) {
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)

    async function handleUpload(e, docType) {
        const file = e.target.files[0]
        if (!file) return

        setLoading(true)
        setError(null)

        try {
            const result = await extractDocument(file)

            // Validate correct doc was uploaded
            const expected = {
                cr: ['CR_A', 'CR_B'],
                or: ['OR'],
                dl: ['DRIVERS_LICENSE']
            }
            if (!expected[docType].includes(result.doc_type)) {
                throw new Error(`Wrong document. Expected ${docType.toUpperCase()}, got ${result.doc_type}`)
            }

            onExtracted(docType, result.fields)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div>
                <label>CR (Certificate of Registration)</label>
                <input type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'cr')} />
            </div>
            <div>
                <label>OR (Official Receipt)</label>
                <input type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'or')} />
            </div>
            <div>
                <label>Driver's License</label>
                <input type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'dl')} />
            </div>

            {loading && <p>Scanning document...</p>}
            {error   && <p style={{color:'red'}}>{error}</p>}
        </div>
    )
}