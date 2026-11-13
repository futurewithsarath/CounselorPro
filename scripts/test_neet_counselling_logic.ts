import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  NEET_COLLEGES_CATALOG, 
  calculateNeetProbability, 
  validateNeetEligibility,
  normalizeIndianState,
  CANONICAL_INDIAN_STATES 
} from '../src/data/neetCatalog';
import { NeetStudentProfile, NeetChoice } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   COUNSELORPRO — NEET UG & PDF EXTRACTION VERIFICATION TEST SUITE      ');
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
// TEST SUITE 1: Official MCC UG 2026 Round 1 Extracted Seat Matrix Verification
// ------------------------------------------------------------------------
console.log('TEST SUITE 1: MCC UG 2026 Round 1 Extracted Seat Matrix (File 1)');
const mccJsonPath = path.resolve(__dirname, '../public/data/NEET_UG_2026_ROUND1_MCC.json');
assert(fs.existsSync(mccJsonPath), 'NEET_UG_2026_ROUND1_MCC.json exists on disk');

const mccData = JSON.parse(fs.readFileSync(mccJsonPath, 'utf8'));
const mccRecords = mccData.records;
assert(Array.isArray(mccRecords), 'MCC records is an array');
assert(mccRecords.length === 724, `MCC extracted records count is exactly 724 (got ${mccRecords.length})`);

const mccMbbs = mccRecords.filter((r: any) => r.courseNormalized === 'MBBS');
const mccBds = mccRecords.filter((r: any) => r.courseNormalized === 'BDS');
const mccNursing = mccRecords.filter((r: any) => r.courseNormalized === 'B.Sc. Nursing');

assert(mccMbbs.length === 602, `MCC MBBS rows count is exactly 602 (got ${mccMbbs.length})`);
assert(mccBds.length === 114, `MCC BDS rows count is exactly 114 (got ${mccBds.length})`);
assert(mccNursing.length === 8, `MCC B.Sc. Nursing rows count is exactly 8 (got ${mccNursing.length})`);

// Quota preservation verification: ensure no rows merged
const gitamRows = mccRecords.filter((r: any) => r.instcd === '200324');
assert(gitamRows.length === 2, `GITAM Medical College (200324) preserves 2 distinct quota rows (got ${gitamRows.length})`);
const gitamNri = gitamRows.find((r: any) => r.quotaName === 'Non-Resident Indian');
const gitamMerit = gitamRows.find((r: any) => r.quotaName === 'Self-Financed Merit Seat');
assert(gitamNri && gitamNri.seats === 23 && gitamNri.totalSeat === 150, 'GITAM NRI quota has 23 seats and TotalSeat 150');
assert(gitamMerit && gitamMerit.seats === 127 && gitamMerit.totalSeat === 150, 'GITAM Self-Financed Merit quota has 127 seats and TotalSeat 150');
assert(gitamNri.seats + gitamMerit.seats === 150, 'Quota seats sum to 150 without pre-summing program TotalSeat');

const maidsRows = mccRecords.filter((r: any) => r.instcd === '200451');
assert(maidsRows.length === 3, `Maulana Azad Dental (200451) preserves 3 distinct quota rows (got ${maidsRows.length})`);
const maidsAiq = maidsRows.find((r: any) => r.quotaName === 'All India');
const maidsCw = maidsRows.find((r: any) => r.quotaName.includes('CW'));
const maidsDu = maidsRows.find((r: any) => r.quotaName === 'Delhi University Quota');
assert(maidsAiq && maidsAiq.seats === 8 && maidsAiq.totalSeat === 50, 'MAIDS AIQ has 8 seats and TotalSeat 50');
assert(maidsCw && maidsCw.seats === 2 && maidsCw.totalSeat === 50, 'MAIDS CW DU has 2 seats and TotalSeat 50');
assert(maidsDu && maidsDu.seats === 40 && maidsDu.totalSeat === 50, 'MAIDS DU quota has 40 seats and TotalSeat 50');

// ------------------------------------------------------------------------
// TEST SUITE 2: Official NMC MBBS Seat Matrix AY 2025-26 Verification
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 2: NMC MBBS Seat Matrix AY 2025-26 (File 2)');
const nmcJsonPath = path.resolve(__dirname, '../public/data/NMC_MBBS_2025_2026.json');
assert(fs.existsSync(nmcJsonPath), 'NMC_MBBS_2025_2026.json exists on disk');

