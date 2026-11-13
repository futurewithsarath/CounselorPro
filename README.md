# 🎓 CounselorPro

<div align="center">

![CounselorPro Banner](https://img.shields.io/badge/CounselorPro-Web%20Options%20Simulator-009E60?style=for-the-badge&logo=compass&logoColor=white)

**Intelligent Engineering & Medical Admissions Web Options Counselling Practice Platform**

[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion-Framer_Motion_v12-black?style=flat-square&logo=framer&logoColor=white)](https://motion.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Verified Data](https://img.shields.io/badge/Verified_Government_Records-3%2C890_Records-009E60?style=flat-square&logo=checkmarx&logoColor=white)](https://apsche.ap.gov.in/)

</div>

---

## 📌 Overview

**CounselorPro** empowers students to practice college web options and choice filling before participating in official government admissions. Selecting and sequencing options during engineering and medical admissions (**AP EAPCET**, **TG EAPCET**, **JEE Main JoSAA NITs**, and **NEET UG Medical/Dental/AYUSH**) can be overwhelming; minor priority mistakes, quota misunderstandings, or domicile errors frequently lead to suboptimal seat allotments.

CounselorPro provides a realistic, safe sandbox where candidates can:
1. Enter their entrance exam rank, score, category, gender, and local eligibility area.
2. Search, filter, and compare accredited colleges and branches side by side with real-time state filtering.
3. Build, drag-and-drop, and reorder their option priority sequence.
4. Test choices against verified historical government cutoff boundaries.
5. Practice simulated JoSAA choice filling across all 31 National Institutes of Technology (NITs).
6. Experience multi-authority medical counselling (**MCC All India**, **Dr. YSRUHS AP**, **KNRUHS Telangana**, and **AACCC AYUSH**).
7. Download and print official-formatted option entry slips in **vector PDF** and TXT format with cryptographic session verification.
8. Understand post-allotment willingness rules (**Freeze, Float, and Slide**) through interactive learning guides.

> **Disclaimer:** CounselorPro is a student counselling practice tool. Comparisons use official historical cutoff benchmarks to guide option ordering and do not guarantee current or future seat allotment.

---

## 🚀 Key Modules & Capabilities

### 1. 🏛️ AP EAPCET & TG EAPCET Counselling Simulator
- **100% Authentic Government Data:** 2,818 verified college-branch cutoff records extracted directly from official APSCHE and TGCHE final phase last rank statements.
- **Official Reservation & Local Area Engines:**
  - **Andhra Pradesh (Article 371-D):** Strictly isolates cutoffs by local university regions (**AU** - Andhra University area vs. **SVU** - Sri Venkateswara University area). Non-local cutoffs are strictly respected and never cross-pollinated.
  - **Telangana (G.O.Ms. 15):** Enforces 85% Osmania University (**OU**) local quota and 15% unreserved quota.
  - **Tripartite SC Classifications:** Accurate handling of SC subcategories (**SC-I, SC-II, SC-III**) for Telangana and AP MPC, and unified SC for AP BiPC.
  - **Gender Equity & Women's Quotas:** Female candidates are eligible for both Girls and Boys/General seats; male candidates are blocked from women-only colleges.
- **4-Tier Probability Engine:** Ranks are matched against closing cutoffs and categorized into **High Chance**, **Moderate Chance**, **Reach / Competitive**, **Low Chance**, or **No Historical Cutoff Data**.
- **Mock Allotment Simulator:** 1.2-second rank-matching scan bar verifying category, gender, and regional eligibility, followed by a celebratory card reveal and confetti burst for allotted choices.

---

### 2. 🎯 JEE Main (JoSAA NIT) Counselling Practice Module
- **31 National Institutes of Technology (NITs):** Complete catalogue covering all 31 NITs (JoSAA codes 201 to 231) and standard 4-year B.Tech programmes.
- **JoSAA State Code of Eligibility Engine:**
  - Accurately determined strictly by the State/UT where the candidate completed **Class XII** (qualifying exam), per JoSAA Business Rules.
  - Automatically calculates whether an NIT choice falls under **50% Home State (HS) Quota** or **50% Other State (OS) Quota**.
- **Two Practice Modes:**
  - **Guided Practice:** Explore institutes, build preferences, and practice choice locking freely without needing rank numbers.
  - **Profile-Based Practice:** Input CRL / Category rank for personalised context during preference sequencing.
- **Interactive JoSAA Learning Centre:**
  - Interactive scenario walkthrough explaining **Freeze, Float, and Slide** post-allotment willingness rules.
  - Explanations of 50:50 Home State quota rules, supernumerary female seats, and mandatory post-allotment document verification steps.
- **Practice Choice Locking:** Simulation of JoSAA choice locking with unique session ID generation, confirmation dialogs, and downloadable preference slips.

---

### 3. 🩺 NEET UG Medical & AYUSH Counselling Module
- **Official Government Datasets Extracted:**
  - **MCC UG 2026 Round 1 Seat Matrix:** Extracted from DGHS/MCC Notice *Ref. U-12021/02/2026-MEC* across 25 table pages — **724 verified counselling records** (602 MBBS, 114 BDS, 8 B.Sc. Nursing across 605 institutes, 33 States/UTs, 24 Quotas).
  - **NMC MBBS Seat Matrix AY 2025–26:** Extracted from National Medical Commission Public Notice *No. C DN-200 I | 1335 12025-CDN-NMC* across 47 table pages — **819 approved medical colleges** with **128,925 approved seats** (S.No 1 to 819 strictly contiguous, zero missing entries).
  - **Unified Active Catalog:** **835 verified medical, dental, and AYUSH colleges** across India.
- **Multi-Authority Counselling Architecture:**
  - **MCC (Medical Counselling Committee):** 15% All India Quota (AIQ), 100% seats in all **AIIMS** (AIIMS New Delhi, Bhopal, Bhubaneswar, Jodhpur, Mangalagiri, Bibinagar, Rishikesh, Raipur, Patna, etc.), **JIPMER** Puducherry & Karaikal, **Central Universities** (DU MAMC/LHMC/UCMS, IMS-BHU, JNMC AMU, Jamia Millia Islamia), and premier **Deemed Universities** (GITAM, KMC Manipal, Hamdard, Sri Ramachandra, Amrita, DY Patil).
  - **Dr. YSRUHS (Andhra Pradesh):** 85% Competent Authority Quota (CQ) partitioned strictly by **AU Area** and **SVU Area**, plus Category B Management Quota (MQ) for private medical colleges.
  - **KNRUHS (Telangana):** 85% State Quota (OU Local Area) + 15% Unreserved Quota under G.O.Ms. 114 & G.O.Ms. 72, plus Management Quota & Minority Medical Colleges (Deccan, Shadan).
  - **AACCC (Ministry of Ayush):** 15% All India Quota & 100% National Autonomous Institutes in **BAMS** (National Institute of Ayurveda Jaipur, All India Institute of Ayurveda Delhi), **BHMS** (National Institute of Homoeopathy Kolkata), and **BUMS** (National Institute of Unani Medicine Bangalore).
- **Quota Preservation Architecture:**
  - Strictly preserves 104 multi-quota institutions without artificial pre-summing of program intake or merging of quota rows (e.g. GITAM Institute of Medical Sciences retains distinct records for *Non-Resident Indian* [23 seats] and *Self-Financed Merit* [127 seats] under Total Intake 150).
- **State-Wise College Filtering Bug Fix:**
  - **Canonical State Normalizer (`normalizeIndianState`):** All 36 Indian States and UTs normalized across datasets.
  - **Dedicated State Filter Dropdown:** All 34 states/UTs with dynamic college counts (e.g., `Andhra Pradesh (64 options)`, `Telangana (112 options)`, `Karnataka (71 options)`, `Maharashtra (95 options)`).
  - **Quick State Chips:** Instant one-click filter pills for `All India`, the candidate's Home Domicile state (`★ Domicile`), and top medical hubs.
  - **Domicile Isolation:** Candidate domicile state is kept strictly isolated from the college geographical location browser.
- **Statutory Eligibility & Safeguard Engine:**
  - **Class 12th PCB Aggregate Check:** Enforces NMC statutory minimums (>= 50% for UR/EWS, >= 40% for OBC/SC/ST, >= 45% for PwD) with real-time feedback.
  - **Gender Safeguards:** Enforces female-only admission criteria for colleges like LHMC New Delhi.
  - **Domicile Enforcement:** Verifies state domicile boundaries for AP and Telangana 85% Competent Authority Quota seats.
- **Interactive NEET Learning Centre:** Comprehensive guide covering MCC Free Exit vs Forfeiture rules in Round 1/2, Round 3 strict locking, stray vacancy debarment rules, state bond policies (₹3,00,000 bond penalty), and security deposit refund tables.

---

### 4. 📄 Download Complete Preference List as PDF (New Feature)
- **Reusable Vector PDF Engine:** Built with `jspdf` and `jspdf-autotable` in [`src/utils/neetPdfExport.ts`](src/utils/neetPdfExport.ts).
- **Multi-Page Table Auto-Continuation:** Automatically handles multi-page choice lists with repeated column headers on every page (`showHead: 'everyPage'`), running headers with candidate AIR/Category, and `Page X of Y` footers.
- **Strict Preference Order Preservation:** Guarantees all choices (1 to N) are included without pagination truncation, post-sort reordering, or dropped rows.
- **Draft vs. Locked Modes:**
  - **Draft Mode:** Branded as `PRACTICE SESSION DRAFT` with export timestamp and uncommitted status.
  - **Locked Mode:** Branded as `OFFICIAL PRACTICE LOCKED LIST` with cryptographic Session ID (`NEET-PRACTICE-XXXXXX`), lock timestamp, and verification badge.
- **Statutory Disclaimer:** Mandated legal text ensuring students understand this is an educational counselling simulation for personal reference.
- **Omnipresent Download Buttons:** Accessible in the Final Choice Review page, Completed Practice Session page, and Option Entry workspace.

---

### 5. ✨ Tactile UI/UX & Motion Design
- **Snappy Spring Physics:** Reusable `<MotionButton>` component with spring press and hover physics (`whileHover={{ y: -2, scale: 1.02 }}`, `whileTap={{ scale: 0.95 }}`).
- **Tactile Feedback:** Subtle light-sweep shimmer hover effect and click ripple pulse on primary Emerald CTAs.
- **Smooth Page Transitions:** Seamless 0.25s fade + upward slide transitions (`<AnimatePresence mode="wait">`) across all wizard steps.
- **Animated Selection Indicators:** Smooth `layoutId` indicator gliding between exam tabs (AP, TG, JEE, NEET) and stream switchers (MPC, BiPC).
- **Staggered Card Cascades:** College and program search results cascade smoothly with `staggerChildren: 0.035`.
- **Live Priority List Reordering:** Framer Motion `layout` animations ensure surrounding choices slide smoothly when options are added, deleted, or moved Up/Down.
- **Celebratory Confetti:** Zero-dependency canvas-based celebratory particle burst upon mock allotment and choice locking.
- **Accessibility:** Strictly GPU-accelerated (`transform`, `opacity`) with full support for `prefers-reduced-motion`.

---

## 📊 Dataset Breakdown

All college records and cutoffs are authentic government-published statements:

| Examination | Stream / Degree | Source Year | Course / Quota Records | Official Publishing Authority |
| :--- | :---: | :---: | :---: | :--- |
| **AP EAPCET** | MPC (Engineering) | 2025 | **1,468** | APSCHE Final Phase Last Rank Statement |
| **AP EAPCET** | BiPC (Pharmacy/Biotech) | 2024 | **219** | APSCHE BiPC Final Phase Statement |
| **TG EAPCET** | MPC (Engineering) | 2025 | **942** | TGCHE / TSCHE Final Phase Last Rank Statement |
| **TG EAPCET** | BiPC (Pharmacy/Biotech) | 2025 | **189** | TGCHE BiPC Final Phase Statement |
| **JEE Main (JoSAA)** | B.Tech (NITs) | 2025 | **237** | Council of NITSER & JoSAA Official Seat Information |
| **NEET UG (MCC AIQ)** | MBBS / BDS / B.Sc. Nursing | 2026 | **724** | MCC / DGHS Tentative Seat Matrix (Ref. U-12021/02/2026-MEC) |
| **NEET UG (NMC)** | MBBS Regulatory Intake | 2025–26 | **819** | National Medical Commission (No. C DN-200 I \| 1335 12025-CDN-NMC) |
| **NEET UG (Catalog)** | MBBS / BDS / AYUSH Active | 2025–26 | **835** | MCC + Dr. YSRUHS + KNRUHS + AACCC Verified Registry |
| **Total Verified Records** | — | — | **3,890** | **Zero synthetic, simulated or hallucinated cutoffs** |

---

## 🛠️ Technology Stack

- **Frontend:**
  - **Framework:** [React 19](https://react.dev/)
  - **Language:** [TypeScript](https://www.typescriptlang.org/)
  - **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
  - **Animations & Micro-Interactions:** [Motion v12 (Framer Motion)](https://motion.dev/)
  - **Icons:** [Lucide React](https://lucide.dev/)
  - **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
  - **Build Tool:** [Vite 6](https://vitejs.dev/)
- **Backend & Scripts:**
  - **Server:** Node.js, Express, compression
  - **Tooling:** `tsx`, `esbuild`
  - **PDF Data Extraction:** Python 3, `PyMuPDF` (`fitz`)
  - **Verification:** Python 3 & TypeScript test suites

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Python 3 (with `PyMuPDF` for PDF data extraction and audit scripts)

### 1. Clone the Repository
```bash
git clone https://github.com/futurewithsarath/CounselorPro.git
cd CounselorPro
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables (Optional)
If using the Gemini AI assistance features, set your API key in `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Automated Testing

CounselorPro includes automated verification suites to guarantee cutoff integrity, quota preservation, and admission logic compliance:

```bash
# 1. Type checking and linting
npm run lint

# 2. State admission logic test suite (AU/SVU local areas, SC subcategories, gender quotas)
python scripts/test_admission_logic.py

# 3. JEE Main JoSAA NIT test suite (31 NITs, 50:50 HS/OS quotas, choice ordering)
npx tsx scripts/test_jee_counselling_logic.ts

# 4. NEET UG medical counselling test suite (61 test cases: MCC, NMC, quotas, state filter, PCB)
npx tsx scripts/test_neet_counselling_logic.ts

# 5. NEET PDF preference list export test suite (multi-page, repeated headers, binary output)
npx tsx scripts/test_neet_pdf_export.ts

# 6. Production build validation (static generator + Vite + esbuild bundle)
npm run build
```

---

## 📁 Project Structure

```
CounselorPro/
├── public/
│   └── data/                           # Verified versioned government cutoff datasets
│       ├── AP_EAPCET_MPC_2025.json
│       ├── AP_EAPCET_BIPC_2024.json
│       ├── TS_EAMCET_MPC_2025.json
│       ├── TS_EAMCET_BIPC_2025.json
│       ├── NEET_UG_2024_2025.json      # Unified 835 active medical/AYUSH college catalog
│       ├── NEET_UG_2026_ROUND1_MCC.json # Official 724 MCC Round 1 seat matrix records
│       └── NMC_MBBS_2025_2026.json     # Official 819 NMC approved medical colleges
├── scripts/
│   ├── extract_neet_pdfs.py            # High-precision vector PDF extraction for MCC & NMC
│   ├── build_neet_catalog.py           # Catalog builder & state canonicalizer
│   ├── generate-static-data.ts         # Static pre-bundle dataset validator
│   ├── test_admission_logic.py         # State admission rule unit tests (AP & TG)
│   ├── test_jee_counselling_logic.ts   # JoSAA NIT counselling unit tests
│   ├── test_neet_counselling_logic.ts  # NEET UG medical counselling unit tests (61 tests)
│   └── test_neet_pdf_export.ts         # Automated PDF multi-page generation tests
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx             # Responsive hero & features introduction
│   │   ├── ExamSelector.tsx            # Exam & stream selector with layout animations
│   │   ├── ProfileForm.tsx             # AP / TG candidate profile configuration
│   │   ├── OptionEntry.tsx             # Two-panel choice-filling workspace & comparison hub
│   │   ├── FinalReview.tsx             # Option review, 1.2s scanner, and mock allotment reveal
│   │   ├── SuccessScreen.tsx           # Completion screen with summary & slip exports
│   │   ├── AdminModal.tsx              # Administrator synchronization console
│   │   ├── jee/
│   │   │   ├── JeeProfileForm.tsx      # Class XII State Code of Eligibility profile
│   │   │   ├── JeeOptionEntry.tsx      # 31 NIT choice filling with HS/OS badges
│   │   │   ├── JeeReviewLock.tsx       # Practice choice locking & locked PDF download
│   │   │   └── JeeLearningCentre.tsx   # Freeze, Float & Slide educational modal
│   │   ├── neet/
│   │   │   ├── NeetProfileForm.tsx     # NEET AIR, score, category & PCB eligibility
│   │   │   ├── NeetOptionEntry.tsx     # Multi-authority choice filling & state filtering
│   │   │   ├── NeetReviewLock.tsx      # NEET mock allotment scanner, locking & PDF export
│   │   │   └── NeetLearningCentre.tsx  # MCC, YSRUHS, KNRUHS & AACCC rules guide
│   │   └── ui/
│   │       ├── MotionButton.tsx        # Tactile spring button with shimmer & ripple
│   │       ├── Confetti.tsx            # Zero-dependency canvas celebratory confetti
│   │       ├── MockAllotmentScanner.tsx # 1.2s rank-matching animated scanner
│   │       └── ProbabilityBadge.tsx    # Soft scale admission chance badge with tooltip
│   ├── data/
│   │   ├── colleges.ts                 # State colleges data loader & probability math
│   │   ├── jeeNitCatalog.ts            # 31 NITs catalogue & 50:50 quota determination
│   │   └── neetCatalog.ts              # 835 verified NEET medical & AYUSH records
│   ├── utils/
│   │   └── neetPdfExport.ts            # Multi-page vector PDF generation engine
│   ├── types.ts                        # TypeScript interface definitions
│   ├── App.tsx                         # Top-level wizard controller & state persistence
│   └── index.css                       # Tailwind CSS v4 & custom keyframes
├── server.ts                           # Production Express SSR / asset server
├── vite.config.ts                      # Vite build configuration
└── package.json
```

---

## 📜 License

This project is created for educational and counselling practice purposes.
All institutional names, seat matrices, and government cutoff data belong to their respective statutory authorities (APSCHE, TGCHE, Council of NITSER, JoSAA, MCC/DGHS, and NMC).
