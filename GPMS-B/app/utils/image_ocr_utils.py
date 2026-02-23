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


def _preprocess_for_ocr(img):
    """Improve image for OCR: resize if too small, grayscale, light denoise."""
    if img is None or img.size == 0:
        return None
    # Resize if too small (Tesseract works better with ~300 DPI equivalent)
    min_side = 800
    h, w = img.shape[:2]
    if max(h, w) < min_side:
        scale = min_side / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    # Grayscale often improves OCR on documents
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
    # Light denoise while keeping edges (helps photos of documents)
    denoised = cv2.bilateralFilter(gray, 5, 50, 50)
    return denoised


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

    # Preprocess for better OCR on document photos
    img_for_ocr = _preprocess_for_ocr(img)
    if img_for_ocr is None:
        return None, None

    pil_img = Image.fromarray(img_for_ocr)

    # PSM 6 = uniform block of text (good for forms/documents); PSM 3 = fully auto
    # OEM 3 = default LSTM engine
    tesseract_config = "--oem 3 --psm 6"

    try:
        text = pytesseract.image_to_string(pil_img, config=tesseract_config)
    except pytesseract.TesseractNotFoundError:
        print("Error: Tesseract not found. Install it and add to PATH, or set TESSERACT_CMD in .env")
        return None, None
    except Exception as e:
        print(f"Error: OCR failed: {e}")
        return None, None

    if text is None:
        text = ""

    if not save_results:
        return text, None

    output_dir = "result"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

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