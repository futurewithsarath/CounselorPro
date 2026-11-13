export type ExamType = 'AP_EAPCET' | 'TS_EAMCET' | 'JEE_MAIN' | 'NEET_UG';
export type ReservationCategory = 'OC' | 'BC-A' | 'BC-B' | 'BC-C' | 'BC-D' | 'BC-E' | 'SC' | 'SC-I' | 'SC-II' | 'SC-III' | 'ST' | 'EWS';
export type CutoffCategory = 'OC' | 'SC' | 'SC_I' | 'SC_II' | 'SC_III' | 'ST' | 'BC_A' | 'BC_B' | 'BC_C' | 'BC_D' | 'BC_E' | 'OC_EWS';
export type LocalArea = 'AU' | 'SVU' | 'OU' | 'NON_LOCAL';
export type CollegeGenderEligibility = 'COED' | 'GIRLS' | 'BOYS';
export type SeatProbability = 'HIGH' | 'MODERATE' | 'REACH' | 'LOW' | 'NO_DATA';

export interface CollegeDatasetMetadata {
  datasetId: string;
  exam: ExamType;
  state: string;
  stream: 'MPC' | 'BiPC';
  year: number;
  sourceTitle?: string;
  sourceFile?: string;
  sourceRows?: number;
  collegeCourseRecords?: number;
  cutoffCategories?: string[];
  cutoffLocalAreas?: string[];
  cutoffLocalAreaScope?: 'REPORTED' | 'NOT_REPORTED' | 'NOT_APPLICABLE';
  counsellingPhase?: string;
  uniqueColleges?: number;
  sourceUrl?: string;
  sourceExtractionSha256?: string;
  cutoffMeaning?: string;
  feesIncluded?: boolean;
  disclaimer?: string;
}

export interface GenderCutoff {
  Boys: number | null;
  Girls: number | null;
}

export type CategoryCutoffs = Partial<Record<CutoffCategory, GenderCutoff>>;

export interface StudentProfile {
  exam: ExamType | null;
  stream: 'MPC' | 'BiPC';
  rank: number;
  gender: 'Male' | 'Female';
  category: ReservationCategory;
  region: LocalArea;
}

export interface College {
  id: string;
  code: string;
  name: string;
  branch: string;
  branchName?: string;
  district: string;
  type: string;
  fee: number | null;
  cutoffOC?: number | null;
  cutoffBC?: number | null;
  cutoffSCST?: number | null;
  institutionTypeCode?: string;
  institutionRegion?: string;
  districtCode?: string;
  year?: number;
  sourcePage?: number;
  sourceRowNumber?: number;
  sourceRecordNumbers?: number[];
  cutoffsByLocalArea?: Partial<Record<LocalArea, CategoryCutoffs>>;
  /** Category and gender cutoffs when the source does not split results by local area. */
  cutoffsByCategory?: CategoryCutoffs;
  place?: string | null;
  affiliatingUniversity?: string | null;
  establishedYear?: number | null;
  genderEligibility?: CollegeGenderEligibility;
  region: string;
  exam: ExamType;
  stream?: 'MPC' | 'BiPC';
}

export interface WebOption {
  id: string; // unique for this choice item (combining college + branch)
  priority: number; // 1-indexed order
  collegeId: string;
  collegeCode: string;
  collegeName: string;
  branch: string;
  branchName?: string;
  district: string;
  fee: number | null;
}

