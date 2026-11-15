/**
 * CounselorPro — Universal PDF Generation Service
 * Academic-grade, multi-page printable PDF generator supporting all examinations:
 * - AP EAPCET (MPC, BiPC)
 * - TG EAPCET / TS EAMCET (MPC, BiPC)
 * - JEE Main JoSAA (NITs)
 * - NEET UG (MBBS, BDS, AYUSH)
 * 
 * Generates three distinct document types:
 * A. Complete College Preference List PDF (all choices, strictly preserving priority order)
 * B. Mock Allotment / Practice Result PDF (summary, matched college, cutoffs, disclaimers)
 * C. Combined Complete Counselling Report PDF (candidate profile + mock result + full table)
 */

export type SupportedExam = 'AP_EAPCET' | 'TS_EAMCET' | 'TG_EAPCET' | 'JEE_MAIN' | 'NEET_UG';

export interface UniversalCandidateProfile {
  exam: SupportedExam | string;
  stream?: string;
  rank?: number | string | null;
  score?: number | string | null;
  category: string;
  gender: string;
  domicileOrRegion?: string;
  localArea?: string;
  isPwd?: boolean;
  extraDetails?: Record<string, string | number | boolean>;
}

export interface UniversalChoiceItem {
  priority: number;
  code: string;
  name: string;
  branchOrProgram: string;
  districtOrState?: string;
  authority?: string;
  quota?: string;
  fee?: number | string | null;
  historicalCutoff?: number | string | null;
  probability?: string | null;
}

export interface UniversalMockResult {
  allotted: boolean;
  collegeName?: string;
  collegeCode?: string;
  branchName?: string;
  preferenceNumber?: number;
  allotmentType?: string;
  fee?: number | string | null;
  probabilityRange?: string;
  cutoffBasis?: string;
  categoryUsed?: string;
  notes?: string;
}

export interface UniversalPdfOptions {
  profile: UniversalCandidateProfile;
  choices: UniversalChoiceItem[];
  mockResult?: UniversalMockResult | null;
  sessionId?: string | null;
  isLocked?: boolean;
  lockedAt?: string | null;
  datasetTitle?: string;
  hideRank?: boolean;
  hideCategory?: boolean;
}

// Helper: Friendly Examination Titles
export function getExamDisplayName(exam: string, stream?: string): string {
  switch (exam) {
    case 'AP_EAPCET':
      return `AP EAPCET ${stream === 'BiPC' ? 'BiPC (Pharmacy & Bio)' : 'MPC (Engineering)'}`;
    case 'TS_EAMCET':
    case 'TG_EAPCET':
      return `TG EAPCET ${stream === 'BiPC' ? 'BiPC Stream' : 'MPC (Engineering)'}`;
    case 'JEE_MAIN':
      return 'JEE Main JoSAA NIT Counselling Practice';
    case 'NEET_UG':
      return `NEET UG Medical & AYUSH Counselling (${stream || 'MBBS/BDS'})`;
    default:
      return `${exam} ${stream || ''}`.trim();
  }
}

// Brand Colors
const EMERALD_GREEN = [0, 158, 96]; // #009E60
const DEEP_SLATE = [11, 19, 43];    // #0B132B
const TEXT_MUTED = [100, 116, 139]; // #64748B
const BORDER_LIGHT = [226, 232, 240];
const ACCENT_BG = [248, 250, 252];

