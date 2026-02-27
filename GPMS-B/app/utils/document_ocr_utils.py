import os
import re
import logging
from app.utils.text_ocr_utils import compare_text_array, extract_document_reference
from app.utils.date_ocr_utils import extract_dates
from datetime import datetime

logger = logging.getLogger(__name__)


def _safe_get_after_colon(line, max_len=200):
    """Get part after first colon, stripped and truncated. Returns None if missing."""
    if ":" not in line:
        return None
    parts = line.split(":", 1)
    if len(parts) < 2:
        return None
    s = (parts[1] or "").strip()
    return s[:max_len] if s else None


def _valid_piston(s):
    """Accept only plausible piston displacement (e.g. 110, 110cc, 1.5L). Reject single digit or garbage."""
    if not s or len(s) > 20:
        return None
    s = s.strip()
    m = re.match(r"^([\d.]+)\s*(cc|cm³|l|liter)?$", s, re.I)
    if not m:
        return None
    num_part = m.group(1)
    if len(num_part) < 2 and "cc" not in (m.group(2) or "").lower():  # reject bare "4"
        try:
            if float(num_part) < 10:  # single digit or tiny number
                return None
        except ValueError:
            return None
    return m.group(0).strip()


def _valid_year(s):
    """Accept only 4-digit year."""
    if not s:
        return None
    m = re.search(r"(19\d{2}|20\d{2})", str(s).strip())
    return m.group(1) if m else None


# Values that must not be accepted as engine/chassis (placeholder or junk)
_ENGINE_CHASSIS_BLOCKLIST = frozenset(
    ("fromcr", "from", "cr", "no", "na", "n/a", "none", "blank", "fromcr.")
)


def _valid_engine_chassis(s):
    """Accept alphanumeric + hyphen, reasonable length. Reject placeholders and garbage."""
    if not s or len(s) < 4 or len(s) > 30:
        return None
    s = re.sub(r"\s+", "", str(s).strip())
    if not re.match(r"^[A-Za-z0-9\-]+$", s):
        return None
    if s.lower() in _ENGINE_CHASSIS_BLOCKLIST:
        return None
    return s


def _valid_make(s):
    """Accept only make-like strings (e.g. Honda, Yamaha). Reject OCR garbage with punctuation."""
    if not s or len(s) > 50:
        return None
    s = str(s).strip()
    if len(s) < 2:
        return None
    # Reject if too many punctuation or digits (garbled OCR)
    punct_digit = sum(1 for c in s if c in ".=$-+*/\\|[]{}()@#%&*" or c.isdigit())
    if punct_digit > len(s) // 2 or punct_digit > 3:
        return None
    # Must be mostly letters and spaces/hyphens
    if not re.search(r"[A-Za-z]{2,}", s):
        return None
    return s[:50]


