import json
import glob
import os

def audit():
    files = sorted(glob.glob('public/data/*.json'))
    for f in files:
        with open(f, 'r', encoding='utf-8') as fp:
            d = json.load(fp)
        meta = d.get('metadata', {})
        colleges = d.get('colleges', [])
        col_codes = set(c['code'] for c in colleges)
        branches = set(c['branch'] for c in colleges)
        districts = set(c.get('district') for c in colleges)
        
        # Check cutoffs
        null_count = 0
        valid_count = 0
        for c in colleges:
            if 'cutoffsByLocalArea' in c and c['cutoffsByLocalArea']:
                for area, cat_map in c['cutoffsByLocalArea'].items():
                    for cat, g_map in cat_map.items():
                        for g, val in g_map.items():
                            if val is not None:
                                valid_count += 1
                            else:
                                null_count += 1
            elif 'cutoffsByCategory' in c and c['cutoffsByCategory']:
                for cat, g_map in c['cutoffsByCategory'].items():
                    for g, val in g_map.items():
                        if val is not None:
                            valid_count += 1
                        else:
                            null_count += 1

        print(f"=== {os.path.basename(f)} ===")
        print(f"Dataset ID: {meta.get('datasetId')}")
        print(f"Exam: {meta.get('exam')} | Stream: {meta.get('stream')} | Year: {meta.get('year')}")
        print(f"Source Title: {meta.get('sourceTitle')}")
        print(f"Source File: {meta.get('sourceFile')}")
        print(f"Total Course Records: {len(colleges)}")
        print(f"Unique Colleges: {len(col_codes)}")
        print(f"Unique Branches: {len(branches)}")
        print(f"Unique Districts: {len(districts)}")
        print(f"Cutoff Scope: {meta.get('cutoffLocalAreaScope', 'AU/SVU')}")
        print(f"Valid Cutoffs: {valid_count:,} | Null/NA Cutoffs: {null_count:,}")
        print()

if __name__ == '__main__':
    audit()

