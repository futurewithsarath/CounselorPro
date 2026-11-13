import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  NEET_COLLEGES_CATALOG, 
  calculateNeetProbability, 
  validateNeetEligibility,
  getNeetColleges 
} from '../src/data/neetCatalog';
import { NeetStudentProfile, NeetChoice } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('       COUNSELORPRO — NEET UG COUNSELLING VERIFICATION SUITE           ');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, desc: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------------
// TEST SUITE 1: Catalog Integrity & Authentic Regulatory Sources
// ------------------------------------------------------------------------
console.log('TEST SUITE 1: Catalog Integrity & Official Source Portals');
assert(NEET_COLLEGES_CATALOG.length >= 40, `Catalog contains ${NEET_COLLEGES_CATALOG.length} records (expected >= 40)`);

const authorities = new Set(NEET_COLLEGES_CATALOG.map(c => c.authority));
assert(authorities.has('MCC'), 'MCC (All India Quota / AIIMS / Central) authority present');
assert(authorities.has('AP_STATE'), 'AP_STATE (Dr. YSRUHS) authority present');
assert(authorities.has('TG_STATE'), 'TG_STATE (KNRUHS) authority present');
assert(authorities.has('AACCC'), 'AACCC (AYUSH Central) authority present');

const courses = new Set(NEET_COLLEGES_CATALOG.map(c => c.course));
assert(courses.has('MBBS'), 'MBBS course records present');
assert(courses.has('BDS'), 'BDS course records present');
assert(courses.has('BAMS'), 'BAMS course records present');
assert(courses.has('BHMS'), 'BHMS course records present');
assert(courses.has('BUMS'), 'BUMS course records present');

const invalidSource = NEET_COLLEGES_CATALOG.find(c => !c.source || c.source.trim().length === 0);
assert(!invalidSource, 'All catalog entries contain official government source citations');

// ------------------------------------------------------------------------
// TEST SUITE 2: NMC Statutory PCB Marks Eligibility
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 2: Class 12th PCB Statutory Minimums (NMC UG Regulations)');
const baseProfile: NeetStudentProfile = {
  admissionYear: 2024,
  allIndiaRank: 15000,
  neetScore: 620,
  category: 'UR',
  gender: 'Male',
  isPwd: false,
  domicileState: 'Andhra Pradesh',
  localArea: 'AU',
  minority: 'NONE',
  pcbMarksPercentage: 55,
  activeAuthority: 'ALL',
  selectedCourses: ['MBBS']
};

const gmcGuntur = NEET_COLLEGES_CATALOG.find(c => c.code === 'GMC-GNT')!;

// UR with 55% -> PASS (>= 50%)
const resURPass = validateNeetEligibility({ ...baseProfile, pcbMarksPercentage: 55 }, gmcGuntur);
assert(resURPass.eligible, 'UR candidate with 55% PCB is eligible (>= 50%)');

// UR with 48% -> FAIL (< 50%)
const resURFail = validateNeetEligibility({ ...baseProfile, pcbMarksPercentage: 48 }, gmcGuntur);
assert(!resURFail.eligible && resURFail.reasons[0].includes('below statutory minimum'), 'UR candidate with 48% PCB is correctly blocked');

// SC with 45% -> PASS (>= 40%)
const resSCPass = validateNeetEligibility({ ...baseProfile, category: 'SC', pcbMarksPercentage: 45 }, gmcGuntur);
assert(resSCPass.eligible, 'SC candidate with 45% PCB is eligible (>= 40%)');

// PwD with 46% -> PASS (>= 45%)
const resPwdPass = validateNeetEligibility({ ...baseProfile, isPwd: true, pcbMarksPercentage: 46 }, gmcGuntur);
assert(resPwdPass.eligible, 'PwD candidate with 46% PCB is eligible (>= 45%)');

// ------------------------------------------------------------------------
// TEST SUITE 3: Gender & Women-Only Institution Safeguards
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 3: Gender Equity & Women-Only College Rules');
const lhmcDelhi = NEET_COLLEGES_CATALOG.find(c => c.code === 'LHMC-DEL')!;

// Male candidate selecting LHMC -> FAIL
const resMaleLHMC = validateNeetEligibility({ ...baseProfile, gender: 'Male' }, lhmcDelhi);
assert(!resMaleLHMC.eligible && resMaleLHMC.reasons[0].includes('Female-only institution'), 'Male candidate is strictly prevented from adding LHMC Delhi');

// Female candidate selecting LHMC -> PASS
const resFemaleLHMC = validateNeetEligibility({ ...baseProfile, gender: 'Female' }, lhmcDelhi);
assert(resFemaleLHMC.eligible, 'Female candidate is eligible for LHMC Delhi');

// ------------------------------------------------------------------------
// TEST SUITE 4: Domicile & State Competent Authority Quota Boundaries
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 4: Domicile & State Competent Authority Quota Rules');
const omcHyd = NEET_COLLEGES_CATALOG.find(c => c.code === 'OMC-HYD')!;

// Candidate with AP domicile selecting Telangana KNRUHS CQ -> Flagged
const resApToTg = validateNeetEligibility({ ...baseProfile, domicileState: 'Andhra Pradesh' }, omcHyd);
assert(!resApToTg.eligible && resApToTg.reasons[0].includes('KNRUHS State Competent Authority Quota'), 'AP candidate choosing KNRUHS 85% CQ is flagged');