export interface MockAllotmentResult {
  allotted: boolean;
  college?: College;
  optionNumber?: number;
  categoryUsed?: string;
  allotmentType?: string; // e.g. "General", "Local", "Category"
  message?: string;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// ==========================================
// JEE MAIN (JoSAA NIT) COUNSELLING TYPES
// ==========================================

export type JeeCategory = 'OPEN' | 'GEN-EWS' | 'OBC-NCL' | 'SC' | 'ST';
export type JeePracticeMode = 'GUIDED' | 'PROFILE_BASED';

export interface JeeStudentProfile {
  admissionYear: number;
  paper: 'Paper 1 (B.E./B.Tech)';
  practiceMode: JeePracticeMode;
  stateOfEligibility: string; // Indian State/UT from which Class XII was passed
  crlRank?: number | null; // Optional CRL rank
  category: JeeCategory;
  categoryRank?: number | null; // Optional Category rank
  gender: 'Male' | 'Female';
  isPwd: boolean;
  pwdSubcategory?: string;
}

export interface NitInstitute {
  code: string; // Official JoSAA code (201 - 231)
  name: string; // Official full name
  shortName: string; // Short recognizable name (e.g. "NIT Trichy")
  state: string; // State / UT
  location: string; // City / Town
  establishedYear: number;
  nirfTier?: string;
}

export interface NitAcademicProgram {
  id: string; // e.g. "nit-228-cse"
  instituteCode: string;
  instituteName: string;
  instituteShortName: string;
  instituteState: string;
  programCode: string; // e.g. "CSE", "ECE"
  programName: string; // Full branch name
  degree: string; // e.g. "4 Years, Bachelor of Technology"
  durationYears: number;
}

export interface JeePracticeChoice {
  id: string; // unique for each choice in the practice list
  priority: number; // 1-indexed order
  programId: string;
  instituteCode: string;
  instituteName: string;
  instituteShortName: string;
  instituteState: string;
  programCode: string;
  programName: string;
  degree: string;
  quotaApplied: 'Home State (HS)' | 'Other State (OS)';
}

export interface JeePracticeLock {
  lockedAt: string;
  sessionId: string;
  profile: JeeStudentProfile;
  choices: JeePracticeChoice[];
  totalChoices: number;
  totalNits: number;
}

// ==========================================
// NEET UG COUNSELLING TYPES (MCC, STATE, AACCC)
// ==========================================

export type NeetCounsellingAuthority = 'MCC' | 'AP_STATE' | 'TG_STATE' | 'AACCC';
export type NeetCourseType = 'MBBS' | 'BDS' | 'BAMS' | 'BHMS' | 'BUMS' | 'BSMS';
export type NeetCategory = 'UR' | 'EWS' | 'OBC' | 'SC' | 'ST';
export type NeetInstitutionType = 
  | 'AIIMS'
  | 'CENTRAL_INSTITUTE'
  | 'GOVT_MEDICAL'
  | 'GOVT_DENTAL'
  | 'GOVT_AYUSH'
  | 'PVT_MEDICAL'
  | 'PVT_DENTAL'
  | 'PVT_AYUSH'
  | 'DEEMED_UNIVERSITY'
  | 'NATIONAL_AYUSH';

export type NeetQuotaType = 
  | 'AIQ' 
  | 'AIIMS' 
  | 'JIPMER_OPEN' 
  | 'CENTRAL_UNIV' 
  | 'DEEMED_PAID' 
  | 'STATE_CQ' 
  | 'STATE_MQ_B' 
  | 'STATE_MQ_C' 
  | 'AYUSH_AIQ' 
  | 'AYUSH_NATIONAL';

export interface NeetCutoffSet {
  UR?: number | null;
  EWS?: number | null;
  OBC?: number | null;
  SC?: number | null;
  ST?: number | null;
  PwD?: number | null;
}

export interface NeetCollegeRecord {
  id: string; // e.g. "mcc-aiims-delhi-mbbs"
  code: string;
  name: string;
  shortName: string;
  state: string;
  city: string;
  authority: NeetCounsellingAuthority;
  course: NeetCourseType;
  institutionType: NeetInstitutionType;
  sanctionedIntake: number;
  establishedYear: number;
  annualFee: number | null;
  feeNote?: string;
  quota: NeetQuotaType;
  cutoffs: NeetCutoffSet;
  source: string;
  nirfRank?: number;
  localArea?: 'AU' | 'SVU' | 'OU' | 'ALL_INDIA';
  minorityStatus?: 'NONE' | 'MUSLIM' | 'CHRISTIAN';
  genderEligibility: 'COED' | 'GIRLS';
}

export interface NeetStudentProfile {
  admissionYear: number;
  allIndiaRank: number;
  neetScore: number;
  category: NeetCategory;
  categoryRank?: number | null;
  gender: 'Male' | 'Female';
  isPwd: boolean;
  domicileState: string;
  localArea?: 'AU' | 'SVU' | 'OU' | 'NON_LOCAL';
  minority: 'NONE' | 'MUSLIM' | 'CHRISTIAN' | 'OTHER';
  pcbMarksPercentage: number;
  activeAuthority: NeetCounsellingAuthority | 'ALL';
  selectedCourses: NeetCourseType[];
}

export interface NeetChoice {
  id: string;
  priority: number;
  collegeId: string;
  collegeCode: string;
  collegeName: string;
  shortName: string;
  course: NeetCourseType;
  authority: NeetCounsellingAuthority;
  quota: NeetQuotaType;
  state: string;
  city: string;
  institutionType: NeetInstitutionType;
  annualFee: number | null;
  cutoffAIR?: number | null;
}

export interface NeetPracticeLock {
  lockedAt: string;
  sessionId: string;
  profile: NeetStudentProfile;
  choices: NeetChoice[];
  totalChoices: number;
  totalColleges: number;
  authorityBreakdown: Record<NeetCounsellingAuthority, number>;
  courseBreakdown: Record<NeetCourseType, number>;
}

