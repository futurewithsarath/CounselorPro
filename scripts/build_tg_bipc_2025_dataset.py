import csv
import datetime
import json
import os
import pypdf

PDF_PATH = r'C:/Users/user/.gemini/antigravity/brain/67007c35-f754-4aa3-9250-6c9ba8749586/.user_uploaded/media_1794563298695_fdab07aa.pdf'
RAW_TSV_PATH = 'scripts/source_data/TGEAPCET_BIPC_2025_FinalPhase_raw.tsv'
FIRESTORE_JSON_PATH = 'scripts/source_data/TS_EAMCET_BIPC_2025_firestore.json'
APP_JSON_PATH = 'public/data/TS_EAMCET_BIPC_2025.json'
CSV_PATH = 'scripts/source_data/TS_EAMCET_BIPC_2025.csv'

def parse_rank(val):
    if not val or val == 'NA' or val == 'null' or val == 'None':
        return None
    val = val.strip()
    return int(val) if val.isdigit() else None

def parse_fee(val):
    if not val or val == 'NA' or val == 'null' or val == 'None':
        return None
    val = val.strip()
    return int(val) if val.isdigit() else None

def main():
    # Map to pages
    reader = pypdf.PdfReader(PDF_PATH)
    page_texts = [page.extract_text() for page in reader.pages]

    with open(RAW_TSV_PATH, 'r', encoding='utf-8') as f:
        tsv_rows = [line.strip().split('\t') for line in f if line.strip()]

    print(f"Loaded {len(tsv_rows)} rows from TSV.")

    firestore_records = []
    app_colleges = []
    csv_rows = []

    unique_colleges = set()

    for row_idx, r in enumerate(tsv_rows):
        inst_code = r[0].strip()
        institute_name = r[1].strip()
        place = r[2].strip()
        district = r[3].strip()
        co_education = r[4].strip()
        college_type = r[5].strip()
        branch_code = r[6].strip()
        branch_name = r[7].strip()

        unique_colleges.add(inst_code)

        cutoffs = {
            "OC_Boys": parse_rank(r[8]),
            "OC_Girls": parse_rank(r[9]),
            "BC_A_Boys": parse_rank(r[10]),
            "BC_A_Girls": parse_rank(r[11]),
            "BC_B_Boys": parse_rank(r[12]),
            "BC_B_Girls": parse_rank(r[13]),
            "BC_C_Boys": parse_rank(r[14]),
            "BC_C_Girls": parse_rank(r[15]),
            "BC_D_Boys": parse_rank(r[16]),
            "BC_D_Girls": parse_rank(r[17]),
            "BC_E_Boys": parse_rank(r[18]),
            "BC_E_Girls": parse_rank(r[19]),
            "SC_I_Boys": parse_rank(r[20]),
            "SC_I_Girls": parse_rank(r[21]),
            "SC_II_Boys": parse_rank(r[22]),
            "SC_II_Girls": parse_rank(r[23]),
            "SC_III_Boys": parse_rank(r[24]),
            "SC_III_Girls": parse_rank(r[25]),
            "ST_Boys": parse_rank(r[26]),
            "ST_Girls": parse_rank(r[27]),
            "EWS_Boys": parse_rank(r[28]),
            "EWS_Girls": parse_rank(r[29])
        }

        annual_fee = parse_fee(r[30])
        affiliated_univ = r[31].strip()

        # Find page
        page_num = 1
        for p_idx, text in enumerate(page_texts):
            if inst_code in text and branch_code in text:
                page_num = p_idx + 1
                break

        # 1. Firestore schema
        firestore_record = {
            "inst_code": inst_code,
            "institute_name": institute_name,
            "branch_code": branch_code,
            "branch_name": branch_name,
            "place": place,
            "district": district,
            "college_type": college_type,
            "co_education": co_education,
            "affiliated_univ": affiliated_univ,
            "region": "TG",
            "annual_fee": annual_fee,
            "cutoffs": cutoffs
        }
        firestore_records.append(firestore_record)

        # 2. App schema
        college_id = f"ts-eapcet-2025-bipc-{inst_code.lower()}-{branch_code.lower()}"
        app_college = {
            "id": college_id,
            "code": inst_code,
            "name": institute_name,
            "branch": branch_code,
            "branchName": branch_name,
            "district": district,
            "districtCode": district,
            "type": college_type,
            "fee": annual_fee,
            "place": place,
            "affiliatingUniversity": affiliated_univ,
            "region": "TG",
            "exam": "TS_EAMCET",
            "stream": "BiPC",
            "year": 2025,
            "genderEligibility": co_education,
            "sourcePage": page_num,
            "sourceRowNumber": row_idx + 1,
            "cutoffsByCategory": {
                "OC": {"Boys": cutoffs["OC_Boys"], "Girls": cutoffs["OC_Girls"]},
                "BC_A": {"Boys": cutoffs["BC_A_Boys"], "Girls": cutoffs["BC_A_Girls"]},
                "BC_B": {"Boys": cutoffs["BC_B_Boys"], "Girls": cutoffs["BC_B_Girls"]},
                "BC_C": {"Boys": cutoffs["BC_C_Boys"], "Girls": cutoffs["BC_C_Girls"]},
                "BC_D": {"Boys": cutoffs["BC_D_Boys"], "Girls": cutoffs["BC_D_Girls"]},
                "BC_E": {"Boys": cutoffs["BC_E_Boys"], "Girls": cutoffs["BC_E_Girls"]},
                "SC_I": {"Boys": cutoffs["SC_I_Boys"], "Girls": cutoffs["SC_I_Girls"]},
                "SC_II": {"Boys": cutoffs["SC_II_Boys"], "Girls": cutoffs["SC_II_Girls"]},
                "SC_III": {"Boys": cutoffs["SC_III_Boys"], "Girls": cutoffs["SC_III_Girls"]},
                "ST": {"Boys": cutoffs["ST_Boys"], "Girls": cutoffs["ST_Girls"]},
                "OC_EWS": {"Boys": cutoffs["EWS_Boys"], "Girls": cutoffs["EWS_Girls"]}
            }
        }
        app_colleges.append(app_college)

        # 3. CSV row
        csv_row = {
            "inst_code": inst_code,
            "institute_name": institute_name,
            "place": place,
            "district": district,
            "co_education": co_education,
            "college_type": college_type,
            "branch_code": branch_code,
            "branch_name": branch_name,
            **{k: (v if v is not None else "NA") for k, v in cutoffs.items()},
            "annual_fee": annual_fee if annual_fee is not None else "NA",
            "affiliated_univ": affiliated_univ
        }
        csv_rows.append(csv_row)

    # Save firestore JSON
    with open(FIRESTORE_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(firestore_records, f, indent=2)
    print(f"Saved {len(firestore_records)} records to {FIRESTORE_JSON_PATH}")

    # Save App JSON
    app_dataset = {
        "metadata": {
            "datasetId": "TS_EAMCET_BIPC_2025",
            "exam": "TS_EAMCET",
            "state": "TS",
            "stream": "BiPC",
            "year": 2025,
            "counsellingPhase": "FINAL_PHASE",
            "sourceTitle": "TGEAPCET(Bi.P.C)-2025 Last Rank Statement Final Phase",
            "sourceFile": "TSEAPCETBIPC2025LASTRANKSFINALPHASE.pdf",
            "sourceExtractionSha256": "c36d3ce8ca60a859613b1e5354f3e6a5d5f8ce4d2fbb0915c3b4f962a9988ab3",
            "sourcePages": 8,
            "sourceRows": len(app_colleges),
            "collegeCourseRecords": len(app_colleges),
            "uniqueColleges": len(unique_colleges),
            "cutoffCategories": ["OC", "BC-A", "BC-B", "BC-C", "BC-D", "BC-E", "SC-I", "SC-II", "SC-III", "ST", "EWS"],
            "cutoffGenders": ["Boys", "Girls"],
            "cutoffLocalAreaScope": "NOT_REPORTED",
            "feesIncluded": True,
            "missingCutoffValue": "NA maps to null",
            "cutoffMeaning": "Official 2025 final-phase last ranks by category and gender. The source does not publish separate local-area cutoff columns.",
            "disclaimer": "Historical final-phase results only. The source states girls are eligible for boys seats. Historical ranks do not guarantee a future seat.",
            "importedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
        "colleges": app_colleges
    }
    with open(APP_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(app_dataset, f, indent=2)
    print(f"Saved {len(app_colleges)} records to {APP_JSON_PATH}")

    # Save CSV
    if csv_rows:
        fieldnames = list(csv_rows[0].keys())
        with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"Saved {len(csv_rows)} rows to {CSV_PATH}")

if __name__ == '__main__':
    main()
