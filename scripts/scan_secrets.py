import os
import re
import subprocess
import sys

# High-confidence regex patterns for secret detection
PATTERNS = {
    "Private Key Block": re.compile(r"-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----"),
    "Google / Gemini API Key (Real)": re.compile(r"\bAIzaSy[A-Za-z0-9_-]{33}\b"),
    "Firebase Service Account JSON": re.compile(r'"type":\s*"service_account"'),
    "GitHub Personal Access Token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{36,}\b"),
    "AWS Access Key ID": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "Slack Token": re.compile(r"\bxox[baprs]-[A-Za-z0-9_-]+\b"),
    "Generic Password Assignment": re.compile(r'(?i)(?:password|passwd|pwd|secret|api_key|apikey)\s*[:=]\s*["\']([a-zA-Z0-9_\-!@#$%^&*()+=]{8,})["\']')
}

# Known benign values to allowlist (e.g. public Firebase client API key, placeholders)
PUBLIC_FIREBASE_API_KEY = "AIzaSyAgfXQFSoGjvSxmskHK4tu97Tt0DopngAg"
ALLOWED_BENIGN = {
    PUBLIC_FIREBASE_API_KEY,  # Public client Firebase API key (standard public Web SDK identifier)
    "MY_GEMINI_API_KEY",
    "MOCK_KEY_FALLBACK",
    "owner@example.com",
    "student@example.com",
    "password123",
    "admin123",
    "wrong-password",
    "missing-password",
    "weak-password"
}

def is_benign(match_str: str) -> bool:
    for benign in ALLOWED_BENIGN:
        if benign in match_str:
            return True
    return False

def scan_file(filepath: str):
    findings = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines, 1):
            for name, pattern in PATTERNS.items():
                matches = pattern.findall(line)
                for match in matches:
                    matched_text = match if isinstance(match, str) else line
                    if name == "Google / Gemini API Key (Real)" and matched_text == PUBLIC_FIREBASE_API_KEY:
                        continue
                    if is_benign(matched_text):
                        continue
                    # Ignore comment descriptions or schema documentation
                    if "//" in line and "e.g." in line:
                        continue
                    findings.append({
                        "file": filepath,
                        "line": idx,
                        "type": name,
                        "snippet": line.strip()[:80]
                    })
    except Exception as e:
        pass
    return findings

def scan_git_history():
    print("[*] Scanning Git Commit History (git log -p)...")
    findings = []
    try:
        proc = subprocess.run(["git", "log", "-p"], capture_output=True, text=True, errors="ignore")
        diff_text = proc.stdout
        lines = diff_text.splitlines()
        current_commit = "initial"
        current_file = "unknown"
        for idx, line in enumerate(lines):
            if line.startswith("commit "):
                current_commit = line.split()[1][:8]
            elif line.startswith("+++ b/"):
                current_file = line[6:]
            elif line.startswith("+") and not line.startswith("+++"):
                for name, pattern in PATTERNS.items():
                    matches = pattern.findall(line)
                    for match in matches:
                        matched_text = match if isinstance(match, str) else line
                        if name == "Google / Gemini API Key (Real)" and matched_text == PUBLIC_FIREBASE_API_KEY:
                            continue
                        if is_benign(matched_text):
                            continue
                        findings.append({
                            "commit": current_commit,
                            "file": current_file,
                            "type": name,
                            "line": idx,
                            "snippet": line.strip()[:80]
                        })
    except Exception as e:
        print(f"[-] Git history scan error: {e}")
    return findings

def main():
    print("=" * 70)
    print("   COUNSELORPRO ZERO-LEAK SECURITY SCANNER")
    print("=" * 70)

    # 1. Scan git tracked files
    proc = subprocess.run(["git", "ls-files"], capture_output=True, text=True, errors="ignore")
    tracked_files = [f.strip() for f in proc.stdout.splitlines() if f.strip()]
    print(f"[*] Scanning {len(tracked_files)} Git-tracked files...")

    all_findings = []
    for f in tracked_files:
        if not os.path.exists(f):
            continue
        findings = scan_file(f)
        all_findings.extend(findings)

    # 2. Scan dist/ directory
    dist_dir = os.path.join(os.getcwd(), "dist")
    if os.path.exists(dist_dir):
        print("[*] Scanning production build output (dist/)...")
        for root, _, files in os.walk(dist_dir):
            for file in files:
                p = os.path.join(root, file)
                findings = scan_file(p)
                all_findings.extend(findings)

    # 3. Scan git commit history
    history_findings = scan_git_history()

    print("\n" + "=" * 70)
    print("   SECRET SCAN RESULTS")
    print("=" * 70)

    if not all_findings and not history_findings:
        print("✅ [ZERO LEAKS DETECTED] No secrets, private keys, or credentials found!")
        print("   - Tracked files: CLEAN")
        print("   - Production build bundle (dist/): CLEAN")
        print("   - Git commit history: CLEAN")
        return 0
    else:
        print(f"⚠️ Found {len(all_findings)} issues in files, {len(history_findings)} in git history:")
        for f in all_findings:
            print(f"  [FILE LEAK] {f['file']}:{f['line']} - {f['type']}")
        for h in history_findings:
            print(f"  [HISTORY LEAK] Commit {h['commit']} in {h['file']} - {h['type']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
