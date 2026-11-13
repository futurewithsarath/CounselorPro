"""Convert the AP EAPCET BiPC last-rank PDF into CounselorPro's versioned JSON shape.

Requires PyMuPDF (pymupdf). This is an offline import tool; it does not upload data.
"""

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pymupdf


HEADERS = [
    "serial", "code", "name", "type", "institutionRegion", "districtCode",
    "place", "genderEligibility", "affiliatingUniversity", "establishedYear",
    "branch", "localArea",
]
CUTOFF_COLUMNS = [
    ("OC", "Boys"), ("OC", "Girls"),
    ("SC", "Boys"), ("SC", "Girls"),
    ("ST", "Boys"), ("ST", "Girls"),
    ("BC_A", "Boys"), ("BC_A", "Girls"),
    ("BC_B", "Boys"), ("BC_B", "Girls"),
    ("BC_C", "Boys"), ("BC_C", "Girls"),
    ("BC_D", "Boys"), ("BC_D", "Girls"),
    ("BC_E", "Boys"), ("BC_E", "Girls"),
    ("OC_EWS", "Boys"), ("OC_EWS", "Girls"),
]


def numeric(value, field, serial):
    value = value.strip()
    if not value:
        return None
    try:
        return int(value.replace(",", ""))
    except ValueError as exc:
        raise ValueError(f"Row {serial}: invalid {field} value {value!r}") from exc


def extract_rows(document):
    output = []
    for page_number, page in enumerate(document, start=1):
        drawings = page.get_drawings()
        xs = sorted({round(d["rect"].x0, 2) for d in drawings if d["rect"].width < 1})
        ys = sorted({round(d["rect"].y0, 2) for d in drawings if d["rect"].height < 1})
        if len(xs) < 32 or len(ys) < 3:
            continue

        words = page.get_text("words")
        for top, bottom in zip(ys[1:], ys[2:]):
            cells = [[] for _ in range(len(xs) - 1)]
            for x0, y0, x1, y1, word, *_ in words:
                center_x = (x0 + x1) / 2
                center_y = (y0 + y1) / 2
                if not top <= center_y < bottom:
                    continue
                for index, (left, right) in enumerate(zip(xs, xs[1:])):
                    if left <= center_x < right:
                        cells[index].append((round(y0, 2), round(x0, 2), word))
                        break

            values = [" ".join(word for _, _, word in sorted(cell)) for cell in cells]
            if values and values[0].strip().isdigit():
                expected_columns = len(HEADERS) + len(CUTOFF_COLUMNS) + 1  # plus fee
                if len(values) != expected_columns:
                    raise RuntimeError(f"Page {page_number} row {values[0]}: expected {expected_columns} columns, got {len(values)}")
                output.append((page_number, values))
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/data/AP_EAPCET_BIPC_2024.json"))
    args = parser.parse_args()

    source = args.pdf.resolve(strict=True)
    document = pymupdf.open(source)
    rows = extract_rows(document)
    serials = [int(row[1][0]) for row in rows]
    if not rows or serials != list(range(1, serials[-1] + 1)):
        raise RuntimeError(f"Source row sequence is incomplete or out of order: {len(rows)} records, ending at {serials[-1] if serials else 'none'}")

    groups = {}
    local_areas = set()
    for page_number, row in rows:
        fields = row[:len(HEADERS)]
        entry = dict(zip(HEADERS, (value.strip() for value in fields)))
        serial = int(entry["serial"])
        required = ["code", "name", "type", "institutionRegion", "districtCode", "genderEligibility", "branch", "localArea"]
        missing = [key for key in required if not entry[key]]
        if missing:
            raise RuntimeError(f"Page {page_number} row {serial}: missing required fields {missing}")
        if entry["localArea"] not in {"AU", "SVU"}:
            raise RuntimeError(f"Page {page_number} row {serial}: unexpected local area {entry['localArea']!r}")
        if entry["genderEligibility"] not in {"COED", "GIRLS", "BOYS"}:
            raise RuntimeError(f"Page {page_number} row {serial}: unexpected college eligibility {entry['genderEligibility']!r}")

        cutoff_start = len(HEADERS)
        cutoffs = {}
        for offset, (category, gender) in enumerate(CUTOFF_COLUMNS, start=cutoff_start):
            cutoffs.setdefault(category, {})[gender] = numeric(row[offset], category, serial)
        fee = numeric(row[cutoff_start + len(CUTOFF_COLUMNS)], "fee", serial)

        key = (entry["code"], entry["branch"], entry["type"], entry["institutionRegion"], entry["districtCode"], entry["name"])
        record = groups.setdefault(key, {
            "id": f"ap-eapcet-2024-{entry['code'].lower()}-{entry['branch'].lower()}-{entry['institutionRegion'].lower()}",
            "code": entry["code"],
            "name": entry["name"],
            "branch": entry["branch"],
            "institutionTypeCode": entry["type"],
            "institutionRegion": entry["institutionRegion"],
            "districtCode": entry["districtCode"],
            "place": entry["place"] or None,
            "genderEligibility": entry["genderEligibility"],
            "affiliatingUniversity": entry["affiliatingUniversity"] or None,
            "establishedYear": numeric(entry["establishedYear"], "established year", serial),
            "stream": "BiPC",
            "exam": "AP_EAPCET",
            "state": "AP",
            "year": 2024,
            "fee": fee,
            "sourceRecordNumbers": [],
            "cutoffsByLocalArea": {},
        })
        if record["genderEligibility"] != entry["genderEligibility"]:
            raise RuntimeError(f"Row {serial}: inconsistent gender eligibility for {entry['code']} {entry['branch']}")
        if record["fee"] != fee:
            raise RuntimeError(f"Row {serial}: conflicting fees for {entry['code']} {entry['branch']}: {record['fee']} vs {fee}")
        area = entry["localArea"]
        if area in record["cutoffsByLocalArea"]:
            raise RuntimeError(f"Row {serial}: duplicate local-area record for {entry['code']} {entry['branch']} {area}")
        record["cutoffsByLocalArea"][area] = cutoffs
        record["sourceRecordNumbers"].append(serial)
        local_areas.add(area)

    records = sorted(groups.values(), key=lambda c: (c["code"], c["branch"], c["institutionRegion"]))
    if len({record["id"] for record in records}) != len(records):
        raise RuntimeError("Generated college IDs are not unique")

    metadata = {
        "datasetId": "AP_EAPCET_BIPC_2024",
        "exam": "AP_EAPCET",
        "state": "AP",
        "stream": "BiPC",
        "year": 2024,
        "sourceTitle": "APEAPCET-2024 BiPC Stream Last Rank Details",
        "sourceFile": source.name,
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "sourcePages": len(document),
        "sourceRows": len(rows),
        "collegeCourseRecords": len(records),
        "cutoffCategories": ["OC", "SC", "ST", "BC-A", "BC-B", "BC-C", "BC-D", "BC-E", "OC-EWS"],
        "cutoffGenders": ["Boys", "Girls"],
        "cutoffLocalAreas": sorted(local_areas),
        "feesIncluded": True,
        "missingCutoffValue": None,
        "cutoffMeaning": "Historical final web-counselling last rank, organized by candidate local area, category, and gender.",
        "disclaimer": "Historical information only. The source states that girls are eligible for boys seats and that these last ranks do not guarantee a seat in another year.",
        "excludedBranchCodes": [],
        "importedAt": datetime.now(timezone.utc).isoformat(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"metadata": metadata, "colleges": records}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({**metadata, "branchCodes": dict(Counter(record["branch"] for record in records)), "sourceSerialRange": [serials[0], serials[-1]]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