def extract_cr_fields(text):
    """
    Extract CR-specific fields from OCR text: owner name, address, engine no., chassis no., plate number,
    make, year model, body type, piston displacement.
    Uses keyword-based line parsing; document_date comes from extract_dates (CR upper-right date).
    Defensive: never raises; returns None for unextracted fields.
    """
    out = {
        "owner_name": None,
        "owner_address": None,
        "engine_no": None,
        "chassis_no": None,
        "plate_number": None,
        "make": None,
        "year_model": None,
        "body_type": None,
        "piston_displacement": None,
    }
    if not text or not (isinstance(text, str) and text.strip()):
        return out
    try:
        lines = [ln.strip() for ln in text.split("\n") if ln and ln.strip()]
    except Exception:
        return out
    text_lower = text.lower()
    for i, line in enumerate(lines):
        try:
            if not line:
                continue
            line_lower = line.lower()
            # Owner (LTO: "COMPLETE OWNERS NAME" or "OWNER'S NAME")
            if ("owner" in line_lower and "name" in line_lower) or ("owners" in line_lower and "name" in line_lower):
                val = _safe_get_after_colon(line, 120) or (lines[i + 1].strip()[:120] if i + 1 < len(lines) else "")
                if val and val.lower().strip() not in ("from cr", "from cr.", ""):
                    val = val.strip()
                    if re.search(r"[A-Za-z]{2,}", val) and len(val) >= 3 and len(val) <= 120:
                        out["owner_name"] = val[:120]
            elif "owner" in line_lower and not out["owner_name"] and i + 1 < len(lines):
                val = _safe_get_after_colon(line, 120) or lines[i + 1].strip()[:120]
                if val and val.lower().strip() not in ("from cr", "from cr.", ""):
                    val = val.strip()
                    if re.search(r"[A-Za-z]{2,}", val) and len(val) >= 3 and len(val) <= 120:
                        out["owner_name"] = val[:120]
            # Address
            if "address" in line_lower:
                val = _safe_get_after_colon(line, 200) or (lines[i + 1].strip()[:200] if i + 1 < len(lines) else None)
                if val and val.lower() not in ("from cr", "from cr.", ""):
                    out["owner_address"] = val.strip()[:200]
            # Engine no.
            if "engine" in line_lower and ("no" in line_lower or "number" in line_lower or ":" in line_lower or "." in line):
                rest = _safe_get_after_colon(line, 100) or line
                match = re.search(r"[A-Za-z0-9\-]{4,25}", rest)
                if match and not re.match(r"^\d{4}[-—\s]\d{11}$", (rest or "").strip()):
                    out["engine_no"] = _valid_engine_chassis(match.group(0).strip()) or out["engine_no"]
            # Chassis no.
            if "chassis" in line_lower:
                rest = _safe_get_after_colon(line, 50) or line
                match = re.search(r"[A-Za-z0-9\-]{4,25}", rest)
                if match:
                    out["chassis_no"] = _valid_engine_chassis(match.group(0).strip()) or out["chassis_no"]
            # Make (single word like Honda, Yamaha) – reject garbled OCR
            if "make" in line_lower and "year" not in line_lower:
                val = _safe_get_after_colon(line, 50) or (lines[i + 1].strip()[:50] if i + 1 < len(lines) else None)
                if val:
                    out["make"] = _valid_make(val) or out["make"]
            # Year model
            if "year" in line_lower and ("model" in line_lower or re.search(r"20\d{2}|19\d{2}", line)):
                val = _safe_get_after_colon(line, 20) or (lines[i + 1].strip()[:20] if i + 1 < len(lines) else None)
                out["year_model"] = _valid_year(val or line) or out["year_model"]
            # Body type
            if "body" in line_lower and "type" in line_lower:
                val = _safe_get_after_colon(line, 40) or (lines[i + 1].strip()[:40] if i + 1 < len(lines) else None)
                if val and len(val) < 35 and val.lower() not in ("from cr", "e.g. sedan, motorcycle"):
                    out["body_type"] = val.strip()[:40]
            # Piston displacement: only accept plausible values (e.g. 110, 110cc)
            if "piston" in line_lower or "displacement" in line_lower:
                val = _safe_get_after_colon(line, 30) or (lines[i + 1].strip()[:30] if i + 1 < len(lines) else None)
                out["piston_displacement"] = _valid_piston(val or "") or _valid_piston(line) or out["piston_displacement"]
                if not out["piston_displacement"]:
                    pd = re.search(r"[\d.]+\s*(?:cc|cm³|l|liter)", line_lower) or re.search(r"[\d.]+\s*cc", line_lower)
                    if pd:
                        out["piston_displacement"] = _valid_piston(pd.group(0)) or out["piston_displacement"]
            # Plate number
            if "plate" in line_lower or "mv file" in line_lower:
                rest = _safe_get_after_colon(line, 30) or line
                plate = re.search(r"[A-Za-z]{2,4}[-]?\s*\d{2,5}", rest) or re.search(r"\d{2,5}[-]?[A-Za-z]{2,4}", rest)
                if plate:
                    out["plate_number"] = re.sub(r"\s+", "", plate.group(0))[:15]
        except Exception:
            continue
    # Fallback: plate pattern anywhere
    if not out["plate_number"]:
        for line in lines:
            try:
                m = re.search(r"\b([A-Za-z]{2,4}[-]?\d{2,5})\b", line)
                if m:
                    out["plate_number"] = m.group(1).replace(" ", "")[:15]
                    break
            except Exception:
                continue
    # Reject placeholder-like or blocklisted values
    if out.get("chassis_no"):
        c = re.sub(r"\s+", "", str(out["chassis_no"]).lower())
        if c in _ENGINE_CHASSIS_BLOCKLIST or out["chassis_no"].lower() in ("from cr", "from cr."):
            out["chassis_no"] = None
    if out.get("engine_no"):
        e = re.sub(r"\s+", "", str(out["engine_no"]).lower())
        if e in _ENGINE_CHASSIS_BLOCKLIST or out["engine_no"].lower() in ("from cr", "from cr."):
            out["engine_no"] = None
    if out.get("make") and not _valid_make(out["make"]):
        out["make"] = None
    # Fallback: year model anywhere (4-digit year)
    if not out["year_model"]:
        for line in lines:
            ym = _valid_year(line)
            if ym:
                out["year_model"] = ym
                break
    # Fallback: piston displacement (digits + optional cc) anywhere
    if not out["piston_displacement"]:
        for line in lines:
            pd = re.search(r"\b([\d.]+\s*(?:cc|cm³|l|liter)?)\b", line, re.I)
            if pd:
                v = _valid_piston(pd.group(1))
                if v:
                    out["piston_displacement"] = v
                    break
    return out