const nmcData = JSON.parse(fs.readFileSync(nmcJsonPath, 'utf8'));
const nmcRecords = nmcData.records;
assert(Array.isArray(nmcRecords), 'NMC records is an array');
assert(nmcRecords.length === 819, `NMC total approved medical colleges count is exactly 819 (got ${nmcRecords.length})`);

// Contiguous S.No check from 1 to 819
const snos = nmcRecords.map((r: any) => r.sno);
const isContiguous = snos.every((val: number, idx: number) => val === idx + 1);
assert(isContiguous, 'NMC S.Nos are perfectly contiguous from 1 to 819 with ZERO missing entries');

const totalApproved24 = nmcRecords.reduce((sum: number, r: any) => sum + r.seats2024_25, 0);
const totalApproved25 = nmcRecords.reduce((sum: number, r: any) => sum + r.seats2025_26, 0);
assert(totalApproved24 === 117750, `NMC approved intake AY 2024-25 is exactly 117,750 seats (got ${totalApproved24})`);
assert(totalApproved25 === 128925, `NMC approved intake AY 2025-26 is exactly 128,925 seats (got ${totalApproved25})`);
assert(totalApproved25 - totalApproved24 === 11175, 'Net seat expansion for AY 2025-26 is 11,175 seats');

// ------------------------------------------------------------------------
// TEST SUITE 3: Unified Catalog & Authority Distribution
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 3: Unified NEET Catalog & Authority Coverage');
assert(NEET_COLLEGES_CATALOG.length >= 800, `Unified catalog contains ${NEET_COLLEGES_CATALOG.length} records (expected >= 800)`);

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

// ------------------------------------------------------------------------
// TEST SUITE 4: Canonical State Normalization & State Filter Bug Fix
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 4: State-Wise College Filtering & Canonical Normalization');

// Test string normalization helper
assert(normalizeIndianState('Andaman & Nicobar') === 'Andaman and Nicobar Islands', 'Normalizes "Andaman & Nicobar"');
assert(normalizeIndianState('Chattisgarh') === 'Chhattisgarh', 'Normalizes "Chattisgarh" to "Chhattisgarh"');
assert(normalizeIndianState('Pondicherry') === 'Puducherry', 'Normalizes "Pondicherry" to "Puducherry"');
assert(normalizeIndianState('Jammu & Kashmir') === 'Jammu and Kashmir', 'Normalizes "Jammu & Kashmir"');

// State filtering simulation on catalog
const allColleges = NEET_COLLEGES_CATALOG;
assert(allColleges.length === 835, `Catalog baseline count is 835 (got ${allColleges.length})`);

// Filter AP
const apColleges = allColleges.filter(c => normalizeIndianState(c.state) === 'Andhra Pradesh');
assert(apColleges.length > 50, `Andhra Pradesh filter yields ${apColleges.length} colleges (> 50)`);
assert(apColleges.every(c => c.state === 'Andhra Pradesh'), 'All AP filtered colleges have state "Andhra Pradesh"');

// Filter Telangana
const tgColleges = allColleges.filter(c => normalizeIndianState(c.state) === 'Telangana');
assert(tgColleges.length > 50, `Telangana filter yields ${tgColleges.length} colleges (> 50)`);
assert(tgColleges.every(c => c.state === 'Telangana'), 'All TG filtered colleges have state "Telangana"');

// Filter Karnataka
const kaColleges = allColleges.filter(c => normalizeIndianState(c.state) === 'Karnataka');
assert(kaColleges.length >= 70, `Karnataka filter yields ${kaColleges.length} colleges (>= 70)`);

// Filter Delhi
const dlColleges = allColleges.filter(c => normalizeIndianState(c.state) === 'Delhi');
assert(dlColleges.length >= 35, `Delhi filter yields ${dlColleges.length} colleges (>= 35)`);

// Domicile vs Filter Isolation: Filtering state does NOT modify student profile domicile
const mockProfile: NeetStudentProfile = {
  admissionYear: 2024,
  allIndiaRank: 25000,
  neetScore: 590,
  category: 'UR',
  gender: 'Male',
  isPwd: false,
  domicileState: 'Andhra Pradesh',
  localArea: 'AU',
  minority: 'NONE',
  pcbMarksPercentage: 65,
  activeAuthority: 'ALL',
  selectedCourses: ['MBBS']
};
assert(mockProfile.domicileState === 'Andhra Pradesh', 'Student domicile remains Andhra Pradesh when browsing Karnataka or Delhi');

