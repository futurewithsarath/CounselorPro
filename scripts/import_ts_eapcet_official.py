"""Build the versioned TS EAPCET MPC dataset from the official PDF text extraction.

The source text was extracted page by page from the official PDF's text layer. Keep
all raw source fields and cutoff values; NA is represented as JSON null.
"""

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SOURCE_URL = "https://tgeapcet.nic.in/files/TGEAPCET_2025_LASTRANKS_FirstPhase.pdf"
CUTOFF_COLUMNS = [
    ("OC", "OC"),
    ("BC_A", "BC_A"), ("BC_B", "BC_B"), ("BC_C", "BC_C"),
    ("BC_D", "BC_D"), ("BC_E", "BC_E"),
    ("SC_I", "SC_I"), ("SC_II", "SC_II"), ("SC_III", "SC_III"),
    ("ST", "ST"), ("EWS", "OC_EWS"),
]


def parse_rank(value, code, branch, category, gender):
    value = value.strip().upper().replace(",", "")
    if value in {"NA", "N/A", "N.A.", "-"}:
        return None
    if not value.isdigit():
        raise ValueError(f"Invalid {category}/{gender} cutoff for {code}/{branch}: {value!r}")
    return int(value)


def parse_source(text):
    source_pages = [
        ((int(line_number) - 2) // 2 + 1, body)
        for line_number, body in re.findall(r"(?m)^L(\d+):\s*(.*)$", text)
        if int(line_number) % 2 == 0 and "Inst Code " in body
    ]
    source_pages.sort(key=lambda page: page[0])
    rows = []
    errors = []
    for page_number, page_text in source_pages:
        for chunk in re.split(r"Inst Code\s+", page_text)[1:]:
            if not re.search(r"\|\s*Branch Name\s+", chunk):
                continue
            header = re.match(
                r"([A-Z0-9 ]{3,12}?)\s*\|\s*Institute Name\s+(.+?)\s+\|\s*Place\s+(.+?)\s+\|\s*Dist Code\s+([A-Z0-9]+)\s+\|\s*Co Educatio\s*n\s+([A-Z]+)\s+\|\s*College Type\s+(.+?)\s+\|\s*Branch Code\s+([A-Z0-9]+)\s+\|\s*Branch Name\s+(.+?)\s+\|\s*OC BOYS\s+([^|]+)",
                chunk,
                re.IGNORECASE,
            )
            if not header:
                errors.append(f"Could not parse page {page_number} record: {chunk[:150]!r}")
                continue
            code, name, place, district_code, coeducation, college_type, branch, branch_name, _ = header.groups()
            code, branch = re.sub(r"\s+", "", code.upper()), branch.upper()
            name = re.sub(r"\s+", " ", name).strip()
            # The PDF has an overlapping text layer for one integrated-course name.
            if code == "JNTHMT":
                name = "JNTUH UNIVERSITY COLLEGE OF ENGG SCI AND TECH -5 YEAR INTEGRATED MTECH"
            cutoffs = {}
            for source_category, db_category in CUTOFF_COLUMNS:
                values = {}
                for gender in ("BOYS", "GIRLS"):
                    found = re.search(
                        rf"\|\s*{re.escape(source_category)}\s+{gender}\s+([^|]+)",
                        chunk,
                        re.IGNORECASE,
                    )
                    if not found:
                        errors.append(f"Missing {source_category}/{gender} in {code}/{branch}")
                        values[gender.title()] = None
                    else:
                        try:
                            values[gender.title()] = parse_rank(found.group(1), code, branch, source_category, gender)
                        except ValueError as error:
                            errors.append(str(error))
                cutoffs[db_category] = values

            university = re.search(r"\|\s*Affiliated To\s+(.+?)(?:\s+---\s+\||$)", chunk)
            coeducation = coeducation.upper()
            eligibility = coeducation if coeducation in {"COED", "GIRLS", "BOYS"} else "COED"
            rows.append({
                "id": f"ts-eapcet-2025-{code.lower()}-{branch.lower()}",
                "code": code,
                "name": name,
                "branch": branch,
                "branchName": re.sub(r"\s+", " ", branch_name).strip(),
                "district": district_code.upper(),
                "districtCode": district_code.upper(),
                "type": college_type.strip().upper(),
                "fee": None,
                "place": re.sub(r"\s+", " ", place).strip(),
                "affiliatingUniversity": re.sub(r"\s+", " ", university.group(1)).strip() if university else None,
                "region": "TS",
                "exam": "TS_EAMCET",
                "stream": "MPC",
                "year": 2025,
                "genderEligibility": eligibility,
                "sourcePage": page_number,
                "sourceRowNumber": len(rows) + 1,
                "cutoffsByCategory": cutoffs,
            })

    ids = [row["id"] for row in rows]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"Duplicate college/branch records: {', '.join(duplicates[:20])}")
    if errors:
        raise ValueError("Official TS cutoff import failed validation:\n" + "\n".join(errors[:50]))
    if not rows:
        raise ValueError("No course records found in the official source text.")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source_text", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/data/TS_EAMCET_MPC_2025.json"))
    args = parser.parse_args()
    raw = args.source_text.read_bytes()
    text = raw.decode("utf-8-sig")
    colleges = parse_source(text)
    metadata = {
        "datasetId": "TS_EAMCET_MPC_2025",
        "exam": "TS_EAMCET",
        "state": "TS",
        "stream": "MPC",
        "year": 2025,
        "counsellingPhase": "FIRST_PHASE",
        "sourceTitle": "TGEAPCET-2025 Last Rank Statement - First Phase",
        "sourceFile": "TGEAPCET_2025_LASTRANKS_FirstPhase.pdf",
        "sourceUrl": SOURCE_URL,
        "sourceExtractionSha256": hashlib.sha256(raw).hexdigest(),
        "sourcePages": len({row["sourcePage"] for row in colleges}),
        "sourceRows": len(colleges),
        "collegeCourseRecords": len(colleges),
        "uniqueColleges": len({row["code"] for row in colleges}),
        "cutoffCategories": ["OC", "BC-A", "BC-B", "BC-C", "BC-D", "BC-E", "SC-I", "SC-II", "SC-III", "ST", "EWS"],
        "cutoffGenders": ["Boys", "Girls"],
        "cutoffLocalAreaScope": "NOT_REPORTED",
        "feesIncluded": False,
        "missingCutoffValue": "NA maps to null",
        "cutoffMeaning": "Official 2025 first-phase last ranks by category and gender. The source does not publish separate local-area cutoff columns.",
        "disclaimer": "Historical first-phase results only. The source excludes special reservation categories, dropouts, and spot admissions; it states girls are eligible for boys seats and describes 15% unreserved / 85% local-seat filling. Historical ranks do not guarantee a future seat.",
        "importedAt": datetime.now(timezone.utc).isoformat(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"metadata": metadata, "colleges": colleges}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(colleges)} course records across {metadata['uniqueColleges']} colleges to {args.output}.")


if __name__ == "__main__":
    main()