def extract_document_data(uploaded_image_path, doc_type):
    """
    Extract document fields using pytesseract OCR. Returns file_number, dates, and for CR extra fields.
    """
    result = {
        "file_number": None,
        "dates": {"expiration_date": None, "birth_date": None, "document_date": None, "other_dates": []},
        "owner_name": None,
        "owner_address": None,
        "engine_no": None,
        "chassis_no": None,
        "plate_number": None,
        "make": None,
        "year_model": None,
        "body_type": None,
        "piston_displacement": None,
    }
    try:
        from app.utils.tesseract_ocr_utils import get_text_from_image
        uploaded_text = get_text_from_image(uploaded_image_path)
        if not uploaded_text or not uploaded_text.strip():
            return result
        if doc_type in ("OR", "CR"):
            try:
                ref_result = extract_document_reference(uploaded_text, doc_type)
                if ref_result.get("is_valid"):
                    result["file_number"] = ref_result.get("file_number")
            except Exception as e:
                logger.debug("extract_document_reference failed: %s", e)
        try:
            dates = extract_dates(uploaded_text, doc_type)
            if dates:
                result["dates"] = dates
        except Exception as e:
            logger.debug("extract_dates failed: %s", e)
        if doc_type == "CR":
            try:
                cr = extract_cr_fields(uploaded_text)
                if cr:
                    result["owner_name"] = cr.get("owner_name")
                    result["owner_address"] = cr.get("owner_address")
                    result["engine_no"] = cr.get("engine_no")
                    result["chassis_no"] = cr.get("chassis_no")
                    result["plate_number"] = cr.get("plate_number")
                    result["make"] = cr.get("make")
                    result["year_model"] = cr.get("year_model")
                    result["body_type"] = cr.get("body_type")
                    result["piston_displacement"] = cr.get("piston_displacement")
            except Exception as e:
                logger.debug("extract_cr_fields failed: %s", e)
    except Exception as e:
        logger.warning("extract_document_data failed: %s", e)
    return result


def document_type(doc_type):
    """
    Optional reference image path for document type. Used only for DL validation
    (reference image is not read; validation uses OCR of uploaded image vs applicant data).
    Returns None if DOC_REFERENCE_DIR is not set or reference file does not exist.
    """
    doc_type = doc_type.strip().upper()
    ref_dir = os.getenv("DOC_REFERENCE_DIR", "").strip()
    if not ref_dir:
        return None
    names = {"OR": "or_reference.jpg", "DL": "dl_reference.jpg", "CR": "cr_reference.png"}
    if doc_type not in names:
        return None
    reference_path = os.path.join(ref_dir, names[doc_type])
    if not os.path.isfile(reference_path):
        logger.debug("Reference file not found: %s", reference_path)
        return None
    return reference_path

