"""
CounselorPro — NEET Official Data Extraction & Normalization
Extracts complete datasets from:
1. File 1 (MCC): UG 2026 Round 1 Tentative Seat Matrix (MBBS, BDS, B.Sc. Nursing)
2. File 2 (NMC): MBBS Seat Matrix AY 2025-26 (S.No 1 to 819, 128,925 seats)
"""

import os
import json
import re
import fitz

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF1_PATH = r"C:\Users\user\.gemini\antigravity\brain\67007c35-f754-4aa3-9250-6c9ba8749586\.user_uploaded\media_1794585110070_07b51cf2.pdf"
PDF2_PATH = r"C:\Users\user\.gemini\antigravity\brain\67007c35-f754-4aa3-9250-6c9ba8749586\.user_uploaded\media_1794585110059_6bc4699f.pdf"

# Canonical State / UT mapping dictionary
CANONICAL_STATES = {
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "andaman & nicobar": "Andaman and Nicobar Islands",
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chandigarh": "Chandigarh",
    "chhattisgarh": "Chhattisgarh",
    "chattisgarh": "Chhattisgarh",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "the dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "delhi": "Delhi",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jammu and kashmir": "Jammu and Kashmir",
    "jammu & kashmir": "Jammu and Kashmir",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "uttaranchal": "Uttarakhand",
    "west bengal": "West Bengal"
}

def normalize_state(raw_state: str) -> str:
    cleaned = re.sub(r'\s+', ' ', raw_state.strip()).lower()
    if cleaned in CANONICAL_STATES:
        return CANONICAL_STATES[cleaned]
    # Fallback title case
    return raw_state.strip().title()

def clean_text(val) -> str:
    if val is None:
        return ""
    return re.sub(r'\s+', ' ', str(val)).strip()

