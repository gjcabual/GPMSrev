"""
LTO Document Extractor
Supports: CR Layout A (old yellow), CR Layout B (2020 white), OR, Driver's License
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pytesseract import Output
import re
import json


# ─────────────────────────────────────────────────────────────────────
# 1. PREPROCESSING
# ─────────────────────────────────────────────────────────────────────
def preprocess(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    h, w = img.shape[:2]
    if w < 1200:
        scale = 1800 / w
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=12)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    pil_img = Image.fromarray(thresh)

    # Get full string for type detection
    full_text = pytesseract.image_to_string(pil_img, config='--psm 6')

    # Get word-level data for value extraction
    data = pytesseract.image_to_data(pil_img, output_type=Output.DICT, config='--psm 6')

    words = []
    for i in range(len(data['text'])):
        txt = data['text'][i].strip()
        conf = int(data['conf'][i])
        if txt and conf > 25:
            words.append({
                'text': txt,
                'left':   data['left'][i],
                'top':    data['top'][i],
                'width':  data['width'][i],
                'height': data['height'][i],
                'right':  data['left'][i] + data['width'][i],
                'bottom': data['top'][i] + data['height'][i],
                'conf':   conf,
            })

    return full_text, words


# ─────────────────────────────────────────────────────────────────────
# 2. DOCUMENT TYPE DETECTION  (uses full OCR string)
# ─────────────────────────────────────────────────────────────────────
def detect_doc_type(full_text):
    t = full_text.upper()

    if "DRIVER" in t and "LICENSE" in t:
        return "DRIVERS_LICENSE"

    if "OFFICIAL RECEIPT" in t or ("OFFICIAL" in t and "RECEIPT" in t):
        return "OR"

    if ("CERTIFICATE" in t and "REGISTRATION" in t) or "CERTIFICATE OF REGISTRATION" in t:
        # Layout B clues
        if any(k in t for k in ["REVISED DECEMBER 2020", "DECEMBER 2020", "VIN", "MAKE/BRAND",
                                  "PASSENGER CAPACITY", "YEAR REBUILT", "MAX POWER"]):
            return "CR_B"
        return "CR_A"

    return "UNKNOWN"


# ─────────────────────────────────────────────────────────────────────
# 3. ANCHOR HELPERS
# ─────────────────────────────────────────────────────────────────────
def find_anchor(words, *keywords):
    """Find a sequence of keywords in the word list and return bounding rect."""
    kws = [k.upper() for k in keywords]

    for i, w in enumerate(words):
        if w['text'].upper() == kws[0]:
            if len(kws) == 1:
                return w
            matched = [w]
            j = i + 1
            ki = 1
            # Allow up to 4 words gap between keyword tokens
            attempts = 0
            while j < len(words) and ki < len(kws) and attempts < 8:
                if words[j]['text'].upper() == kws[ki]:
                    matched.append(words[j])
                    ki += 1
                attempts += 1
                j += 1
            if ki == len(kws):
                return {
                    'text':   ' '.join(m['text'] for m in matched),
                    'left':   matched[0]['left'],
                    'top':    min(m['top'] for m in matched),
                    'right':  matched[-1]['right'],
                    'bottom': max(m['bottom'] for m in matched),
                    'width':  matched[-1]['right'] - matched[0]['left'],
                    'height': max(m['bottom'] for m in matched) - min(m['top'] for m in matched),
                }
    return None


def find_anchor_fuzzy(words, *keywords):
    """Case-insensitive partial match — useful for noisy OCR."""
    kws = [k.upper() for k in keywords]
    for i, w in enumerate(words):
        if kws[0] in w['text'].upper():
            if len(kws) == 1:
                return w
            # Try to find rest nearby
            matched = [w]
            ki = 1
            for j in range(i + 1, min(i + 10, len(words))):
                if kws[ki] in words[j]['text'].upper():
                    matched.append(words[j])
                    ki += 1
                    if ki == len(kws):
                        break
            if ki == len(kws):
                return {
                    'text':   ' '.join(m['text'] for m in matched),
                    'left':   matched[0]['left'],
                    'top':    min(m['top'] for m in matched),
                    'right':  matched[-1]['right'],
                    'bottom': max(m['bottom'] for m in matched),
                    'width':  matched[-1]['right'] - matched[0]['left'],
                    'height': max(m['bottom'] for m in matched) - min(m['top'] for m in matched),
                }
    return None


def value_right(words, anchor, row_tol=22, max_gap=700):
    """Words to the RIGHT of anchor on the same line."""
    if not anchor:
        return ""
    cy = anchor['top'] + anchor.get('height', 20) // 2
    cands = [
        w for w in words
        if w['left'] > anchor['right']
        and abs((w['top'] + w['height'] // 2) - cy) < row_tol
        and (w['left'] - anchor['right']) < max_gap
    ]
    cands.sort(key=lambda x: x['left'])
    return ' '.join(c['text'] for c in cands)


def value_below(words, anchor, col_tol=150, line_h=40, max_lines=2):
    """Words BELOW anchor within column range."""
    if not anchor:
        return ""
    lines = []
    for ln in range(1, max_lines + 1):
        row = [
            w for w in words
            if w['top'] > anchor['bottom'] - 5
            and w['top'] < anchor['bottom'] + ln * line_h
            and w['left'] >= anchor['left'] - col_tol
            and w['right'] <= anchor.get('right', anchor['left'] + 500) + col_tol
        ]
        row.sort(key=lambda x: x['left'])
        txt = ' '.join(w['text'] for w in row).strip()
        if txt:
            lines.append(txt)
    return ' '.join(lines)


def clean(text):
    """Strip noise characters."""
    text = re.sub(r'[|\\<>{}\[\]~`^*_]{2,}', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ─────────────────────────────────────────────────────────────────────
# 4a. CR LAYOUT A EXTRACTOR
# ─────────────────────────────────────────────────────────────────────
def extract_cr_a(words):
    r = {}

    # CR No. — look for "No" near top third, get value to right
    a = find_anchor(words, "No")
    if a and a['top'] < 500:
        r['cr_no'] = clean(value_right(words, a, row_tol=30))

    # DATE
    a = find_anchor_fuzzy(words, "DATE")
    if a and a['top'] < 500:
        r['date'] = clean(value_right(words, a, row_tol=25))

    # MV FILE NO
    a = find_anchor(words, "MV", "FILE", "NO.") or find_anchor_fuzzy(words, "MV", "FILE")
    if a: r['mv_file_no'] = clean(value_below(words, a))

    # PLATE NO
    a = find_anchor(words, "PLATE", "NO.")
    if a: r['plate_no'] = clean(value_below(words, a))

    # ENGINE NO
    a = find_anchor(words, "ENGINE", "NO.")
    if a: r['engine_no'] = clean(value_below(words, a))

    # CHASSIS NO
    a = find_anchor(words, "CHASSIS", "NO.")
    if a: r['chassis_no'] = clean(value_below(words, a))

    # DENOMINATION
    a = find_anchor(words, "DENOMINATION")
    if a: r['denomination'] = clean(value_below(words, a))

    # MAKE — careful: "MAKE" may appear inside YEAR MODEL row
    for w in words:
        if w['text'].upper() == "MAKE":
            r['make'] = clean(value_below(words, w))
            break

    # SERIES
    a = find_anchor(words, "SERIES")
    if a: r['series'] = clean(value_below(words, a))

    # BODY TYPE
    a = find_anchor(words, "BODY", "TYPE")
    if a: r['body_type'] = clean(value_below(words, a))

    # YEAR MODEL
    a = find_anchor(words, "YEAR", "MODEL")
    if a: r['year_model'] = clean(value_below(words, a))

    # FUEL
    a = find_anchor(words, "FUEL")
    if a: r['fuel'] = clean(value_below(words, a))

    # GROSS WT / NET WT / SHIPPING WT
    a = find_anchor(words, "GROSS", "WT.")
    if a: r['gross_wt'] = clean(value_below(words, a))

    a = find_anchor(words, "NET", "WT.")
    if a: r['net_wt'] = clean(value_below(words, a))

    # COMPLETE OWNER'S NAME
    a = (find_anchor(words, "COMPLETE", "OWNERS", "NAME")
         or find_anchor(words, "OWNERS", "NAME")
         or find_anchor_fuzzy(words, "OWNERS", "NAME"))
    if a: r['owner_name'] = clean(value_below(words, a, col_tol=400))

    # TELEPHONE
    a = find_anchor(words, "TELEPHONE", "NO/CONTACT") or find_anchor_fuzzy(words, "TELEPHONE")
    if a: r['telephone'] = clean(value_below(words, a, col_tol=300))

    # COMPLETE ADDRESS
    a = (find_anchor(words, "COMPLETE", "ADDRESS")
         or find_anchor_fuzzy(words, "COMPLETE", "DRESS"))
    if a: r['address'] = clean(value_below(words, a, col_tol=400, max_lines=3))

    # ENCUMBERED TO
    a = find_anchor(words, "ENCUMBERED", "TO")
    if a: r['encumbered_to'] = clean(value_below(words, a, col_tol=400))

    # OR No.
    a = find_anchor(words, "OR", "No.") or find_anchor_fuzzy(words, "OR", "No")
    if a: r['or_no'] = clean(value_below(words, a))

    # O.R DATE
    a = find_anchor(words, "O.R", "DATE") or find_anchor_fuzzy(words, "O.R", "DATE")
    if a: r['or_date'] = clean(value_below(words, a))

    return r


# ─────────────────────────────────────────────────────────────────────
# 4b. CR LAYOUT B EXTRACTOR
# ─────────────────────────────────────────────────────────────────────
def extract_cr_b(words):
    r = {}

    # Field Office / Office Code / Date
    a = find_anchor(words, "Field", "Office") or find_anchor_fuzzy(words, "Field")
    if a: r['field_office'] = clean(value_right(words, a, row_tol=20))

    a = find_anchor_fuzzy(words, "Date")
    if a and a['top'] < 600: r['date'] = clean(value_right(words, a, row_tol=20))

    # CR No (at bottom of Layout B doc)
    a = find_anchor(words, "CR", "No.")
    if a: r['cr_no'] = clean(value_right(words, a, row_tol=25))

    # Plate No
    a = find_anchor(words, "PLATE", "NO.")
    if a: r['plate_no'] = clean(value_below(words, a))

    # Engine No
    a = find_anchor(words, "ENGINE", "NO.")
    if a: r['engine_no'] = clean(value_below(words, a))

    # Chassis No
    a = find_anchor(words, "CHASSIS", "NO.")
    if a: r['chassis_no'] = clean(value_below(words, a))

    # VIN
    a = find_anchor(words, "VIN")
    if a: r['vin'] = clean(value_below(words, a))

    # File No
    a = find_anchor(words, "FILE", "NO.")
    if a: r['file_no'] = clean(value_below(words, a))

    # Vehicle Type
    a = find_anchor(words, "VEHICLE", "TYPE")
    if a: r['vehicle_type'] = clean(value_below(words, a))

    # Vehicle Category
    a = find_anchor(words, "VEHICLE", "CATEGORY")
    if a: r['vehicle_category'] = clean(value_below(words, a))

    # Make/Brand
    a = find_anchor_fuzzy(words, "MAKE/BRAND") or find_anchor(words, "MAKE")
    if a: r['make_brand'] = clean(value_below(words, a))

    # Passenger Capacity
    a = find_anchor(words, "PASSENGER", "CAPACITY")
    if a: r['passenger_capacity'] = clean(value_below(words, a))

    # Color
    a = find_anchor(words, "COLOR")
    if a: r['color'] = clean(value_below(words, a))

    # Type of Fuel
    a = find_anchor(words, "TYPE", "OF", "FUEL") or find_anchor_fuzzy(words, "FUEL")
    if a: r['fuel'] = clean(value_below(words, a))

    # Classification
    a = find_anchor(words, "CLASSIFICATION")
    if a: r['classification'] = clean(value_below(words, a))

    # Body Type
    a = find_anchor(words, "BODY", "TYPE")
    if a: r['body_type'] = clean(value_below(words, a))

    # Series
    a = find_anchor(words, "SERIES")
    if a: r['series'] = clean(value_below(words, a))

    # Gross Weight
    a = find_anchor(words, "GROSS", "WEIGHT")
    if a: r['gross_weight'] = clean(value_below(words, a))

    # Net Weight
    a = find_anchor(words, "NET", "WEIGHT")
    if a: r['net_weight'] = clean(value_below(words, a))

    # Year Model
    a = find_anchor(words, "YEAR", "MODEL")
    if a: r['year_model'] = clean(value_below(words, a))

    # Year Rebuilt
    a = find_anchor(words, "YEAR", "REBUILT")
    if a: r['year_rebuilt'] = clean(value_below(words, a))

    # Piston Displacement
    a = find_anchor(words, "PISTON", "DISPLACEMENT")
    if a: r['piston_displacement'] = clean(value_below(words, a))

    # Max Power
    a = find_anchor(words, "MAX", "POWER")
    if a: r['max_power_kw'] = clean(value_below(words, a))

    # Owner's Name
    a = (find_anchor(words, "OWNER'S", "NAME")
         or find_anchor(words, "OWNERS", "NAME")
         or find_anchor_fuzzy(words, "OWNER"))
    if a: r['owner_name'] = clean(value_below(words, a, col_tol=500))

    # Owner's Address
    a = (find_anchor(words, "OWNER'S", "ADDRESS")
         or find_anchor_fuzzy(words, "OWNER", "ADDRESS"))
    if a: r['address'] = clean(value_below(words, a, col_tol=500, max_lines=3))

    # Encumbered To
    a = find_anchor(words, "ENCUMBERED", "TO")
    if a: r['encumbered_to'] = clean(value_below(words, a, col_tol=500))

    # OR No
    a = (find_anchor(words, "O.R.", "NO.")
         or find_anchor(words, "O.R", "NO")
         or find_anchor_fuzzy(words, "O.R"))
    if a: r['or_no'] = clean(value_below(words, a))

    # OR Date
    a = find_anchor(words, "O.R.", "DATE") or find_anchor_fuzzy(words, "O.R", "DATE")
    if a: r['or_date'] = clean(value_below(words, a))

    # Amount
    a = find_anchor(words, "AMOUNT")
    if a: r['amount'] = clean(value_below(words, a))

    # Remarks
    a = find_anchor(words, "REMARKS")
    if a: r['remarks'] = clean(value_below(words, a, col_tol=500))

    return r


# ─────────────────────────────────────────────────────────────────────
# 4c. OFFICIAL RECEIPT EXTRACTOR
# ─────────────────────────────────────────────────────────────────────
def extract_or(words):
    r = {}

    # OR No — right of "OFFICIAL RECEIPT" box
    a = find_anchor(words, "OFFICIAL", "RECEIPT")
    if a: r['or_no'] = clean(value_right(words, a, row_tol=20))

    # Field Office
    a = find_anchor(words, "Field", "Office:") or find_anchor(words, "Field", "Office")
    if a: r['field_office'] = clean(value_right(words, a, row_tol=18))

    # Office Code
    a = find_anchor(words, "Office", "Code:") or find_anchor(words, "Office", "Code")
    if a: r['office_code'] = clean(value_right(words, a, row_tol=18))

    # TIN (office)
    a = find_anchor(words, "TIN:")
    if a: r['tin'] = clean(value_right(words, a, row_tol=18))

    # Date
    a = find_anchor(words, "Date:")
    if a: r['date'] = clean(value_right(words, a, row_tol=18))

    # Received From (owner name)
    a = find_anchor(words, "RECEIVED", "FROM") or find_anchor_fuzzy(words, "RECEIVED")
    if a: r['owner_name'] = clean(value_below(words, a, col_tol=500, line_h=50))

    # Address
    a = find_anchor(words, "ADDRESS")
    if a: r['address'] = clean(value_below(words, a, col_tol=500, max_lines=2, line_h=50))

    # TIN (owner)
    a = find_anchor(words, "TIN", "(Tax")
    if a: r['owner_tin'] = clean(value_right(words, a, row_tol=18))

    # LTO Client ID
    a = find_anchor(words, "LTO", "Client", "ID")
    if a: r['lto_client_id'] = clean(value_right(words, a, row_tol=18))

    # Transaction No
    a = find_anchor(words, "Transaction", "No:")
    if a: r['transaction_no'] = clean(value_right(words, a, row_tol=18))

    # Plate No
    a = find_anchor(words, "Plate", "No:") or find_anchor_fuzzy(words, "Plate")
    if a: r['plate_no'] = clean(value_right(words, a, row_tol=18))

    # File No
    a = find_anchor(words, "File", "No:") or find_anchor_fuzzy(words, "File")
    if a: r['file_no'] = clean(value_right(words, a, row_tol=18))

    # Classification
    a = find_anchor_fuzzy(words, "Classification")
    if a: r['classification'] = clean(value_right(words, a, row_tol=18))

    # Vehicle Type
    a = find_anchor(words, "Vehicle", "Type:")
    if a: r['vehicle_type'] = clean(value_right(words, a, row_tol=18))

    # Fuel Type
    a = find_anchor(words, "Fuel", "Type:")
    if a: r['fuel_type'] = clean(value_right(words, a, row_tol=18))

    # Aircon Type
    a = find_anchor(words, "Aircon", "Type:")
    if a: r['aircon_type'] = clean(value_right(words, a, row_tol=18))

    # Color
    a = find_anchor(words, "Color:")
    if a: r['color'] = clean(value_right(words, a, row_tol=18))

    # Year Model
    a = find_anchor(words, "Year", "Model:")
    if a: r['year_model'] = clean(value_right(words, a, row_tol=18))

    # Breakdown of Payment
    for fee in [("Cost", "of", "plate"), ("MVUC",), ("Science", "Tax"), ("Transfer", "Fee"), ("Legal", "Research", "Fee")]:
        a = find_anchor(words, *fee)
        key = '_'.join(fee).lower().replace('.', '')
        if a: r[key] = clean(value_right(words, a, row_tol=18))

    # Total Amount
    a = find_anchor(words, "TOTAL", "AMOUNT", "PAID:") or find_anchor_fuzzy(words, "TOTAL", "AMOUNT")
    if a: r['total_amount'] = clean(value_right(words, a, row_tol=20))

    # Amount in Words
    a = find_anchor(words, "AMOUNT", "IN", "WORDS:")
    if a: r['amount_in_words'] = clean(value_right(words, a, row_tol=20))

    # Mode of Payment
    a = find_anchor(words, "MODE", "OF", "PAYMENT:") or find_anchor_fuzzy(words, "MODE", "PAYMENT")
    if a: r['mode_of_payment'] = clean(value_right(words, a, row_tol=18))

    # Location
    a = find_anchor(words, "LOCATION:")
    if a: r['location'] = clean(value_right(words, a, row_tol=18))

    return r


# ─────────────────────────────────────────────────────────────────────
# 4d. DRIVER'S LICENSE EXTRACTOR
# ─────────────────────────────────────────────────────────────────────
def extract_dl(words):
    r = {}

    # Name
    a = find_anchor(words, "Last", "Name.") or find_anchor_fuzzy(words, "Last", "Name")
    if a: r['name'] = clean(value_below(words, a, col_tol=400))

    # Nationality / Sex / DOB — on same label row
    a = find_anchor(words, "Nationality")
    if a: r['nationality'] = clean(value_below(words, a))

    a = find_anchor(words, "Sex")
    if a: r['sex'] = clean(value_below(words, a))

    a = find_anchor(words, "Date", "of", "Birth")
    if a: r['date_of_birth'] = clean(value_below(words, a))

    a = find_anchor(words, "Weight")
    if a: r['weight_kg'] = clean(value_below(words, a))

    a = find_anchor_fuzzy(words, "Height")
    if a: r['height_m'] = clean(value_below(words, a))

    # Address
    a = find_anchor(words, "Address")
    if a: r['address'] = clean(value_below(words, a, col_tol=500, max_lines=2))

    # License No
    a = find_anchor(words, "License", "No.")
    if a: r['license_no'] = clean(value_below(words, a))

    # Expiration Date
    a = find_anchor(words, "Expiration", "Date")
    if a: r['expiration_date'] = clean(value_below(words, a))

    # Agency Code
    a = find_anchor(words, "Agency", "Code")
    if a: r['agency_code'] = clean(value_below(words, a))

    # Blood Type
    a = find_anchor(words, "Blood", "Type")
    if a: r['blood_type'] = clean(value_below(words, a))

    # Eyes Color
    a = find_anchor(words, "Eyes", "Color")
    if a: r['eyes_color'] = clean(value_below(words, a))

    # DL Codes
    a = find_anchor(words, "DL", "Codes") or find_anchor_fuzzy(words, "DL", "Codes")
    if a: r['dl_codes'] = clean(value_below(words, a))

    # Conditions
    a = find_anchor(words, "Conditions")
    if a: r['conditions'] = clean(value_below(words, a))

    return r


# ─────────────────────────────────────────────────────────────────────
# 5. MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────
def extract(image_path):
    full_text, words = preprocess(image_path)
    doc_type = detect_doc_type(full_text)

    dispatch = {
        "CR_A":           extract_cr_a,
        "CR_B":           extract_cr_b,
        "OR":             extract_or,
        "DRIVERS_LICENSE": extract_dl,
    }

    fn = dispatch.get(doc_type)
    if not fn:
        return {"doc_type": "UNKNOWN", "fields": {}, "raw_text": full_text[:500]}

    fields = fn(words)
    fields = {k: v for k, v in fields.items() if v and v not in ('', '-', '—')}

    return {"doc_type": doc_type, "fields": fields}


# ─────────────────────────────────────────────────────────────────────
# 6. RUN ON ALL 4 SAMPLE IMAGES
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    samples = [
        ("/mnt/user-data/uploads/CR-Layout-A.png", "CR Layout A"),
        ("/mnt/user-data/uploads/CR-Layout-B.png", "CR Layout B"),
        ("/mnt/user-data/uploads/OR-Layout.jpg",   "Official Receipt"),
        ("/mnt/user-data/uploads/DL-Layout.jpg",   "Driver's License"),
    ]

    all_results = {}

    for path, label in samples:
        print(f"\n{'='*56}")
        print(f"  {label}")
        print(f"{'='*56}")
        result = extract(path)
        all_results[label] = result
        print(f"  Detected: {result['doc_type']}")
        if result['fields']:
            for k, v in result['fields'].items():
                print(f"  {k:<30}: {v}")
        else:
            print("  (no fields extracted — blank template image)")

    with open("/mnt/user-data/outputs/lto_extracted.json", "w") as f:
        json.dump(all_results, f, indent=2)

    print("\nResults saved to lto_extracted.json")