def check_expiration(date_str, doc_type="OR"):
    """Check document validity based on type"""
    if not date_str:
        return False, "No date found"
    
    # For CR documents, always return valid
    if doc_type == "CR":
        return True, "Valid - CR documents do not expire"
    
    try:
        current_date = datetime.now()
        
        if doc_type == "OR":
            # Handle MM/YYYY format for OR
            if (len(date_str.split('/')) == 2):
                month, year = map(int, date_str.split('/'))
                exp_date = datetime(year, month + 1, 1)  # First day of next month
            else:
                exp_date = datetime.strptime(date_str, '%Y/%m/%d')
        else:
            # Handle full date format for other documents
            exp_date = datetime.strptime(date_str, '%Y/%m/%d')
        
        is_valid = exp_date > current_date
        days_remaining = (exp_date - current_date).days
        
        if is_valid:
            if doc_type == "OR":
                months_remaining = days_remaining // 30
                message = f"Valid - {months_remaining} months remaining"
            else:
                message = f"Valid - {days_remaining} days remaining"
        else:
            if doc_type == "OR":
                months_ago = abs(days_remaining) // 30
                message = f"Expired - {months_ago} months ago"
            else:
                message = f"Expired - {abs(days_remaining)} days ago"
            
        return is_valid, message
        
    except ValueError:
        return False, "Invalid date format"

def compare_credentials(reference_image_path, uploaded_image_path, text_array, show_results=True, save_results=True, doc_type="DL"):
    """Validate document using pytesseract OCR. reference_image_path unused."""
    result = {
        'is_valid': False,
        'image_valid': False,
        'text_valid': False,
        'date_valid': False,
        'date_message': "Not processed",
        'image_similarity': 1.0,
        'text_similarity': 0.0,
        'extracted_text': '',
        'dates': {'expiration_date': None, 'birth_date': None, 'other_dates': []},
        'file_number': None,
    }
    try:
        from app.utils.tesseract_ocr_utils import get_text_from_image
        uploaded_text = get_text_from_image(uploaded_image_path)
        result["extracted_text"] = uploaded_text
        is_image_valid = bool(uploaded_text and uploaded_text.strip())

        if doc_type in ["OR", "CR"]:
            ref_result = extract_document_reference(uploaded_text, doc_type)
            if ref_result.get("is_valid"):
                result["file_number"] = ref_result["file_number"]
            is_text_valid = bool(result.get("file_number"))
            text_similarity = 1.0 if is_text_valid else 0.0
            if show_results:
                logger.debug("OR/CR file number validation type=%s valid=%s", doc_type, is_text_valid)
        else:
            is_text_valid, text_similarity = compare_text_array(
                text_array, uploaded_text, threshold=0.85, doc_type=doc_type, show_results=show_results
            )

        dates = extract_dates(uploaded_text, doc_type)
        if dates:
            result["dates"] = dates
        is_date_valid, date_message = check_expiration(result["dates"].get("expiration_date"), doc_type)

        if doc_type == "CR":
            overall_valid = is_image_valid and is_text_valid
        else:
            overall_valid = is_image_valid and is_text_valid and is_date_valid

        result.update({
            'is_valid': overall_valid,
            'image_valid': is_image_valid,
            'text_valid': is_text_valid,
            'date_valid': is_date_valid,
            'date_message': date_message,
            'text_similarity': text_similarity,
        })
    except Exception as e:
        logger.warning("compare_credentials failed: %s", e)
    return result

def process_image_with_validation(image_path, reference_text, show_results=True, doc_type="DL"):
    """
    Process an image using pytesseract and validate extracted text against reference credentials.
    """
    from app.utils.text_ocr_utils import validate_credentials
    from app.utils.tesseract_ocr_utils import get_text_from_image
    extracted_text = get_text_from_image(image_path)
    if not extracted_text or not extracted_text.strip():
        return {
            'is_valid': False,
            'text_valid': False,
            'date_valid': False,
            'text_similarity': 0.0,
            'date_message': "Failed to process image",
            'text_output_path': None,
            'annotated_image_path': None
        }
    dates = extract_dates(extracted_text, doc_type) or {}
    is_text_valid, text_similarity = validate_credentials(extracted_text, reference_text, threshold=0.85)
    is_date_valid, date_message = check_expiration(dates.get("expiration_date"), doc_type)

    if show_results:
        logger.debug(
            "Document validation text_valid=%s similarity=%.2f date_valid=%s message=%s",
            is_text_valid, text_similarity, is_date_valid, date_message
        )

    return {
        'is_valid': is_text_valid and is_date_valid,
        'text_valid': is_text_valid,
        'date_valid': is_date_valid,
        'text_similarity': text_similarity,
        'date_message': date_message,
        'dates': dates,
        'text_output_path': None,
        'annotated_image_path': None
    }