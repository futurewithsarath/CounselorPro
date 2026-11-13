import { ALL_NITS, ALL_NIT_PROGRAMS, determineNitQuota, INDIAN_STATES_UTS } from '../src/data/jeeNitCatalog';
import { JeeStudentProfile, JeePracticeChoice } from '../src/types';

console.log('==================================================');
console.log('RUNNING JEE MAIN JoSAA NIT COUNSELLING TEST SUITE');
console.log('==================================================');

// Test 1: Exactly 31 NITs present (Codes 201 to 231)
console.log('\n[1] Verifying NIT Catalog Integrity...');
if (ALL_NITS.length !== 31) {
  throw new Error(`Expected 31 NITs, found ${ALL_NITS.length}`);
}

const codes = new Set(ALL_NITS.map(n => n.code));
for (let c = 201; c <= 231; c++) {
  const codeStr = String(c);
  if (!codes.has(codeStr)) {
    throw new Error(`Missing NIT with JoSAA code ${codeStr}`);
  }
}
console.log('✓ Test 1 Passed: Exactly 31 NITs catalogued with JoSAA codes 201 to 231.');

// Test 2: Academic Programs generated properly
console.log('\n[2] Verifying Academic Programs...');
if (ALL_NIT_PROGRAMS.length < 150) {
  throw new Error(`Too few NIT academic programs: ${ALL_NIT_PROGRAMS.length}`);
}
console.log(`✓ Test 2 Passed: Generated ${ALL_NIT_PROGRAMS.length} academic programs across 31 NITs.`);

// Test 3: JoSAA State Code of Eligibility 50:50 HS/OS Quota Determination
console.log('\n[3] Verifying 50:50 Home State vs Other State Quota Determination...');

// Scenario A: Candidate passed Class XII in Andhra Pradesh
const apQuotaAtAP = determineNitQuota('Andhra Pradesh', 'Andhra Pradesh');
const apQuotaAtTrichy = determineNitQuota('Andhra Pradesh', 'Tamil Nadu');
const apQuotaAtWarangal = determineNitQuota('Andhra Pradesh', 'Telangana');

if (apQuotaAtAP !== 'Home State (HS)') {
  throw new Error(`Expected Home State (HS) for AP candidate at NIT AP, got ${apQuotaAtAP}`);
}
if (apQuotaAtTrichy !== 'Other State (OS)') {
  throw new Error(`Expected Other State (OS) for AP candidate at NIT Trichy, got ${apQuotaAtTrichy}`);
}
if (apQuotaAtWarangal !== 'Other State (OS)') {
  throw new Error(`Expected Other State (OS) for AP candidate at NIT Warangal, got ${apQuotaAtWarangal}`);
}

// Scenario B: Candidate passed Class XII in Telangana
const tgQuotaAtWarangal = determineNitQuota('Telangana', 'Telangana');
const tgQuotaAtAP = determineNitQuota('Telangana', 'Andhra Pradesh');
const tgQuotaAtSurathkal = determineNitQuota('Telangana', 'Karnataka');

if (tgQuotaAtWarangal !== 'Home State (HS)') {
  throw new Error(`Expected Home State (HS) for TG candidate at NIT Warangal, got ${tgQuotaAtWarangal}`);
}
if (tgQuotaAtAP !== 'Other State (OS)') {
  throw new Error(`Expected Other State (OS) for TG candidate at NIT AP, got ${tgQuotaAtAP}`);
}
if (tgQuotaAtSurathkal !== 'Other State (OS)') {
  throw new Error(`Expected Other State (OS) for TG candidate at NIT Surathkal, got ${tgQuotaAtSurathkal}`);
}

console.log('✓ Test 3 Passed: 50% Home State vs 50% Other State quota accurately assigned based on Class XII State.');

// Test 4: All 36 Indian States/UTs covered
console.log('\n[4] Verifying Indian States & UTs Catalog...');
if (INDIAN_STATES_UTS.length !== 36) {
  throw new Error(`Expected 36 States/UTs, found ${INDIAN_STATES_UTS.length}`);
}
console.log('✓ Test 4 Passed: All 28 States and 8 Union Territories catalogued.');

// Test 5: Simulated Choice List Logic
console.log('\n[5] Verifying Choice Selection and Priority Logic...');
const dummyChoices: JeePracticeChoice[] = [];

// Add Choice 1: NIT Trichy CSE
dummyChoices.push({
  id: 'choice-1',
  priority: 1,
  programId: 'nit-226-cse',
  instituteCode: '226',
  instituteName: 'National Institute of Technology, Tiruchirappalli',
  instituteShortName: 'NIT Trichy',
  instituteState: 'Tamil Nadu',
  programCode: 'CSE',
  programName: 'Computer Science and Engineering',
  degree: '4 Years, Bachelor of Technology',
  quotaApplied: determineNitQuota('Andhra Pradesh', 'Tamil Nadu')
});

// Add Choice 2: NIT Warangal CSE
dummyChoices.push({
  id: 'choice-2',
  priority: 2,
  programId: 'nit-228-cse',
  instituteCode: '228',
  instituteName: 'National Institute of Technology, Warangal',
  instituteShortName: 'NIT Warangal',
  instituteState: 'Telangana',
  programCode: 'CSE',
  programName: 'Computer Science and Engineering',
  degree: '4 Years, Bachelor of Technology',
  quotaApplied: determineNitQuota('Andhra Pradesh', 'Telangana')
});

// Add Choice 3: NIT Andhra Pradesh CSE (Home State)
dummyChoices.push({
  id: 'choice-3',
  priority: 3,
  programId: 'nit-231-cse',
  instituteCode: '231',
  instituteName: 'National Institute of Technology, Andhra Pradesh',
  instituteShortName: 'NIT Andhra Pradesh',
  instituteState: 'Andhra Pradesh',
  programCode: 'CSE',
  programName: 'Computer Science and Engineering',
  degree: '4 Years, Bachelor of Technology',
  quotaApplied: determineNitQuota('Andhra Pradesh', 'Andhra Pradesh')
});

if (dummyChoices.length !== 3) {
  throw new Error('Choice count mismatch');
}
if (dummyChoices[0].priority !== 1 || dummyChoices[0].quotaApplied !== 'Other State (OS)') {
  throw new Error('Choice 1 priority or quota invalid');
}
if (dummyChoices[2].priority !== 3 || dummyChoices[2].quotaApplied !== 'Home State (HS)') {
  throw new Error('Choice 3 priority or quota invalid');
}

console.log('✓ Test 5 Passed: Choice priority sequencing and quota mapping verified.');

console.log('\n==================================================');
console.log('ALL JEE MAIN JoSAA TEST SUITES PASSED (100% SUCCESS)');
console.log('==================================================\n');