def extract_mcc_pdf(pdf_path: str):
    print(f"Opening MCC PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    records = []
    
    # Page 1 is Notice. Pages 2 to 26 contain tables.
    for pno in range(1, len(doc)):
        page = doc[pno]
        tables = page.find_tables()
        for tab in tables:
            extracted = tab.extract()
            for row in extracted:
                if not row or not row[0]:
                    continue
                # Skip header rows
                if "State" in row[0] or "TENTATIVE" in row[0]:
                    continue
                if all(cell is None or cell == "" for cell in row):
                    continue
                
                state_raw = clean_text(row[0])
                instcd = clean_text(row[1])
                instnm = clean_text(row[2])
                prog_id = clean_text(row[3])
                program = clean_text(row[4])
                quota_name = clean_text(row[5])
                total_seat_str = clean_text(row[6])
                seats_str = clean_text(row[7]) if len(row) > 7 else "0"
                
                # Check for valid numeric data
                if not instcd.isdigit():
                    continue
                
                total_seat = int(total_seat_str) if total_seat_str.isdigit() else 0
                seats = int(seats_str) if seats_str.isdigit() else 0
                
                canonical_state = normalize_state(state_raw)
                
                # Determine normalized course
                course_norm = "MBBS"
                if "BDS" in prog_id.upper() or "BDS" in program.upper():
                    course_norm = "BDS"
                elif "BSCN" in prog_id.upper() or "NURSING" in program.upper():
                    course_norm = "B.Sc. Nursing"
                
                record = {
                    "sourceDocument": "MCC_UG_2026_ROUND_1_SEAT_MATRIX",
                    "pdfPage": pno + 1,
                    "stateRaw": state_raw,
                    "canonicalState": canonical_state,
                    "instcd": instcd,
                    "instnm": instnm,
                    "programId": prog_id,
                    "program": program,
                    "courseNormalized": course_norm,
                    "quotaName": quota_name,
                    "totalSeat": total_seat,
                    "seats": seats
                }
                records.append(record)
                
    print(f"MCC extraction complete. Total valid records extracted: {len(records)}")
    return records

def extract_nmc_pdf(pdf_path: str):
    print(f"Opening NMC PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    records = []
    
    # Pages 1-2 are Notices. Pages 3 to 49 contain tables.
    for pno in range(2, len(doc)):
        page = doc[pno]
        tables = page.find_tables()
        for tab in tables:
            extracted = tab.extract()
            for row in extracted:
                if not row or not row[0]:
                    continue
                if "S.No" in row[0] or "SEAT MATRIX" in row[0]:
                    continue
                if all(cell is None or cell == "" for cell in row):
                    continue
                
                sno_str = clean_text(row[0])
                if not sno_str.isdigit():
                    continue
                
                sno = int(sno_str)
                state_raw = clean_text(row[1])
                name = clean_text(row[2])
                management_raw = clean_text(row[3])
                seats_24_str = clean_text(row[4])
                seats_25_str = clean_text(row[5])
                remarks = clean_text(row[6]) if len(row) > 6 else ""
                
                seats_24 = int(seats_24_str) if seats_24_str.isdigit() else 0
                seats_25 = int(seats_25_str) if seats_25_str.isdigit() else 0
                
                canonical_state = normalize_state(state_raw)
                
                # Management standardization
                mg_upper = management_raw.upper()
                if "GOVT. (SOCIETY)" in mg_upper or "GOVT (SOCIETY)" in mg_upper:
                    management_std = "Govt. (Society)"
                elif "GOVT" in mg_upper:
                    management_std = "Govt."
                elif "TRUST" in mg_upper:
                    management_std = "Trust"
                elif "SOCIETY" in mg_upper:
                    management_std = "Society"
                elif "COMPANY" in mg_upper:
                    management_std = "Company"
                elif "PRIVATE" in mg_upper:
                    management_std = "Private"
                else:
                    management_std = management_raw.title()
                
                record = {
                    "sourceDocument": "NMC_MBBS_SEAT_MATRIX_AY_2025_26",
                    "pdfPage": pno + 1,
                    "sno": sno,
                    "stateRaw": state_raw,
                    "canonicalState": canonical_state,
                    "collegeName": name,
                    "managementRaw": management_raw,
                    "managementStandardized": management_std,
                    "seats2024_25": seats_24,
                    "seats2025_26": seats_25,
                    "remarks": remarks
                }
                records.append(record)
                
    print(f"NMC extraction complete. Total valid records extracted: {len(records)}")
    return records

def run_extraction():
    # 1. Extract MCC
    mcc_records = extract_mcc_pdf(PDF1_PATH)
    # Verification checks
    assert len(mcc_records) == 724, f"Expected 724 MCC records, got {len(mcc_records)}"
    mbbs_count = sum(1 for r in mcc_records if r["courseNormalized"] == "MBBS")
    bds_count = sum(1 for r in mcc_records if r["courseNormalized"] == "BDS")
    nursing_count = sum(1 for r in mcc_records if r["courseNormalized"] == "B.Sc. Nursing")
    assert mbbs_count == 602, f"Expected 602 MBBS records, got {mbbs_count}"
    assert bds_count == 114, f"Expected 114 BDS records, got {bds_count}"
    assert nursing_count == 8, f"Expected 8 B.Sc. Nursing records, got {nursing_count}"
    print(f"MCC Verified: 602 MBBS + 114 BDS + 8 B.Sc. Nursing = 724 total records.")
    
    # 2. Extract NMC
    nmc_records = extract_nmc_pdf(PDF2_PATH)
    assert len(nmc_records) == 819, f"Expected 819 NMC records, got {len(nmc_records)}"
    snos = [r["sno"] for r in nmc_records]
    assert snos == list(range(1, 820)), "NMC S.Nos are not contiguous from 1 to 819"
    total_24 = sum(r["seats2024_25"] for r in nmc_records)
    total_25 = sum(r["seats2025_26"] for r in nmc_records)
    assert total_24 == 117750, f"Expected 117,750 seats for 2024-25, got {total_24}"
    assert total_25 == 128925, f"Expected 128,925 seats for 2025-26, got {total_25}"
    print(f"NMC Verified: 819 colleges, 117,750 seats (2024-25), 128,925 seats (2025-26).")
    
    # 3. Export standalone official JSON datasets to public/data/
    public_data_dir = os.path.join(BASE_DIR, "public", "data")
    os.makedirs(public_data_dir, exist_ok=True)
    
    mcc_json_path = os.path.join(public_data_dir, "NEET_UG_2026_ROUND1_MCC.json")
    mcc_payload = {
        "metadata": {
            "datasetId": "NEET_UG_2026_ROUND1_MCC",
            "exam": "NEET_UG",
            "sourceTitle": "MCC NEET UG 2026 Round 1 Tentative Seat Matrix",
            "sourceNoticeRef": "Ref. U-12021/02/2026-MEC Dated 05.08.2026",
            "issuingAuthority": "Medical Counselling Committee (DGHS, MoHFW)",
            "publishedDate": "2026-08-05",
            "totalRecords": len(mcc_records),
            "programBreakdown": {
                "MBBS": mbbs_count,
                "BDS": bds_count,
                "BSc_Nursing": nursing_count
            },
            "uniqueInstitutes": len(set(r["instcd"] for r in mcc_records)),
            "uniqueStates": len(set(r["canonicalState"] for r in mcc_records)),
            "uniqueQuotas": len(set(r["quotaName"] for r in mcc_records))
        },
        "records": mcc_records
    }
    with open(mcc_json_path, "w", encoding="utf-8") as f:
        json.dump(mcc_payload, f, indent=2, ensure_ascii=False)
    print(f"Saved: {mcc_json_path}")
    
    nmc_json_path = os.path.join(public_data_dir, "NMC_MBBS_2025_2026.json")
    nmc_payload = {
        "metadata": {
            "datasetId": "NMC_MBBS_2025_2026",
            "exam": "NEET_UG",
            "sourceTitle": "National Medical Commission MBBS Seat Matrix as on 17-10-2025",
            "sourceNoticeRef": "No. C DN-200 I | 1335 12025-CDN-NMC Dated 17.10.2025",
            "issuingAuthority": "National Medical Commission (Policy & Coordination Division)",
            "publishedDate": "2025-10-17",
            "totalColleges": len(nmc_records),
            "totalApprovedSeats2024_25": total_24,
            "totalApprovedSeats2025_26": total_25,
            "netSeatIncrease": total_25 - total_24,
            "uniqueStates": len(set(r["canonicalState"] for r in nmc_records))
        },
        "records": nmc_records
    }
    with open(nmc_json_path, "w", encoding="utf-8") as f:
        json.dump(nmc_payload, f, indent=2, ensure_ascii=False)
    print(f"Saved: {nmc_json_path}")
    
    return mcc_records, nmc_records

if __name__ == "__main__":
    run_extraction()
