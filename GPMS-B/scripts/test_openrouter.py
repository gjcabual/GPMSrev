"""
Quick test for pytesseract document extraction.
Run from GPMS-B directory:
  python scripts/test_openrouter.py
  python scripts/test_openrouter.py path/to/cr_image.jpg CR
"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)
sys.path.insert(0, BASE)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE, ".env"))


def test_tesseract_import():
    """Test that pytesseract and Tesseract binary are available."""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        print("OK: pytesseract and Tesseract binary are available.")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        print("Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki")
        return False


def test_extract(image_path: str, doc_type: str = "CR"):
    """Test document extraction on an image."""
    if not os.path.isfile(image_path):
        print(f"FAIL: Image not found: {image_path}")
        return False
    try:
        from app.utils.document_ocr_utils import extract_document_data
        result = extract_document_data(image_path, doc_type)
        has_data = any(result.get(k) for k in ("file_number", "owner_name", "dates") if result.get(k))
        if not has_data:
            print("No fields extracted (check image quality and Tesseract).")
        else:
            print("OK: Extraction returned data.")
        print("Result keys with values:", {k: v for k, v in result.items() if v and (not isinstance(v, dict) or any(v.values()))})
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("--- Test: pytesseract + Tesseract binary ---")
    ok = test_tesseract_import()
    print()
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        doc_type = (sys.argv[2] if len(sys.argv) > 2 else "CR").strip().upper()
        print(f"--- Test: extract from {path} ({doc_type}) ---")
        test_extract(path, doc_type)
    else:
        print("Optional: python scripts/test_openrouter.py <image_path> [OR|CR|DL]")
    sys.exit(0 if ok else 1)
