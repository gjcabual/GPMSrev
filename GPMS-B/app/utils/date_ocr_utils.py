import re
from datetime import datetime

def extract_dates(text, doc_type="DL"):
    """Extract dates from OCR text based on document type"""
    # Date patterns per document type
    date_patterns = {
        'DL': [
            r'\d{4}/\d{2}/\d{2}',  # YYYY/MM/DD
            r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
        ],
        'OR': [
            r'\d{2}/\d{4}',  # MM/YYYY
        ],
        'CR': [
            r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
            r'\d{4}/\d{2}/\d{2}',  # YYYY/MM/DD
        ]
    }
    
    # Document-specific keywords
    keywords = {
        'DL': {
            'expiry': ['expir', 'valid until', 'valid to'],
            'birth': ['birth', 'born', 'dob']
        },
        'OR': {
            'expiry': ['valid', 'until']
        },
        'CR': {
            'date': ['issued', 'date issued', 'registration date']
        }
    }
    
    found_dates = {
        'expiration_date': None,
        'birth_date': None,
        'document_date': None,
        'other_dates': []
    }

    lines = text.lower().split('\n')
    
    # Special handling for CR documents
    if (doc_type == 'CR'):
        all_dates = []
        for line in lines:
            for pattern in date_patterns['CR']:
                matches = re.finditer(pattern, line)
                for match in matches:
                    date_str = match.group()
                    try:
                        # Convert to standard format if needed
                        date_obj = datetime.strptime(date_str, '%d/%m/%Y')
                        formatted_date = date_obj.strftime('%Y/%m/%d')
                        all_dates.append(formatted_date)
                    except ValueError:
                        try:
                            # Try alternative format
                            date_obj = datetime.strptime(date_str, '%Y/%m/%d')
                            all_dates.append(date_str)
                        except ValueError:
                            continue
        
        if all_dates:
            # Use first found date as document date for CR
            found_dates['document_date'] = all_dates[0]
            found_dates['expiration_date'] = all_dates[0]  # Use same date for validation
            found_dates['other_dates'] = all_dates[1:]
        
        # Only print CR-specific information
        print("\n------------------------------------------------")
        print(f"CR Document date: {found_dates['document_date'] or 'None'}")
        print("------------------------------------------------")
        return found_dates
    
    # For OR documents, look for "valid until" pattern specifically
    if doc_type == 'OR':
        for i in range(len(lines)-1):
            current_line = lines[i].strip()
            next_line = lines[i+1].strip()
            
            # Check for "valid" and "until" in consecutive words
            if 'valid' in current_line and 'until' in next_line:
                # Look for MM/YYYY pattern in next few lines
                for j in range(i+1, min(i+4, len(lines))):
                    for match in re.finditer(date_patterns['OR'][0], lines[j]):
                        date_str = match.group()
                        # Convert MM/YYYY to full date (assume end of month)
                        try:
                            month, year = map(int, date_str.split('/'))
                            if 1 <= month <= 12 and year >= 2000:
                                found_dates['expiration_date'] = f"{year}/{month:02d}/01"
                                
                                # Only print OR-specific information
                                print(f"Expiration date: {found_dates['expiration_date'] or 'None'}")
                                return found_dates
                        except ValueError:
                            continue
    
    # Process patterns and keywords for all document types
    patterns = date_patterns.get(doc_type, date_patterns['DL'])
    doc_keywords = keywords.get(doc_type, keywords['DL'])
    
    previous_line = ""
    for line in lines:
        current_line = line.strip()
        
        for pattern in patterns:
            matches = re.finditer(pattern, current_line)
            for match in matches:
                date_str = match.group()
                
                # For OR documents, check consecutive lines for validity keywords
                if doc_type == 'OR':
                    if any(keyword in previous_line for keyword in doc_keywords['expiry']):
                        found_dates['expiration_date'] = date_str
                # Check for expiration date keywords
                elif any(keyword in previous_line for keyword in doc_keywords['expiry']):
                    found_dates['expiration_date'] = date_str
                # Check for birth date keywords (if applicable to doc type)
                elif 'birth' in doc_keywords and any(keyword in previous_line for keyword in doc_keywords['birth']):
                    found_dates['birth_date'] = date_str
                elif date_str not in found_dates['other_dates']:
                    found_dates['other_dates'].append(date_str)
        
        previous_line = current_line

    # Second pass - classify remaining dates by value
    if not found_dates['expiration_date']:
        for date in found_dates['other_dates'][:]:
            try:
                date_obj = datetime.strptime(date, '%Y/%m/%d')
                
                # For OR, look for nearest future date
                if doc_type == 'OR':
                    if date_obj > datetime.now():
                        found_dates['expiration_date'] = date
                        found_dates['other_dates'].remove(date)
                        break
                # For DL, look for date more than 5 years in future
                elif not found_dates['expiration_date'] and date_obj.year > datetime.now().year + 5:
                    found_dates['expiration_date'] = date
                    found_dates['other_dates'].remove(date)
            except ValueError:
                continue

    # Document type-specific output
    print("\n------------------------------------------------")
    if doc_type == "DL":
        # Print DL-specific information
        print(f"Expiration date: {found_dates['expiration_date'] or 'None'}")
        print(f"Birth date: {found_dates['birth_date'] or 'None'}")
    elif doc_type == "OR":
        # Print OR-specific information
        print(f"Expiration date: {found_dates['expiration_date'] or 'None'}")
    elif doc_type == "CR":
        # Print CR-specific information
        print(f"CR Document date: {found_dates['document_date'] or 'None'}")
    print("------------------------------------------------")


    return found_dates