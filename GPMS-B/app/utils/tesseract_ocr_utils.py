"""
Pytesseract-based OCR: extract text from document images (OR/CR/DL).
Requires Tesseract binary installed on the system (e.g. from https://github.com/UB-Mannheim/tesseract/wiki).
"""
import os
import logging
import cv2
import pytesseract

logger = logging.getLogger(__name__)


def get_text_from_image(image_path: str) -> str:
    """
    Run pytesseract on the image and return extracted text.
    Uses preprocessing (grayscale, resize, denoise, contrast) for better results on documents.
    Returns empty string on error.
    """
    if not image_path or not os.path.isfile(image_path):
        return ""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return ""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape[:2]
        if max(h, w) < 1000:
            scale = 1000 / max(h, w)
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        # Reduce noise (helps with watermarks/stamps on CR)
        gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        # Slight contrast
        gray = cv2.convertScaleAbs(gray, alpha=1.1, beta=5)
        config = os.getenv("TESSERACT_CONFIG", "--psm 6 -c preserve_interword_spaces=1")
        text = pytesseract.image_to_string(gray, config=config.strip() or "--psm 6")
        return (text or "").strip()
    except Exception as e:
        logger.warning("Tesseract OCR failed: %s", e)
        return ""