// Core Header Generator
function drawDocHeader(
  doc: any,
  title: string,
  subtitle: string,
  options: UniversalPdfOptions,
  pageWidth: number,
  marginX: number
): number {
  // Top brand accent strip
  doc.setFillColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
  doc.text('COUNSELORPRO', marginX, 14);

  // Sub-brand tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Autonomous Admissions Counselling & Historical Cutoff Analytics • counselorpro.in', marginX, 18);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(title, marginX, 25);

  // Status Badge (Top Right)
  const badgeWidth = 56;
  const badgeHeight = 16;
  const badgeX = pageWidth - marginX - badgeWidth;
  const badgeY = 9;

  if (options.isLocked && options.sessionId) {
    doc.setFillColor(4, 120, 87); // #047857
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('PRACTICE SESSION LOCKED', badgeX + badgeWidth / 2, badgeY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Session: ${options.sessionId}`, badgeX + badgeWidth / 2, badgeY + 9.5, { align: 'center' });
    doc.text(`Locked: ${options.lockedAt ? options.lockedAt.slice(0, 22) : new Date().toLocaleDateString('en-IN')}`, badgeX + badgeWidth / 2, badgeY + 13.5, { align: 'center' });
  } else {
    doc.setFillColor(ACCENT_BG[0], ACCENT_BG[1], ACCENT_BG[2]);
    doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('PRACTICE SESSION DRAFT', badgeX + badgeWidth / 2, badgeY + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Educational Simulation Copy', badgeX + badgeWidth / 2, badgeY + 9.5, { align: 'center' });
    doc.text(`Exported: ${new Date().toLocaleDateString('en-IN')}`, badgeX + badgeWidth / 2, badgeY + 13.5, { align: 'center' });
  }

  // Candidate Profile Parameter Box
  const profileBoxY = 29;
  const profileBoxHeight = 22;
  doc.setFillColor(ACCENT_BG[0], ACCENT_BG[1], ACCENT_BG[2]);
  doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
  doc.roundedRect(marginX, profileBoxY, pageWidth - (marginX * 2), profileBoxHeight, 1.5, 1.5, 'FD');

  const p = options.profile;
  const col1X = marginX + 3;
  const col2X = marginX + 64;
  const col3X = marginX + 128;

  // Col 1: Candidate Merit
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('CANDIDATE PARAMETERS', col1X, profileBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Rank / Merit: ', col1X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
  doc.text(options.hideRank ? 'Hidden for Privacy' : (p.rank ? `#${Number(p.rank).toLocaleString()}` : 'Not Specified'), col1X + 22, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Examination: ', col1X, profileBoxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(String(p.exam), col1X + 20, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Stream / Course: ', col1X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(String(p.stream || 'General'), col1X + 24, profileBoxY + 19.5);

  // Col 2: Reservation & Eligibility
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('RESERVATION & ELIGIBILITY', col2X, profileBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Category: ', col2X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(options.hideCategory ? 'Hidden' : `${p.category || 'OC/GEN'} ${p.isPwd ? '(PwD)' : ''}`, col2X + 15, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Gender: ', col2X, profileBoxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(String(p.gender || 'Not Specified'), col2X + 13, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Domicile / Region: ', col2X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(String(p.domicileOrRegion || p.localArea || 'Statewide Pool'), col2X + 26, profileBoxY + 19.5);

  // Col 3: Session stats
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('SESSION PARAMETERS', col3X, profileBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Total Options: ', col3X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(`${options.choices.length} Colleges`, col3X + 20, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Dataset: ', col3X, profileBoxY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  const dsTrunc = (options.datasetTitle || 'Official Historical Cutoffs').slice(0, 24);
  doc.text(dsTrunc, col3X + 13, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Document: ', col3X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
  doc.text(subtitle, col3X + 16, profileBoxY + 19.5);

  return profileBoxY + profileBoxHeight + 5; // Return next start Y (approx 56mm)
}

// Draw running footers across all pages
function drawFooters(doc: any, pageWidth: number, pageHeight: number, examTitle: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(
      'DISCLAIMER: Educational practice simulation generated on CounselorPro. Historical cutoff comparisons do not guarantee official admission.',
      14,
      pageHeight - 8
    );
    doc.text(
      `Page ${page} of ${pageCount} • ${examTitle}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }
}

// --------------------------------------------------------------------------
// 1. GENERATE COMPLETE PREFERENCE LIST PDF
// --------------------------------------------------------------------------
export async function generatePreferenceListPdf(options: UniversalPdfOptions): Promise<{ success: boolean; filename: string }> {
  if (!options.choices || options.choices.length === 0) {
    throw new Error('Your preference list is empty. Add at least one college before generating your PDF.');
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const examTitle = getExamDisplayName(String(options.profile.exam), options.profile.stream);
  const startY = drawDocHeader(
    doc,
    `${examTitle} — Prioritized Preference List`,
    'Complete Preference List',
    options,
    pageWidth,
    marginX
  );

  // Table rows: preserve 100% exact priority order
  const rows = options.choices.map(c => [
    `#${c.priority}`,
    c.code || 'UNKN',
    c.name || 'Unknown College',
    c.branchOrProgram || 'Engineering / Medical',
    c.districtOrState || c.authority || 'Statewide',
    c.historicalCutoff ? String(c.historicalCutoff) : (c.probability || 'N/A')
  ]);

  autoTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    head: [['Pref #', 'Code', 'College Name', 'Branch / Academic Programme', 'District / Authority', 'Cutoff / Range']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [11, 19, 43], // #0B132B
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 18, fontStyle: 'bold' },
      2: { cellWidth: 62 },
      3: { cellWidth: 42 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  drawFooters(doc, pageWidth, pageHeight, examTitle);

  const cleanExam = String(options.profile.exam).replace(/[^a-zA-Z0-9]/g, '_');
  const cleanStream = String(options.profile.stream || 'GENERAL').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `CounselorPro_${cleanExam}_${cleanStream}_Preference_List.pdf`;
  doc.save(filename);
  return { success: true, filename };
}

// --------------------------------------------------------------------------
// 2. GENERATE MOCK ALLOTMENT RESULT PDF
// --------------------------------------------------------------------------
export async function generateMockResultPdf(options: UniversalPdfOptions): Promise<{ success: boolean; filename: string }> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const examTitle = getExamDisplayName(String(options.profile.exam), options.profile.stream);
  let currentY = drawDocHeader(
    doc,
    `${examTitle} — Mock Allotment Result`,
    'Practice Allotment Slip',
    options,
    pageWidth,
    marginX
  );

  // Result Section
  const result = options.mockResult;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('MOCK ALLOTMENT RESULT — PRACTICE ONLY', marginX, currentY + 4);

  currentY += 8;
  const resultCardHeight = 44;
  
  if (result && result.allotted && result.collegeName) {
    // Green matched card
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), resultCardHeight, 2, 2, 'FD');

    // Matched icon banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
    doc.text('HISTORICAL CUTOFF MATCH PRODUCED BY SIMULATOR', marginX + 4, currentY + 6);

    // College Name
    doc.setFontSize(11);
    doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
    doc.text(result.collegeName, marginX + 4, currentY + 13);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Code: ${result.collegeCode || 'N/A'} • Branch: ${result.branchName || 'N/A'} • Quota Basis: ${result.allotmentType || 'Merit Pool'}`, marginX + 4, currentY + 18);

    // Detail Boxes Grid inside card
    const boxY = currentY + 22;
    const boxW = (pageWidth - (marginX * 2) - 12) / 3;
    const boxH = 16;

    // Box 1: Matched Preference
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
    doc.roundedRect(marginX + 3, boxY, boxW, boxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('MATCHED PREFERENCE', marginX + 6, boxY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
    doc.text(`Choice #${result.preferenceNumber || 1}`, marginX + 6, boxY + 12);

    // Box 2: Tuition Fee
    doc.roundedRect(marginX + 6 + boxW, boxY, boxW, boxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('SIMULATED TUITION FEE', marginX + 9 + boxW, boxY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
    doc.text(result.fee ? `₹${Number(result.fee).toLocaleString()}/yr` : 'Source Not Specified', marginX + 9 + boxW, boxY + 12);

    // Box 3: Cutoff Range
    doc.roundedRect(marginX + 9 + (boxW * 2), boxY, boxW, boxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('PROBABILITY RANGE', marginX + 12 + (boxW * 2), boxY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(EMERALD_GREEN[0], EMERALD_GREEN[1], EMERALD_GREEN[2]);
    doc.text(`${result.probabilityRange || 'HIGH'} Cutoff Match`, marginX + 12 + (boxW * 2), boxY + 12);

    currentY += resultCardHeight + 8;
  } else {
    // Red/Amber no match card
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('NO HISTORICAL CUTOFF MATCH IN CURRENT SELECTIONS', marginX + 4, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Based on your entered merit ranking and selected preferences, your choices were more competitive than historical cutoff boundaries.', marginX + 4, currentY + 14);
    doc.text('STRATEGIC COUNSELOR RECOMMENDATION: Add 3 to 5 realistic target/safety colleges to ensure robust admission safety.', marginX + 4, currentY + 20);

    currentY += 40;
  }

  // Summary Table of top preferences for context
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('SUBMITTED PREFERENCES SUMMARY (TOP SELECTIONS)', marginX, currentY);
  currentY += 4;

  const topChoices = options.choices.slice(0, 15).map(c => [
    `#${c.priority}`,
    c.code,
    c.name,
    c.branchOrProgram,
    (result?.preferenceNumber === c.priority) ? '★ MATCHED' : (c.probability || 'Evaluated')
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['Pref', 'Code', 'College Name', 'Branch / Program', 'Simulation Status']],
    body: topChoices,
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 78 },
      3: { cellWidth: 46 },
      4: { cellWidth: 28, halign: 'center' }
    }
  });

  drawFooters(doc, pageWidth, pageHeight, examTitle);

  const cleanExam = String(options.profile.exam).replace(/[^a-zA-Z0-9]/g, '_');
  const cleanStream = String(options.profile.stream || 'GENERAL').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `CounselorPro_${cleanExam}_${cleanStream}_Mock_Result.pdf`;
  doc.save(filename);
  return { success: true, filename };
}

// --------------------------------------------------------------------------
// 3. GENERATE COMBINED REPORT PDF (Complete Allotment + Full Preference Table)
// --------------------------------------------------------------------------
export async function generateCombinedReportPdf(options: UniversalPdfOptions): Promise<{ success: boolean; filename: string }> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const examTitle = getExamDisplayName(String(options.profile.exam), options.profile.stream);
  let currentY = drawDocHeader(
    doc,
    `${examTitle} — Complete Counselling Report`,
    'Complete Comprehensive Report',
    options,
    pageWidth,
    marginX
  );

  // Section 1: Mock Allotment Result Banner
  const result = options.mockResult;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text('SECTION 1: MOCK ALLOTMENT OUTCOME', marginX, currentY + 3);
  currentY += 6;

  if (result && result.allotted && result.collegeName) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
    doc.text(`Matched Choice #${result.preferenceNumber}: ${result.collegeName} (${result.collegeCode || ''})`, marginX + 3, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Branch: ${result.branchName || 'General'}  |  Basis: ${result.allotmentType || 'Merit Pool'}  |  Range: ${result.probabilityRange || 'HIGH'}`, marginX + 3, currentY + 13);
    doc.text(`Simulated Tuition Fee: ${result.fee ? `₹${Number(result.fee).toLocaleString()}/yr` : 'Not specified in dataset'}`, marginX + 3, currentY + 18);

    currentY += 28;
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('No Historical Cutoff Match In Selected Preferences', marginX + 3, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Consider adding safety choices with higher closing ranks to broaden your admission coverage.', marginX + 3, currentY + 11);

    currentY += 22;
  }

  // Section 2: Complete College Preference Table (All choices 1 to N, auto-paginated)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(DEEP_SLATE[0], DEEP_SLATE[1], DEEP_SLATE[2]);
  doc.text(`SECTION 2: COMPLETE ORDERED COLLEGE PREFERENCE MATRIX (${options.choices.length} CHOICES)`, marginX, currentY);
  currentY += 3;

  const rows = options.choices.map(c => [
    `#${c.priority}`,
    c.code || 'UNKN',
    c.name || 'Unknown Institution',
    c.branchOrProgram || 'Program',
    c.districtOrState || c.authority || 'Statewide',
    (result?.preferenceNumber === c.priority) ? '★ ALLOTTED' : (c.historicalCutoff ? String(c.historicalCutoff) : (c.probability || 'Evaluated'))
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['Pref #', 'Code', 'College Name', 'Branch / Academic Programme', 'District / Location', 'Simulation / Cutoff']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 16, fontStyle: 'bold' },
      2: { cellWidth: 68 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24 },
      5: { cellWidth: 20, halign: 'right' }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  drawFooters(doc, pageWidth, pageHeight, examTitle);

  const cleanExam = String(options.profile.exam).replace(/[^a-zA-Z0-9]/g, '_');
  const cleanStream = String(options.profile.stream || 'GENERAL').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `CounselorPro_${cleanExam}_${cleanStream}_Complete_Report.pdf`;
  doc.save(filename);
  return { success: true, filename };
}