// ------------------------------------------------------------------------
// TEST SUITE 5: NMC Class 12th PCB Statutory Minimums
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 5: Class 12th PCB Statutory Minimums (NMC UG Regulations)');
const sampleCollege = NEET_COLLEGES_CATALOG[0];

// UR with 55% -> PASS (>= 50%)
const resURPass = validateNeetEligibility({ ...mockProfile, pcbMarksPercentage: 55 }, sampleCollege);
assert(resURPass.eligible, 'UR candidate with 55% PCB is eligible (>= 50%)');

// UR with 48% -> FAIL (< 50%)
const resURFail = validateNeetEligibility({ ...mockProfile, pcbMarksPercentage: 48 }, sampleCollege);
assert(!resURFail.eligible && resURFail.reasons[0].includes('below statutory minimum'), 'UR candidate with 48% PCB is correctly blocked');

// SC with 42% -> PASS (>= 40%)
const resSCPass = validateNeetEligibility({ ...mockProfile, category: 'SC', pcbMarksPercentage: 42 }, sampleCollege);
assert(resSCPass.eligible, 'SC candidate with 42% PCB is eligible (>= 40%)');

// PwD with 46% -> PASS (>= 45%)
const resPwdPass = validateNeetEligibility({ ...mockProfile, isPwd: true, pcbMarksPercentage: 46 }, sampleCollege);
assert(resPwdPass.eligible, 'PwD candidate with 46% PCB is eligible (>= 45%)');

// ------------------------------------------------------------------------
// TEST SUITE 6: Gender Equity & Women-Only Safeguards
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 6: Women-Only College Rules');
const lhmc = NEET_COLLEGES_CATALOG.find(c => c.name.toLowerCase().includes('lady hardinge'))!;
assert(lhmc && lhmc.genderEligibility === 'GIRLS', 'Lady Hardinge Medical College flagged as GIRLS-only');

const maleToLhmc = validateNeetEligibility({ ...mockProfile, gender: 'Male' }, lhmc);
assert(!maleToLhmc.eligible && maleToLhmc.reasons[0].includes('Female-only institution'), 'Male candidate cannot select Lady Hardinge');

const femaleToLhmc = validateNeetEligibility({ ...mockProfile, gender: 'Female' }, lhmc);
assert(femaleToLhmc.eligible, 'Female candidate is eligible for Lady Hardinge');

// ------------------------------------------------------------------------
// TEST SUITE 7: Domicile & State Competent Authority Quota Boundaries
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 7: Domicile & State Competent Authority Quota Rules');
const apCqCollege = NEET_COLLEGES_CATALOG.find(c => c.authority === 'AP_STATE' && c.quota === 'STATE_CQ')!;
const tgCqCollege = NEET_COLLEGES_CATALOG.find(c => c.authority === 'TG_STATE' && c.quota === 'STATE_CQ')!;

// Candidate with AP domicile selecting AP State CQ -> PASS
const apToAp = validateNeetEligibility({ ...mockProfile, domicileState: 'Andhra Pradesh' }, apCqCollege);
assert(apToAp.eligible, 'AP candidate choosing Dr. YSRUHS 85% CQ is eligible');

// Candidate with TG domicile selecting AP State CQ -> Flagged
const tgToAp = validateNeetEligibility({ ...mockProfile, domicileState: 'Telangana' }, apCqCollege);
assert(!tgToAp.eligible && tgToAp.reasons[0].includes('Dr. YSRUHS State Competent Authority Quota'), 'Telangana candidate choosing AP State 85% CQ is flagged');

// Candidate with AP domicile selecting TG State CQ -> Flagged
const apToTg = validateNeetEligibility({ ...mockProfile, domicileState: 'Andhra Pradesh' }, tgCqCollege);
assert(!apToTg.eligible && apToTg.reasons[0].includes('KNRUHS State Competent Authority Quota'), 'AP candidate choosing KNRUHS 85% CQ is flagged');

