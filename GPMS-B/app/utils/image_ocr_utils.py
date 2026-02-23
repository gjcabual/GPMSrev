import os
import cv2
import pytesseract
from PIL import Image
from app.utils.common_utils import get_text_from_file

# Optional: set Tesseract path on Windows if not in PATH (e.g. r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.name == "nt":
    _tesseract_cmd = os.getenv("TESSERACT_CMD")
    if _tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd


def _deskew(img):
    """Correct slight rotation in document photos using Hough lines."""
    import math
    gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, math.pi / 180, 100, minLineLength=100, maxLineGap=10)
    if lines is None or len(lines) < 3:
        return img
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 != x1:
            angles.append(math.degrees(math.atan2(y2 - y1, x2 - x1)))
    if not angles:
        return img
    median_angle = sorted(angles)[len(angles) // 2]
    if abs(median_angle) < 0.5:
        return img
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), median_angle, 1.0)
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _preprocess_common(img):
    """Deskew, resize/upscale - shared by both preprocessing paths."""
    if img is None or img.size == 0:
        return None
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
    gray = _deskew(gray)
    min_side = 1200
    h, w = gray.shape[:2]
    if max(h, w) < min_side:
        scale = min_side / max(h, w)
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return gray


def _preprocess_for_ocr(img):
    """Primary: adaptive threshold - good for clean docs with uneven lighting."""
    gray = _preprocess_common(img)
    if gray is None:
        return None
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    thresh = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    return cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)


def _preprocess_grayscale(img):
    """Fallback: grayscale + bilateral filter - better for watermarked docs (e.g. CR)."""
    gray = _preprocess_common(img)
    if gray is None:
        return None
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return cv2.bilateralFilter(enhanced, 5, 50, 50)


def process_image(image_path, save_results=True):
    """
    Process an image using OCR, optionally save the text and create annotated image.
    
    Args:
        image_path (str): Path to the image file
        save_results (bool): Whether to save OCR text and annotated image
    
    Returns:
        tuple: (text_output_path, annotated_image_path) or (extracted_text, None)
    """
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} does not exist.")
        return None, None

    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image {image_path}.")
        return None, None

    output_dir = "result"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    ocr_debug = os.getenv("OCR_DEBUG", "0") == "1"

    # Try adaptive threshold first, then grayscale fallback if little text (better for watermarked docs like CR)
    preprocessors = [("adaptive", _preprocess_for_ocr), ("grayscale", _preprocess_grayscale)]
    text = ""
    img_for_ocr = None
    pil_img = None
    try:
        for preproc_name, preproc_fn in preprocessors:
            img_for_ocr = preproc_fn(img)
            if img_for_ocr is None:
                continue
            pil_img = Image.fromarray(img_for_ocr)
            if ocr_debug:
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                preprocess_path = os.path.join(output_dir, f"{base_name}_preprocessed_{preproc_name}.jpg")
                cv2.imwrite(preprocess_path, img_for_ocr)
                print(f"[OCR_DEBUG] Saved preprocessed ({preproc_name}): {preprocess_path}")

            psm_configs = [("--oem 3 --psm 6", "6"), ("--oem 3 --psm 3", "3")]
            for config, psm_label in psm_configs:
                try:
                    t = pytesseract.image_to_string(pil_img, config=config)
                except Exception:
                    continue
                t = t or ""
                usable_len = sum(1 for c in t if c.isalnum() or c in " \n-")
                if ocr_debug:
                    print(f"[OCR_DEBUG] {preproc_name} PSM {psm_label} extracted {len(t)} chars, {usable_len} usable")
                if len(t.strip()) > len(text.strip()) or (len(text.strip()) < 50 and len(t.strip()) >= len(text.strip())):
                    text = t
                    if usable_len >= 100:
                        break
            if pil_img is not None and len(text.strip()) >= 100:
                break
    except pytesseract.TesseractNotFoundError:
        print("Error: Tesseract not found. Install it and add to PATH, or set TESSERACT_CMD in .env")
        return None, None
    except Exception as e:
        print(f"Error: OCR failed: {e}")
        return None, None

    if text is None:
        text = ""
    if ocr_debug and text:
        print(f"[OCR_DEBUG] Raw OCR preview: {text[:200]}...")

    if not save_results:
        return text, None

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    text_output_path = os.path.join(output_dir, f"{base_name}_ocr.txt")
    annotated_image_path = os.path.join(output_dir, f"{base_name}_boxes.jpg")

    with open(text_output_path, "w", encoding="utf-8") as f:
        f.write(text)

    try:
        boxes = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)
        annotated_img = img.copy()
        n_boxes = len(boxes.get("text", []))
        for i in range(n_boxes):
            try:
                conf = int(boxes["conf"][i]) if boxes["conf"][i] else 0
            except (ValueError, TypeError):
                conf = 0
            if conf > 0:
                x = int(boxes["left"][i])
                y = int(boxes["top"][i])
                w = int(boxes["width"][i])
                h = int(boxes["height"][i])
                cv2.rectangle(annotated_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
                label = (boxes.get("text") or [])[i]
                if label and str(label).strip():
                    cv2.putText(annotated_img, str(label), (x, max(0, y - 10)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        cv2.imwrite(annotated_image_path, annotated_img)
    except Exception as e:
        print(f"Warning: Could not create annotated image: {e}")

    return text_output_path, annotated_image_path

def compare_images(reference_image_path, uploaded_image_path, threshold, validate_func, show_results=True, save_results=True):
    """Compare uploaded image text against reference image text"""
    # Process reference image
    ref_text_path, _ = process_image(reference_image_path, save_results=save_results)
    if not ref_text_path:
        if show_results:
            print(f"Error: Failed to process reference image: {reference_image_path}")
        return False, 0.0

    # Process uploaded image 
    uploaded_text_path, _ = process_image(uploaded_image_path, save_results=save_results)
    if not uploaded_text_path:
        if show_results:
            print(f"Error: Failed to process uploaded image: {uploaded_image_path}")
        return False, 0.0

    # Read extracted text from both images
    if save_results:
        ref_text = get_text_from_file(ref_text_path)
        uploaded_text = get_text_from_file(uploaded_text_path)
    else:
        ref_text = ref_text_path  # When not saving, process_image returns text directly
        uploaded_text = uploaded_text_path

    # Compare texts using the provided validation function
    return validate_func(uploaded_text, ref_text, threshold)