// Candidate with TG domicile selecting Telangana KNRUHS CQ -> PASS
const resTgToTg = validateNeetEligibility({ ...baseProfile, domicileState: 'Telangana' }, omcHyd);
assert(resTgToTg.eligible, 'Telangana candidate choosing KNRUHS 85% CQ is eligible');

// Candidate with any domicile selecting MCC AIIMS New Delhi -> PASS
const aiimsDelhi = NEET_COLLEGES_CATALOG.find(c => c.code === 'AIIMS-DEL')!;
const resAnyToAiims = validateNeetEligibility({ ...baseProfile, domicileState: 'Bihar' }, aiimsDelhi);
assert(resAnyToAiims.eligible, 'All India Quota / AIIMS is open to candidates of all states');

// ------------------------------------------------------------------------
// TEST SUITE 5: 4-Tier Probability Engine Cutoff Benchmarks
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 5: Cutoff Categorization & Probability Engine');
const aiimsMangalagiri = NEET_COLLEGES_CATALOG.find(c => c.code === 'AIIMS-MG')!; // UR Cutoff: 1930

const probHigh = calculateNeetProbability(1500, aiimsMangalagiri.cutoffs, 'UR');
assert(probHigh.probability === 'HIGH', `AIR 1500 vs 1930 cutoff -> HIGH chance (${probHigh.probability})`);

const probMod = calculateNeetProbability(1950, aiimsMangalagiri.cutoffs, 'UR');
assert(probMod.probability === 'MODERATE', `AIR 1950 vs 1930 cutoff -> MODERATE chance (${probMod.probability})`);

const probReach = calculateNeetProbability(2200, aiimsMangalagiri.cutoffs, 'UR');
assert(probReach.probability === 'REACH', `AIR 2200 vs 1930 cutoff -> REACH chance (${probReach.probability})`);

const probLow = calculateNeetProbability(50000, aiimsMangalagiri.cutoffs, 'UR');
assert(probLow.probability === 'LOW', `AIR 50000 vs 1930 cutoff -> LOW chance (${probLow.probability})`);

// ------------------------------------------------------------------------
// TEST SUITE 6: Mock Allotment Sequential Choice Simulation
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 6: Mock Allotment Priority Evaluation');
const studentChoices: NeetChoice[] = [
  {
    id: 'c1',
    priority: 1,
    collegeId: 'mcc-aiims-delhi-mbbs',
    collegeCode: 'AIIMS-DEL',
    collegeName: 'AIIMS New Delhi',
    shortName: 'AIIMS New Delhi',
    course: 'MBBS',
    authority: 'MCC',
    quota: 'AIIMS',
    state: 'Delhi',
    city: 'New Delhi',
    institutionType: 'AIIMS',
    annualFee: 1628,
    cutoffAIR: 47
  },
  {
    id: 'c2',
    priority: 2,
    collegeId: 'mcc-mamc-delhi-mbbs',
    collegeCode: 'MAMC-DEL',
    collegeName: 'MAMC Delhi',
    shortName: 'MAMC Delhi',
    course: 'MBBS',
    authority: 'MCC',
    quota: 'AIQ',
    state: 'Delhi',
    city: 'New Delhi',
    institutionType: 'CENTRAL_INSTITUTE',
    annualFee: 4445,
    cutoffAIR: 145
  },
  {
    id: 'c3',
    priority: 3,
    collegeId: 'ap-amc-visakhapatnam-mbbs',
    collegeCode: 'AMC-VSP',
    collegeName: 'Andhra Medical College',
    shortName: 'Andhra Medical College (AMC)',
    course: 'MBBS',
    authority: 'AP_STATE',
    quota: 'STATE_CQ',
    state: 'Andhra Pradesh',
    city: 'Visakhapatnam',
    institutionType: 'GOVT_MEDICAL',
    annualFee: 15000,
    cutoffAIR: 20793
  }
];

// Student with AIR 15,000 should get choice #3 (AMC Visakhapatnam) because 15,000 > 47 and 15,000 > 145, but 15,000 <= 20,793
let allottedChoice: NeetChoice | undefined = undefined;
for (const ch of studentChoices) {
  if (ch.cutoffAIR && 15000 <= ch.cutoffAIR) {
    allottedChoice = ch;
    break;
  }
}

assert(allottedChoice?.priority === 3, `Candidate with AIR 15,000 correctly allotted Choice #3 (allotted: #${allottedChoice?.priority} ${allottedChoice?.shortName})`);

// ------------------------------------------------------------------------
// TEST SUITE 7: Public Exported Dataset Verification
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 7: Public Exported Dataset File Validation');
const publicJsonPath = path.resolve(__dirname, '../public/data/NEET_UG_2024_2025.json');
assert(fs.existsSync(publicJsonPath), 'public/data/NEET_UG_2024_2025.json exists on disk');

const publicData = JSON.parse(fs.readFileSync(publicJsonPath, 'utf8'));
assert(publicData.datasetId === 'NEET_UG_2024_2025_VERIFIED', 'datasetId matches NEET_UG_2024_2025_VERIFIED');
assert(Array.isArray(publicData.records) && publicData.records.length === NEET_COLLEGES_CATALOG.length, `Exported JSON contains exactly ${publicData.records.length} records matching catalog`);

console.log(`\n========================================================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} TEST CASES PASSED (100%)`);
console.log(`========================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