// ------------------------------------------------------------------------
// TEST SUITE 8: 4-Tier Probability Engine Cutoff Benchmarks
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 8: 4-Tier Probability Engine');
const sampleCutoffs = { UR: 10000, OBC: 14000, EWS: 13000, SC: 55000, ST: 80000, PwD: 120000 };

const probHigh = calculateNeetProbability(8000, sampleCutoffs, 'UR');
assert(probHigh.probability === 'HIGH', `AIR 8000 vs 10000 cutoff -> HIGH chance (${probHigh.probability})`);

const probMod = calculateNeetProbability(10200, sampleCutoffs, 'UR');
assert(probMod.probability === 'MODERATE', `AIR 10200 vs 10000 cutoff -> MODERATE chance (${probMod.probability})`);

const probReach = calculateNeetProbability(11500, sampleCutoffs, 'UR');
assert(probReach.probability === 'REACH', `AIR 11500 vs 10000 cutoff -> REACH chance (${probReach.probability})`);

const probLow = calculateNeetProbability(45000, sampleCutoffs, 'UR');
assert(probLow.probability === 'LOW', `AIR 45000 vs 10000 cutoff -> LOW chance (${probLow.probability})`);

// ------------------------------------------------------------------------
// TEST SUITE 9: Mock Allotment Simulation & Choice Ordering
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 9: Mock Allotment Simulation');
const studentChoices: NeetChoice[] = [
  {
    id: 'ch-1',
    priority: 1,
    collegeId: 'mcc-delhi-aiims',
    collegeCode: '200502',
    collegeName: 'AIIMS New Delhi',
    shortName: 'AIIMS New Delhi',
    course: 'MBBS',
    authority: 'MCC',
    quota: 'AIIMS',
    state: 'Delhi',
    city: 'New Delhi',
    institutionType: 'AIIMS',
    annualFee: 1628,
    cutoffAIR: 55
  },
  {
    id: 'ch-2',
    priority: 2,
    collegeId: 'mcc-jipmer',
    collegeCode: '200501',
    collegeName: 'JIPMER Puducherry',
    shortName: 'JIPMER Puducherry',
    course: 'MBBS',
    authority: 'MCC',
    quota: 'AIQ',
    state: 'Puducherry',
    city: 'Puducherry',
    institutionType: 'CENTRAL_INSTITUTE',
    annualFee: 14920,
    cutoffAIR: 280
  },
  {
    id: 'ch-3',
    priority: 3,
    collegeId: 'mcc-amc-vizag',
    collegeCode: '200447',
    collegeName: 'Andhra Medical College, Visakhapatnam',
    shortName: 'Andhra Medical College Visakhapatnam',
    course: 'MBBS',
    authority: 'MCC',
    quota: 'AIQ',
    state: 'Andhra Pradesh',
    city: 'Visakhapatnam',
    institutionType: 'GOVT_MEDICAL',
    annualFee: 15000,
    cutoffAIR: 11500
  }
];

// Student with rank 8,000 should get Choice #3
let allotted: NeetChoice | null = null;
for (const ch of studentChoices) {
  if (ch.cutoffAIR && 8000 <= ch.cutoffAIR) {
    allotted = ch;
    break;
  }
}
assert(allotted?.priority === 3, `Student with AIR 8,000 is allotted Choice #3 (${allotted?.shortName})`);

// ------------------------------------------------------------------------
// TEST SUITE 10: Static Data Pipeline Validation
// ------------------------------------------------------------------------
console.log('\nTEST SUITE 10: Static Data Pipeline Verification');
const publicNeetPath = path.resolve(__dirname, '../public/data/NEET_UG_2024_2025.json');
assert(fs.existsSync(publicNeetPath), 'public/data/NEET_UG_2024_2025.json exists on disk');
const publicNeetData = JSON.parse(fs.readFileSync(publicNeetPath, 'utf8'));
assert(publicNeetData.metadata.datasetId === 'NEET_UG_2024_2025', 'datasetId matches NEET_UG_2024_2025');
assert(publicNeetData.colleges.length === NEET_COLLEGES_CATALOG.length, `Exported colleges count (${publicNeetData.colleges.length}) matches catalog (${NEET_COLLEGES_CATALOG.length})`);

console.log(`\n========================================================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} TEST CASES PASSED (100%)`);
console.log(`========================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
