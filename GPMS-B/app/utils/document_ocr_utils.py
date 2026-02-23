from app.utils.image_ocr_utils import process_image, compare_images
from app.utils.text_ocr_utils import validate_credentials, compare_text_array, extract_document_reference
from app.utils.common_utils import get_text_from_file
from app.utils.date_ocr_utils import extract_dates
from datetime import datetime

def extract_document_data(uploaded_image_path, doc_type):
    """
    Run OCR on the uploaded image only (no reference) and return file_number and dates.
    Use when reference files are missing or for extract-only flow.
    Returns dict with keys: file_number (OR/CR), dates (expiration_date, etc.) - same shape as compare_credentials result.
    """
    result = {
        "file_number": None,
        "dates": {"expiration_date": None, "birth_date": None, "other_dates": []},
    }
    try:
        text_or_path, _ = process_image(uploaded_image_path, save_results=False)
        uploaded_text = (text_or_path or "") if text_or_path is not None else ""
        if not uploaded_text or not uploaded_text.strip():
            return result
        if doc_type in ("OR", "CR"):
            ref_result = extract_document_reference(uploaded_text, doc_type)
            if ref_result.get("is_valid"):
                result["file_number"] = ref_result.get("file_number")
        dates = extract_dates(uploaded_text, doc_type)
        result["dates"] = dates
    except Exception as e:
        print(f"extract_document_data failed: {e}")
    return result


def document_type(doc_type):
    """
    Document type for the OCR processor. Return reference text based on document type.
    """
    import os
    
    # Normalize the document type (remove spaces and convert to uppercase)
    doc_type = doc_type.strip().upper()
    
    # Get base directory path
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Define reference paths
    reference_paths = {
        "OR": os.path.join(base_path, "data_samples", "Testing/references/or_reference.jpg"),
        "DL": os.path.join(base_path, "data_samples", "Testing/references/dl_reference.jpg"),
        "CR": os.path.join(base_path, "data_samples", "Testing/references/cr_reference.png")
    }
    
    # Check if document type is valid
    if doc_type not in reference_paths:
        return None
        
    reference_path = reference_paths[doc_type]
    
    # Validate if reference file exists
    if not os.path.exists(reference_path):
        print(f"Warning: Reference file not found at {reference_path}")
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
    """Compare credentials between reference and uploaded images"""
    # Initialize default result structure
    result = {
        'is_valid': False,
        'image_valid': False,
        'text_valid': False,
        'date_valid': False,
        'date_message': "Not processed",
        'image_similarity': 0.0,
        'text_similarity': 0.0,
        'extracted_text': '',
        'dates': {
            'expiration_date': None,
            'birth_date': None,
            'other_dates': []
        },
        'file_number': None  # Changed from reference_number to file_number
    }

    try:
        # Process uploaded image first to get text
        uploaded_text_path, _ = process_image(uploaded_image_path, save_results=save_results)
        if save_results:
            uploaded_text = get_text_from_file(uploaded_text_path) if uploaded_text_path else ""
        else:
            uploaded_text = (uploaded_text_path or "") if uploaded_text_path is not None else ""

        # Extract file number first for OR and CR
        if doc_type in ["OR", "CR"]:
            ref_result = extract_document_reference(uploaded_text, doc_type)
            
            if ref_result["is_valid"]:
                result["file_number"] = ref_result["file_number"]
                if show_results:
                    print(f"\n=[ Document File Number ]=")
                    print(f"Type: {doc_type}")
                    print(f"Number: {ref_result['file_number']}")
            else:
                if show_results:
                    print(f"\nWarning: {ref_result['error']}")

        # Image comparison
        is_image_valid, image_similarity = compare_images(
            reference_image_path, 
            uploaded_image_path, 
            threshold=0.7,
            validate_func=validate_credentials,
            show_results=show_results,
            save_results=save_results
        )
        
        if show_results:
            print(f"\n=[ Image Comparison Results ]=")
            percentage = image_similarity * 100  
            print(f"Similarity: {image_similarity:.1f}")
            print(f"Accuracy: {percentage:.1f}%")
            print(f"Passes threshold: {'Yes' if is_image_valid else 'No'}")

        # For OR/CR: validate only by extracted file number (OR file no. / MV file no.), not plate (plate may be temporary)
        if doc_type in ["OR", "CR"]:
            is_text_valid = bool(result.get("file_number"))
            text_similarity = 1.0 if is_text_valid else 0.0
            if show_results:
                print(f"\n=[ OR/CR File Number Validation ]=")
                print(f"Type: {doc_type} – validated by file number only (plate not matched)")
                print(f"Valid: {'Yes' if is_text_valid else 'No'}")
        else:
            # DL: match applicant details (name, birth date) from step 1
            is_text_valid, text_similarity = compare_text_array(
                text_array, 
                uploaded_text, 
                threshold=0.85,
                doc_type=doc_type,
                show_results=show_results
            )

        # Date extraction and validation
        dates = extract_dates(uploaded_text, doc_type)
        is_date_valid, date_message = check_expiration(dates['expiration_date'], doc_type)

        # For CR documents, we need to update overall validation differently
        if doc_type == "CR":
            # Only use image and text validation for CR documents (ignore date validation)
            overall_valid = is_image_valid and is_text_valid
        else:
            # For other documents, include date validation
            overall_valid = is_image_valid and is_text_valid and is_date_valid

        # Update result with all values
        result.update({
            'is_valid': overall_valid, 
            'image_valid': is_image_valid,
            'text_valid': is_text_valid,
            'date_valid': is_date_valid,
            'date_message': date_message,
            'image_similarity': image_similarity,
            'text_similarity': text_similarity,
            'extracted_text': uploaded_text,
            'dates': dates
        })

    except Exception as e:
        print(f"Error in compare_credentials: {str(e)}")
        
    return result

def process_image_with_validation(image_path, reference_text, show_results=True):
    """
    Process an image using OCR and validate the extracted text against reference credentials.

    Args:
        image_path (str): Path to the image file.
        reference_text (str): Reference credentials for validation.
        show_results (bool): Whether to show validation results.

    Returns:
        dict: Validation results containing boolean flags and scores
    """
    text_output_path, annotated_image_path = process_image(image_path)
    
    if not text_output_path:
        return {
            'is_valid': False,
            'text_valid': False,
            'date_valid': False,
            'text_similarity': 0.0,
            'date_message': "Failed to process image",
            'text_output_path': None,
            'annotated_image_path': None
        }
    
    # Read the extracted text
    extracted_text = get_text_from_file(text_output_path)
    
    # Validate credentials
    is_text_valid, text_similarity = validate_credentials(extracted_text, reference_text, threshold=0.85)
    
    # Extract and validate dates
    dates = extract_dates(extracted_text)
    is_date_valid, date_message = check_expiration(dates['expiration_date'])

    if show_results:
        print("\n=== Document Validation Results ===")
        print(f"Text validation: {'Passed' if is_text_valid else 'Failed'}")
        print(f"Text similarity: {text_similarity:.2f}")
        print(f"Date validation: {'Passed' if is_date_valid else 'Failed'}")
        print(f"Date status: {date_message}")
        print("==============================\n")

    return {
        'is_valid': is_text_valid and is_date_valid,
        'text_valid': is_text_valid,
        'date_valid': is_date_valid,
        'text_similarity': text_similarity,
        'date_message': date_message,
        'dates': dates,
        'text_output_path': text_output_path,
        'annotated_image_path': annotated_image_path
    }