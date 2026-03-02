// GPMS-A/src/components/DocumentUpload.jsx
import { useState, useRef } from 'react'
import { extractDocument } from '../utils/ocrService'

export default function DocumentUpload({ onExtracted }) {
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)
    const crInputRef  = useRef(null)
    const orInputRef  = useRef(null)
    const dlInputRef  = useRef(null)

    function clearFileInput(ref) {
        if (ref?.current) ref.current.value = ''
    }

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

            // Map DL 'name' to owner_name for form consistency
            const fields = docType === 'dl' && result.fields?.name != null
                ? { ...result.fields, owner_name: result.fields.name }
                : result.fields

            onExtracted(docType, fields)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
            const refs = { cr: crInputRef, or: orInputRef, dl: dlInputRef }
            clearFileInput(refs[docType])
        }
    }

    return (
        <div>
            <div>
                <label>CR (Certificate of Registration)</label>
                <input ref={crInputRef} type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'cr')} />
            </div>
            <div>
                <label>OR (Official Receipt)</label>
                <input ref={orInputRef} type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'or')} />
            </div>
            <div>
                <label>Driver's License</label>
                <input ref={dlInputRef} type="file" accept="image/*"
                    onChange={e => handleUpload(e, 'dl')} />
            </div>

            {loading && <p>Scanning document...</p>}
            {error   && <p style={{color:'red'}}>{error}</p>}
        </div>
    )
}