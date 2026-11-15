import os
from PIL import Image

SOURCE_PNG = r"C:\Users\user\.gemini\antigravity\brain\67007c35-f754-4aa3-9250-6c9ba8749586\.user_uploaded\media_1794719578099_350295c0.png"
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
PUBLIC_DIR = os.path.abspath(PUBLIC_DIR)

os.makedirs(PUBLIC_DIR, exist_ok=True)

print(f"Loading master logo from: {SOURCE_PNG}")
master_img = Image.open(SOURCE_PNG).convert("RGBA")
print(f"Master image size: {master_img.size}, mode: {master_img.mode}")

# 1. Save master logo
logo_path = os.path.join(PUBLIC_DIR, "logo.png")
master_img.save(logo_path, format="PNG", optimize=True)
print(f"Saved: {logo_path} ({os.path.getsize(logo_path)} bytes)")

# 2. Generate PNG favicon sizes
sizes = {
    "favicon-16x16.png": (16, 16),
    "favicon-32x32.png": (32, 32),
    "favicon-48x48.png": (48, 48),
    "favicon-64x64.png": (64, 64),
    "favicon-128x128.png": (128, 128),
    "favicon-256x256.png": (256, 256),
    "apple-touch-icon.png": (180, 180),
    "pwa-192x192.png": (192, 192),
    "pwa-512x512.png": (512, 512),
    "android-chrome-192x192.png": (192, 192),
    "android-chrome-512x512.png": (512, 512),
}

for filename, (w, h) in sizes.items():
    resized = master_img.resize((w, h), Image.Resampling.LANCZOS)
    out_path = os.path.join(PUBLIC_DIR, filename)
    resized.save(out_path, format="PNG", optimize=True)
    print(f"Saved: {filename} ({w}x{h}) -> {os.path.getsize(out_path)} bytes")

# 3. Generate multi-resolution favicon.ico
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")

master_img.save(
    ico_path,
    format="ICO",
    sizes=ico_sizes,
)
print(f"Saved: favicon.ico with resolutions {ico_sizes} -> {os.path.getsize(ico_path)} bytes")

# Verify all files
all_expected = list(sizes.keys()) + ["logo.png", "favicon.ico"]
all_ok = True
for f in all_expected:
    p = os.path.join(PUBLIC_DIR, f)
    if os.path.exists(p) and os.path.getsize(p) > 0:
        print(f"  [OK] {f} exists ({os.path.getsize(p)} bytes)")
    else:
        print(f"  [FAIL] {f} is missing or empty!")
        all_ok = False

if all_ok:
    print("\nSUCCESS: All official CounselorPro brand logo and favicon assets generated successfully!")
else:
    print("\nERROR: Some assets failed generation.")
