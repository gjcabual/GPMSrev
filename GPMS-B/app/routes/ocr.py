from fastapi import APIRouter, UploadFile, File, HTTPException
from app.utils.lto_extractor import extract
import tempfile, os

router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])

@router.post("/extract")
async def extract_document(file: UploadFile = File(...)):
    # Save upload to temp file
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = extract(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
    finally:
        os.remove(tmp_path)

    if result['doc_type'] == "UNKNOWN":
        raise HTTPException(status_code=400, detail="Could not identify document type")

    return result