# 🎓 CounselorPro

<div align="center">

![CounselorPro Banner](https://img.shields.io/badge/CounselorPro-Web%20Options%20Simulator-009E60?style=for-the-badge&logo=compass&logoColor=white)

**Intelligent Engineering & State Admissions Web Options Counselling Practice Platform**

[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion-Framer_Motion_v12-black?style=flat-square&logo=framer&logoColor=white)](https://motion.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Verified Data](https://img.shields.io/badge/Verified_Government_Cutoffs-2%2C818_Records-009E60?style=flat-square&logo=checkmarx&logoColor=white)](https://apsche.ap.gov.in/)

</div>

---

## 📌 Overview

**CounselorPro** helps students practice college web options and choice filling before official admissions begin. Selecting and sequencing options during engineering admissions (**AP EAPCET**, **TG EAPCET**, and **JEE Main JoSAA NITs**) can be overwhelming; minor priority mistakes or misunderstandings about local vs. unreserved quotas frequently lead to suboptimal allotments.

CounselorPro provides a realistic, safe sandbox where candidates can:
1. Enter their entrance exam rank, category, gender, and local eligibility area.
2. Search, filter, and compare accredited colleges and branches side by side.
3. Build, drag-and-drop, and reorder their option priority sequence.
4. Test choices against verified historical government cutoff boundaries.
5. Practice simulated JoSAA choice filling across all 31 National Institutes of Technology (NITs).
6. Understand post-allotment willingness options (**Freeze, Float, and Slide**) through an interactive learning centre.
7. Download and print official-formatted option entry slips in PDF and TXT.

> **Disclaimer:** CounselorPro is a student practice tool. Comparisons use official historical cutoff benchmarks to guide option ordering and do not guarantee current or future seat allotment.

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

### 3. ✨ Tactile UI/UX & Motion Design
- **Snappy Spring Physics:** Reusable `<MotionButton>` component with spring press and hover physics (`whileHover={{ y: -2, scale: 1.02 }}`, `whileTap={{ scale: 0.95 }}`).
- **Tactile Feedback:** Subtle light-sweep shimmer hover effect and click ripple pulse on primary Emerald CTAs.
- **Smooth Page Transitions:** Seamless 0.25s fade + upward slide transitions (`<AnimatePresence mode="wait">`) across all wizard steps.
- **Animated Selection Indicators:** Smooth `layoutId` indicator gliding between exam tabs (AP, TG, JEE) and stream switchers (MPC, BiPC).
- **Staggered Card Cascades:** College and program search results cascade smoothly with `staggerChildren: 0.035`.
- **Live Priority List Reordering:** Framer Motion `layout` animations ensure surrounding choices slide smoothly when options are added, deleted, or moved Up/Down.
- **Celebratory Confetti:** Zero-dependency canvas-based celebratory particle burst upon mock allotment and choice locking.
- **Accessibility:** Strictly GPU-accelerated (`transform`, `opacity`) with full support for `prefers-reduced-motion`.

---

## 📊 Dataset Breakdown

All college records and cutoffs are authentic government-published statements:

| Examination | Stream | Source Year | Course Records | Official Publishing Authority |
| :--- | :---: | :---: | :---: | :--- |
| **AP EAPCET** | MPC | 2025 | **1,468** | APSCHE Final Phase Last Rank Statement |
| **AP EAPCET** | BiPC | 2024 | **219** | APSCHE BiPC Final Phase Statement |
| **TG EAPCET** | MPC | 2025 | **942** | TGCHE / TSCHE Final Phase Last Rank Statement |
| **TG EAPCET** | BiPC | 2025 | **189** | TGCHE BiPC Final Phase Statement |
| **JEE Main (JoSAA)** | B.Tech | 2025 | **237** | Council of NITSER & JoSAA Official Seat Information |
| **Total Verified State Records** | — | — | **2,818** | **Zero synthetic or hallucinated cutoffs** |

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
  - **Verification:** Python 3 & TypeScript test suites

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Python 3 (for running admission verification test suites)

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

CounselorPro includes automated verification suites to guarantee cutoff integrity and admission logic compliance:

```bash
# 1. Type checking and linting
npm run lint

# 2. State admission logic test suite (AU/SVU local areas, SC subcategories, gender quotas)
python scripts/test_admission_logic.py

# 3. JEE Main JoSAA NIT test suite (31 NITs, 50:50 HS/OS quotas, choice ordering)
npx tsx scripts/test_jee_counselling_logic.ts

# 4. Production build validation (static generator + Vite + esbuild bundle)
npm run build
```

---

## 📁 Project Structure

```
CounselorPro/
├── public/
│   └── data/                       # Verified versioned government cutoff datasets
│       ├── AP_EAPCET_MPC_2025.json
│       ├── AP_EAPCET_BIPC_2024.json
│       ├── TS_EAMCET_MPC_2025.json
│       └── TS_EAMCET_BIPC_2025.json
├── scripts/
│   ├── audit_datasets.py           # Integrity checker for cutoff datasets
│   ├── generate-static-data.ts     # Static pre-bundle dataset validator
│   ├── test_admission_logic.py     # State admission rule unit tests
│   └── test_jee_counselling_logic.ts # JoSAA NIT counselling unit tests
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx         # Responsive hero & features introduction
│   │   ├── ExamSelector.tsx        # Exam & stream selector with layout animations
│   │   ├── ProfileForm.tsx         # AP / TG candidate profile configuration
│   │   ├── OptionEntry.tsx         # Two-panel choice-filling workspace & comparison hub
│   │   ├── FinalReview.tsx         # Option review, 1.2s scanner, and mock allotment reveal
│   │   ├── SuccessScreen.tsx       # Completion screen with summary & slip exports
│   │   ├── jee/
│   │   │   ├── JeeProfileForm.tsx  # Class XII State Code of Eligibility profile
│   │   │   ├── JeeOptionEntry.tsx  # 31 NIT choice filling with HS/OS badges
│   │   │   ├── JeeReviewLock.tsx   # Practice choice locking & locked PDF download
│   │   │   └── JeeLearningCentre.tsx # Freeze, Float & Slide educational modal
│   │   └── ui/
│   │       ├── MotionButton.tsx    # Tactile spring button with shimmer & ripple
│   │       ├── Confetti.tsx        # Zero-dependency canvas celebratory confetti
│   │       ├── MockAllotmentScanner.tsx # 1.2s rank-matching animated scanner
│   │       └── ProbabilityBadge.tsx # Soft scale admission chance badge with tooltip
│   ├── data/
│   │   ├── colleges.ts             # State colleges data loader & probability math
│   │   └── jeeNitCatalog.ts        # 31 NITs catalogue & 50:50 quota determination
│   ├── types.ts                    # TypeScript interface definitions
│   ├── App.tsx                     # Top-level wizard controller & state persistence
│   └── index.css                   # Tailwind CSS v4 & custom keyframes
├── server.ts                       # Production Express SSR / asset server
├── vite.config.ts                  # Vite build configuration
└── package.json
```

---

## 📜 License

This project is created for educational and counselling practice purposes.
All institutional names and government cutoff data belong to their respective statutory authorities (APSCHE, TGCHE, Council of NITSER, and JoSAA).
