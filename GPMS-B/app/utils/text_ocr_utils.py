from difflib import SequenceMatcher
from app.utils.common_utils import get_text_from_file
import re


def validate_credentials(extracted_text, reference_text, threshold):
    """
    Validate how much of the reference text appears in the extracted text
    """
    # Normalize texts
    extracted_text = extracted_text.lower()
    reference_text = reference_text.lower()
    
    # Split into words and remove short words
    ref_words = set(word for word in reference_text.split() if len(word) > 2)
    extracted_words = set(word for word in extracted_text.split() if len(word) > 2)
    
    if not ref_words:
        return False, 0.0
    
    # Calculate matches based on threshold
    matches = 0
    total_words = len(ref_words)
    
    for ref_word in ref_words:
        for ext_word in extracted_words:
            similarity = SequenceMatcher(None, ref_word, ext_word).ratio()
            if similarity >= threshold:  # Use threshold here for word matching
                matches += 1
                break
    
    similarity_score = matches / total_words

    # print(f"Validate score: {similarity_score}")

    return similarity_score >= threshold, similarity_score

def compare_text_array(text_array, uploaded_text, threshold, doc_type="DL", show_results=True):
    """
    Compare expected values against OCR text.
    - OR/CR: not used; validation is by extracted file number (OR file no. / MV file no.) only, not plate.
    - DL: text_array is applicant details from step 1 [first_name, last_name, birth_date]; we check these appear on the DL.
    """
    uploaded_text = uploaded_text.lower()

    # OR/CR are validated by file number only in compare_credentials; empty text_array is valid
    if doc_type in ("OR", "CR") and not text_array:
        return True, 1.0

    # Define field-specific validation rules
    validation_rules = {
        'sex': lambda text: (
            # Handle PREFER NOT TO SAY case
            text.upper() == "PREFER NOT TO SAY" or
            # More flexible gender matching
            any(
                gender.lower() in uploaded_text.lower() 
                for gender in ['m', 'male', 'M', 'Male', 'MALE', 
                             'f', 'female', 'F', 'Female', 'FEMALE']
            )
        ),
        'vehicle_type': lambda text: len(text) > 2,
        'plate_no': lambda text: bool(re.match(r'^[A-Z0-9-]+$', text.upper())),
    }

    # Split multi-part names into individual components (for DL only)
    expanded_text_array = []
    for text in text_array:
        text_str = str(text).lower()
        if ' ' in text_str:
            # For multi-word values, add individual parts
            parts = text_str.split()
            expanded_text_array.extend(parts)
        else:
            # Keep single-word values as-is
            expanded_text_array.append(text_str)

    total_similarity = 0
    matches = 0
    
    if show_results:
        print(f"\n=[ Text Comparison Results for {doc_type} ]=")
        print(f"Required fields for {doc_type}:")
        
        # Print expected fields based on document type
        field_descriptions = {
            'DL': ['First Name', 'Last Name', 'Birth Date'],
            'OR': ['File number only (plate not matched)'],
            'CR': ['MV file number only (plate not matched)'],
        }

        for field in field_descriptions.get(doc_type, []):
            print(f"- {field}")
        
        print("\n=[ Individual field comparisons: ]=")
    
    # Process each field or field-part (DL only; OR/CR handled above)
    index = 0
    for text in expanded_text_array:
        best_similarity = 0

        # Apply special validation rules for specific fields
        if text in validation_rules:
            is_valid = validation_rules[text](uploaded_text)
            best_similarity = 1.0 if is_valid else 0.0
        else:
            # Standard text comparison
            for extracted_word in uploaded_text.split():
                similarity = SequenceMatcher(None, text, extracted_word).ratio()
                if similarity > best_similarity:
                    best_similarity = similarity
        
        if show_results:
            print(f"'{text}' match score: {best_similarity:.2f}")
        
        # Only calculate total similarity for original number of fields
        if index < len(text_array):
            total_similarity += best_similarity
            if best_similarity >= threshold:
                matches += 1
        index += 1

    # Calculate overall similarity based on original text_array length
    overall_similarity = total_similarity / len(text_array) if text_array else 0
    
    if show_results:
        print(f"\nOverall {doc_type} similarity: {overall_similarity:.2f}")
        print(f"Validation {'Passed' if overall_similarity >= threshold else 'Failed'}")
    
    return overall_similarity >= threshold, overall_similarity

def _normalize_file_number(raw: str) -> str:
    """Normalize file number: digits only, remove spaces/hyphens/OCR substitutions (O->0, l->1)."""
    s = raw.replace(' ', '').replace('-', '').replace('—', '').replace('–', '')
    s = s.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1')
    return ''.join(c for c in s if c.isdigit())


def extract_document_reference(text: str, doc_type: str) -> dict:
    """
    Extract document file numbers in formats:
    - ####-########### (with hyphen)
    - #### ########### (space instead of hyphen)
    - ############### (without hyphen)
    - Numbers split across lines or mixed with text
    - 4-digit + 11-digit or 3-digit + 12-digit adjacent in text
    """
    result = {
        "file_number": None,
        "is_valid": False,
        "error": None
    }

    primary_patterns = [
        r'\b(\d{4}[-—–\s]\d{11})\b',  # Hyphen, em-dash, en-dash, or space
        r'\b(\d{4}-\d{11})\b',
        r'\b(\d{4}\s+\d{11})\b',
        r'\b(\d{15})\b',
    ]

    try:
        file_number = None

        for pattern in primary_patterns:
            matches = re.findall(pattern, text)
            if matches:
                file_number = _normalize_file_number(matches[0])
                if len(file_number) == 15 and file_number.isdigit():
                    break

        # Fallback: find 4-digit + 11-digit or 3-digit + 12-digit adjacent
        if not file_number or len(file_number) != 15:
            all_numbers = re.findall(r'\d+', text)
            normalized = [_normalize_file_number(n) for n in all_numbers]

            for i, num in enumerate(normalized):
                if len(num) == 11:
                    for j, pre in enumerate(normalized):
                        if i != j and len(pre) == 4 and (pre + num).isdigit():
                            file_number = pre + num
                            break
                elif len(num) == 12:
                    for j, pre in enumerate(normalized):
                        if i != j and len(pre) == 3 and (pre + num).isdigit():
                            file_number = pre + num
                            break
                if file_number and len(file_number) == 15:
                    break

        if not file_number or len(file_number) != 15 or not file_number.isdigit():
            result["error"] = f"No valid {doc_type} file number found"
            return result

        result["file_number"] = file_number
        result["is_valid"] = True

    except Exception as e:
        result["error"] = f"Error processing {doc_type} file number: {str(e)}"
        print(f"Exception in extract_document_reference: {str(e)}")

    return result