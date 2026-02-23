"""
OCR Processor Script

This script processes images using OCR to extract text and visualize detection
with bounding boxes. The results are saved as text files and annotated images.

Requirements:
- Python 3.6+
- pytesseract
- Pillow (PIL)
- opencv-python

Usage:
    python ocr_processor.py <image_path>
"""

import sys
import os
import argparse
import cv2
import numpy as np
import re  

from app.utils.image_ocr_utils import process_image
from app.utils.document_ocr_utils import document_type, compare_credentials
from app.utils.date_ocr_utils import extract_dates

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

def main():
    show_results = True  
    save_results = True  
    
    # Document information to validate
    text_array = [
        "CHAVIT,",
        "HARROLD",
        "TIU",
        "KO1-19-002724",
        "Black",
    ]

    # # Get document paths
    reference_image_path = document_type("DL")
    uploaded_image_path = "DL_Data/dl_captured_normal.png"

    # Validate document with save option
    result = validate_document(
        reference_image_path,
        uploaded_image_path,
        text_array,
        show_results=show_results,
        save_results=save_results
    )

    # Check validation statuses
    print("\nValidation Status:")
    print(f"Document: {'✓' if result['image_valid'] else '✗'}")
    print(f"Information: {'✓' if result['text_valid'] else '✗'}")
    print(f"Expiration: {'✓' if result['date_valid'] else '✗'}")
    print("\n")

if __name__ == "__main__":
    main()