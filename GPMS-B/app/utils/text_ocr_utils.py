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
    """Compare text values based on document type"""
    uploaded_text = uploaded_text.lower()
    
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

    # Split multi-part names into individual components
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
            'DL': ['First Name', 'Last Name', 'Birth Date'],  # Removed Sex
            'OR': ['Plate Number'],
            'CR': ['Plate Number']
        }

        for field in field_descriptions.get(doc_type, []):
            print(f"- {field}")
        
        print("\n=[ Individual field comparisons: ]=")
    
    # Process each field or field-part
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

def extract_document_reference(text: str, doc_type: str) -> dict:
    """
    Extract document file numbers in formats:
    - ####-########### (with hyphen)
    - ############### (without hyphen)
    - Numbers split across lines or mixed with text
    """
    import re
    
    result = {
        "file_number": None,
        "is_valid": False,
        "error": None
    }

    # Look for complete patterns first
    primary_patterns = [
        r'\b(\d{4}-\d{11})\b',     # With hyphen
        r'\b(\d{15})\b',           # Without hyphen
    ]
    
    try:
        file_number = None
        
        # Try complete patterns first
        for pattern in primary_patterns:
            matches = re.findall(pattern, text)
            if matches:
                file_number = matches[0]
                break
        
        # If no complete match found and it's a CR document
        if not file_number and doc_type == "CR":
            # Look for a pattern specific to CR documents
            # Find a 3-digit number followed by a 12-digit number
            lines = text.split('\n')
            numbers_by_line = []
            
            # Extract all numbers from each line
            for line in lines:
                line_numbers = re.findall(r'\d+', line)
                if line_numbers:
                    numbers_by_line.append(line_numbers)
            
            # Special case for CR: look for "150" followed by "125003567970"
            three_digit = None
            twelve_digit = None
            
            for numbers in numbers_by_line:
                for num in numbers:
                    if len(num) == 3 and num.isdigit():
                        three_digit = num
                    elif len(num) == 12 and num.isdigit():
                        twelve_digit = num
            
            # If we found both parts, combine them
            if three_digit and twelve_digit:
                file_number = three_digit + twelve_digit
                print(f"Combined CR file number: {file_number}")
        
        # If still not found, try a more aggressive approach
        if not file_number:
            # Extract all number sequences from the text
            all_numbers = re.findall(r'\d+', text)
            
            # Print found numbers for debugging
            print(f"All numbers found: {all_numbers}")
            
            # Look for a 12-digit number
            for num in all_numbers:
                if len(num) == 12:
                    # Look for a 3-digit number to combine with it
                    for prefix in all_numbers:
                        if len(prefix) == 3:
                            combined = prefix + num
                            if len(combined) == 15:
                                file_number = combined
                                print(f"Found by combining {prefix} + {num} = {combined}")
                                break
                    if file_number:
                        break
        
        if not file_number:
            result["error"] = f"No valid {doc_type} file number found"
            return result
        
        # Normalize format (remove any spaces or hyphens)
        file_number = file_number.replace(' ', '').replace('-', '')
        
        # Store 15-digit number
        result["file_number"] = file_number
        result["is_valid"] = True
        
    except Exception as e:
        result["error"] = f"Error processing {doc_type} file number: {str(e)}"
        print(f"Exception in extract_document_reference: {str(e)}")
    
    return result