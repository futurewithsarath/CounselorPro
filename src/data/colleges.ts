import { CategoryCutoffs, College, CollegeDatasetMetadata, CutoffCategory, ExamType, LocalArea, ReservationCategory, SeatProbability } from '../types';

export type { SeatProbability };

export let COLLEGES_DB: College[] = [];
export let COLLEGES_SOURCE = 'No verified dataset loaded';
export let COLLEGES_SOURCE_YEAR: number | null = null;
export let COLLEGES_DATASET_METADATA: CollegeDatasetMetadata | null = null;

const clientCache: Record<string, { colleges: College[]; metadata: CollegeDatasetMetadata }> = {};
let activeLoadRequest = 0;

function mapDistrictAbbr(dist: string): string {
  const map: Record<string, string> = {
    VSKP: 'Visakhapatnam', EG: 'East Godavari', WG: 'West Godavari', ATP: 'Anantapur',
    CTR: 'Chittoor', KRI: 'Krishna', SKL: 'Srikakulam', GNT: 'Guntur', NLR: 'Nellore',
    VSP: 'Visakhapatnam', KST: 'Krishna', GTR: 'Guntur', NLR_: 'Nellore',
    KDP: 'Kadapa', KNL: 'Kurnool', PKS: 'Prakasam', VZM: 'Vizianagaram'
  };
  return map[(dist || '').toUpperCase()] || dist || 'Unknown';
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const institutionTypeLabels: Record<string, string> = {
  PVT: 'Private',
  PU: 'Private University',
  SF: 'Self Finance',
  UNIV: 'University',
  SS: 'Self-Support'
};

export function normalizeCollege(item: any, index: number): College {
  const code = item.code || item.inst_code || 'UNKN';
  const branch = item.branch || item.branch_code || 'Unknown';
  const typeCode = String(item.institutionTypeCode || item.type || 'Unknown').toUpperCase();
  const rawCutoffOC = item.cutoffOC ?? item.oc_boys ?? item.oc_girls;
  const rawCutoffBC = item.cutoffBC ?? item.bcb_boys ?? item.bca_boys ?? item.bcd_boys;
  const rawCutoffSCST = item.cutoffSCST ?? item.sc_boys ?? item.sc_girls ?? item.st_boys;

  return {
    id: item.id || `${(item.exam || 'ap_eapcet').toLowerCase()}-${code.toLowerCase()}-${branch.toLowerCase()}-${index}`,
    code,
    name: item.name || item.institution_name || 'Unknown Institution',
    branch,
    branchName: item.branchName || undefined,
    district: mapDistrictAbbr(item.districtCode || item.district || item.dist || 'Unknown'),
    type: institutionTypeLabels[typeCode] || (typeCode === 'GOVT' ? 'Government' : typeCode),
    fee: nullableNumber(item.fee),
    cutoffOC: nullableNumber(rawCutoffOC),
    cutoffBC: nullableNumber(rawCutoffBC),
    cutoffSCST: nullableNumber(rawCutoffSCST),
    region: item.institutionRegion || item.region || 'Unknown',
    exam: item.exam || 'AP_EAPCET',
    stream: item.stream,
    year: item.year,
    sourcePage: item.sourcePage,
    sourceRowNumber: item.sourceRowNumber,
    institutionTypeCode: item.institutionTypeCode,
    institutionRegion: item.institutionRegion,
    districtCode: item.districtCode,
    sourceRecordNumbers: item.sourceRecordNumbers,
    cutoffsByLocalArea: item.cutoffsByLocalArea as Partial<Record<LocalArea, CategoryCutoffs>> | undefined,
    cutoffsByCategory: item.cutoffsByCategory as CategoryCutoffs | undefined,
    place: item.place || null,
    affiliatingUniversity: item.affiliatingUniversity || null,
    establishedYear: nullableNumber(item.establishedYear),
    genderEligibility: item.genderEligibility,
  };
}

export function getDefaultDatasetYear(exam: ExamType | null, stream: 'MPC' | 'BiPC'): number {
  if (exam === 'AP_EAPCET' && stream === 'BiPC') return 2024;
  return 2025;
}

export function getExamGroup(exam: string | null, stream: 'MPC' | 'BiPC'): string {
  if (exam === 'AP_EAPCET') {
    return stream === 'BiPC' ? 'AP_EAPCET_BIPC' : 'AP_EAPCET_MPC';
  }
  return stream === 'BiPC' ? 'TS_EAMCET_BIPC' : 'TS_EAMCET_MPC';
}

export async function loadRealCollegesForExam(exam: ExamType | null, stream: 'MPC' | 'BiPC', year: number = getDefaultDatasetYear(exam, stream)): Promise<number> {
  const requestId = ++activeLoadRequest;
  COLLEGES_DB.length = 0;
  COLLEGES_SOURCE_YEAR = null;
  COLLEGES_DATASET_METADATA = null;
  if (!exam) {
    COLLEGES_SOURCE = 'Select an exam first';
    return 0;
  }

  const examGroup = getExamGroup(exam, stream);
  const cacheKey = `${examGroup}_${year}`;
  const cached = clientCache[cacheKey];
  if (cached) {
    COLLEGES_DB.push(...cached.colleges);
    COLLEGES_SOURCE_YEAR = cached.metadata.year;
    COLLEGES_DATASET_METADATA = cached.metadata;
    COLLEGES_SOURCE = `${cached.metadata.sourceTitle || 'Verified PDF dataset'} (${cached.metadata.year})`;
    return cached.colleges.length;
  }

  try {
    let response = await fetch(`/api/colleges?datasetId=${encodeURIComponent(cacheKey)}`);
    let payload: any = response.ok ? await response.json() : null;
    if (!payload?.metadata || !Array.isArray(payload.colleges)) {
      response = await fetch(`/data/${cacheKey}.json`);
      if (!response.ok) throw new Error(`Dataset returned status ${response.status}`);
      payload = await response.json();
    }
    if (payload?.metadata?.datasetId !== cacheKey || payload.metadata.exam !== exam || payload.metadata.stream !== stream || payload.metadata.year !== year || !Array.isArray(payload.colleges)) {
      if (requestId !== activeLoadRequest) return 0;
      COLLEGES_SOURCE = `No verified dataset available for ${examGroup} ${year}`;
      return 0;
    }

    const normalized = payload.colleges.map((item: unknown, idx: number) => normalizeCollege(item, idx));
    if (!normalized.length || normalized.some((college: College) => college.exam !== exam || college.stream !== stream || college.year !== year) || new Set(normalized.map((college: College) => college.id)).size !== normalized.length) {
      if (requestId !== activeLoadRequest) return 0;
      COLLEGES_SOURCE = `Dataset validation failed for ${examGroup} ${year}`;
      return 0;
    }

    if (requestId !== activeLoadRequest) return 0;
    const metadata = payload.metadata as CollegeDatasetMetadata;
    clientCache[cacheKey] = { colleges: normalized, metadata };
    COLLEGES_DB.push(...normalized);
    COLLEGES_SOURCE_YEAR = year;
    COLLEGES_DATASET_METADATA = metadata;
    COLLEGES_SOURCE = `${metadata.sourceTitle || examGroup} (${year}, ${normalized.length.toLocaleString()} course records)`;
    return COLLEGES_DB.length;
  } catch (error) {
    if (requestId !== activeLoadRequest) return 0;
    COLLEGES_SOURCE = `Unable to load ${examGroup} ${year} dataset`;
    console.error('[COLLEGE DATA ERROR]', error);
    return 0;
  }
}

export async function loadRealColleges(): Promise<number> {
  return loadRealCollegesForExam('AP_EAPCET', 'MPC', 2025);
}

export function hasLocalAreaCutoffs(exam: ExamType | null = COLLEGES_DATASET_METADATA?.exam ?? null): boolean {
  if (COLLEGES_DATASET_METADATA?.exam === exam && COLLEGES_DATASET_METADATA.cutoffLocalAreaScope) {
    return COLLEGES_DATASET_METADATA.cutoffLocalAreaScope !== 'NOT_REPORTED';
  }
  return exam !== 'TS_EAMCET';
}

function getCutoffCategory(category: ReservationCategory): CutoffCategory | null {
  if (category === 'OC' || category === 'SC' || category === 'ST') return category;
  if (category === 'EWS') return 'OC_EWS';
  if (category === 'SC-I') return 'SC_I';
  if (category === 'SC-II') return 'SC_II';
  if (category === 'SC-III') return 'SC_III';
  return category.replace('-', '_') as CutoffCategory;
}

export interface ProbabilityMeta {
  tier: SeatProbability;
  label: string;
  badgeLabel: string;
  color: string;
  description: string;
}

export const PROBABILITY_CONFIG: Record<SeatProbability, ProbabilityMeta> = {
  HIGH: {
    tier: 'HIGH',
    label: 'High Chance',
    badgeLabel: 'HIGH CHANCE',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'Your rank is comfortably within historical cutoffs.'
  },
  MODERATE: {
    tier: 'MODERATE',
    label: 'Moderate Chance',
    badgeLabel: 'MODERATE CHANCE',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    description: 'Your rank is close to the historical closing cutoff.'
  },
  REACH: {
    tier: 'REACH',
    label: 'Reach / Competitive',
    badgeLabel: 'REACH / COMPETITIVE',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Competitive option; your rank is slightly beyond historical cutoffs.'
  },
  LOW: {
    tier: 'LOW',
    label: 'Low Chance',
    badgeLabel: 'LOW CHANCE',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    description: 'Historically closed at a significantly better rank.'
  },
  NO_DATA: {
    tier: 'NO_DATA',
    label: 'No Historical Data',
    badgeLabel: 'NO HISTORICAL DATA',
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    description: 'No historical closing rank was published for this category, gender, and regional eligibility.'
  }
};

export function getCollegeCutoff(
  college: College,
  category: ReservationCategory | string,
  gender: 'Male' | 'Female' = 'Male',
  localArea: LocalArea = 'AU',
): number | null {
  if (!isCollegeAvailableToGender(college, gender)) {
    return null;
  }

  const cutoffCategory = getCutoffCategory(category as ReservationCategory);
  if (cutoffCategory) {
    const categoryCutoff = college.cutoffsByLocalArea?.[localArea]?.[cutoffCategory]
      ?? college.cutoffsByCategory?.[cutoffCategory];
    if (categoryCutoff) {
      const eligibleRanks = gender === 'Female'
        ? [categoryCutoff.Girls, categoryCutoff.Boys].filter((value): value is number => value !== null && value !== undefined)
        : [categoryCutoff.Boys].filter((value): value is number => value !== null && value !== undefined);
      return eligibleRanks.length ? Math.max(...eligibleRanks) : null;
    }
  }

  // Backward-compatible handling for legacy datasets; AP PDF records always use the exact category table above.
  const legacyCutoff = category === 'OC' ? college.cutoffOC
    : category.startsWith('BC') ? college.cutoffBC
      : category === 'ST' || category.startsWith('SC') ? college.cutoffSCST
        : null;
  return legacyCutoff ?? null;
}

export function getEligibleCutoff(
  college: College,
  category: ReservationCategory | string,
  gender: 'Male' | 'Female' = 'Male',
  localArea: LocalArea = 'AU',
): number | null {
  const categoryCutoff = getCollegeCutoff(college, category, gender, localArea);
  const openCutoff = category === 'OC' ? null : getCollegeCutoff(college, 'OC', gender, localArea);
  const eligibleRanks = [categoryCutoff, openCutoff].filter((value): value is number => value !== null);
  return eligibleRanks.length ? Math.max(...eligibleRanks) : null;
}

export function getSeatProbability(
  college: College,
  rank: number,
  category: ReservationCategory | string,
  gender: 'Male' | 'Female' = 'Male',
  localArea: LocalArea = 'AU',
): SeatProbability {
  const cutoff = getEligibleCutoff(college, category, gender, localArea);
  if (cutoff === null || cutoff <= 0) return 'NO_DATA';
  if (rank <= cutoff * 0.85) return 'HIGH';
  if (rank <= cutoff * 1.05) return 'MODERATE';
  if (rank <= cutoff * 1.25) return 'REACH';
  return 'LOW';
}

export function getCollegesForStream(stream: 'MPC' | 'BiPC'): College[] {
  return COLLEGES_DB.filter(college => !college.stream || college.stream === stream);
}

export function isCollegeAvailableToGender(college: College, gender: 'Male' | 'Female'): boolean {
  if (college.genderEligibility === 'GIRLS') return gender === 'Female';
  if (college.genderEligibility === 'BOYS') return gender === 'Male';
  return true;
}
