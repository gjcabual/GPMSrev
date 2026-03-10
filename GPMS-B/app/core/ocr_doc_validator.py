"""
Document validation using pytesseract OCR (OR/CR/DL).

Requirements: Tesseract binary installed; pytesseract package.
"""

import re
from app.utils.document_ocr_utils import document_type, compare_credentials

def validate_document(reference_image_path, uploaded_image_path, text_array, doc_type="DL", show_results=True, save_results=True):
    """
    Validate document with type-specific validation rules
    """
    result = compare_credentials(
        reference_image_path, 
        uploaded_image_path,
        text_array,
        show_results=show_results,
        save_results=save_results,
        doc_type=doc_type 
    )
    
    # Document-specific validation checks
    if doc_type == "DL":
        # Additional driver's license specific checks
        sex_valid = any(gender in result['extracted_text'].lower() 
                       for gender in ['m', 'male', 'f', 'female'])
        result['sex_valid'] = sex_valid
        
    elif doc_type == "CR":
        # Additional CR specific checks
        plate_valid = bool(re.match(r'^[A-Z0-9-]+$', result['extracted_text'].upper()))
        result['plate_valid'] = plate_valid
        
        # For CR, automatically set date_valid to True since expiration doesn't apply
        result['date_valid'] = True
        result['date_message'] = "Valid - CR documents do not expire"
    
    return result
