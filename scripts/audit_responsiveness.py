import os
import re

src_dir = r'c:\Users\user\OneDrive\Desktop\counselorpro\src'

def audit_file(filepath):
    rel_path = os.path.relpath(filepath, src_dir)
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    issues = []
    for idx, line in enumerate(lines, 1):
        # 1. Unresponsive fixed width >= 320px without media query prefix
        matches = re.findall(r'(?<![smldx]:)(?:w|min-w)-\[(\d+)px\]', line)
        for m in matches:
            if int(m) >= 300:
                issues.append((idx, f"Large fixed width: w-[{m}px] without responsive prefix"))

        # 2. Hardcoded large min-w without responsive prefix
        min_w_matches = re.findall(r'(?<![smldx]:)min-w-(?:\[\d+px\]|\d+|xs|sm|md|lg)', line)
        for mw in min_w_matches:
            if any(x in mw for x in ['[4', '[5', '[6', '[7', '[8', 'md', 'lg']):
                issues.append((idx, f"Unresponsive min-width: {mw}"))

        # 3. Grid cols without mobile base
        grid_matches = re.findall(r'grid-cols-([3-9]|1[0-2])(?!\s*sm:)', line)
        if grid_matches and not ('sm:grid-cols' in line or 'md:grid-cols' in line or 'grid-cols-1' in line or 'grid-cols-2' in line):
            # check if grid-cols-1 is already on the line
            if 'grid-cols-1' not in line and 'grid-cols-2' not in line:
                issues.append((idx, f"High grid columns without mobile base: {line.strip()[:60]}"))

        # 4. Table without overflow wrapper
        if '<table' in line:
            # check if previous lines had overflow-x-auto
            context = "".join(lines[max(0, idx-5):idx])
            if 'overflow-x' not in context and 'overflow-auto' not in context:
                issues.append((idx, f"Table potentially missing overflow-x wrapper: {line.strip()[:50]}"))

        # 5. whitespace-nowrap on elements that might have long titles
        if 'whitespace-nowrap' in line and not ('truncate' in line or 'overflow' in line or 'hidden' in line or 'sm:' in line):
            if any(k in line for k in ['name', 'title', 'heading', 'text-sm', 'text-base']):
                issues.append((idx, f"whitespace-nowrap on text: {line.strip()[:60]}"))

    return rel_path, issues

print('========================================================================')
print('        COUNSELORPRO — RESPONSIVE DESIGN CODEBASE AUDIT                 ')
print('========================================================================\n')

total_issues = 0
for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            fp = os.path.join(root, file)
            rel_path, file_issues = audit_file(fp)
            if file_issues:
                print(f"[{rel_path}] ({len(file_issues)} findings):")
                for line_no, msg in file_issues:
                    print(f"  Line {line_no:4d}: {msg}")
                print()
                total_issues += len(file_issues)

print(f"Total potential responsive issues found: {total_issues}")
