export type ExamType = 'AP_EAPCET' | 'TS_EAMCET';
export type ReservationCategory = 'OC' | 'BC-A' | 'BC-B' | 'BC-C' | 'BC-D' | 'BC-E' | 'SC' | 'SC-I' | 'SC-II' | 'SC-III' | 'ST' | 'EWS';
export type CutoffCategory = 'OC' | 'SC' | 'SC_I' | 'SC_II' | 'SC_III' | 'ST' | 'BC_A' | 'BC_B' | 'BC_C' | 'BC_D' | 'BC_E' | 'OC_EWS';
export type LocalArea = 'AU' | 'SVU' | 'OU';
export type CollegeGenderEligibility = 'COED' | 'GIRLS' | 'BOYS';

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
  region: 'AU' | 'SVU' | 'OU';
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
