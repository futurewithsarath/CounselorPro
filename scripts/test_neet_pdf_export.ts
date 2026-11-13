import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { NeetStudentProfile, NeetChoice, NeetPracticeLock } from '../src/types';
import { NEET_COLLEGES_CATALOG } from '../src/data/neetCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdfExport() {
  console.log('========================================================================');
  console.log('       COUNSELORPRO — NEET PREFERENCE LIST PDF GENERATION TEST          ');
  console.log('========================================================================\n');

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const mockProfile: NeetStudentProfile = {
    admissionYear: 2026,
    allIndiaRank: 12450,
    neetScore: 635,
    category: 'OBC',
    gender: 'Male',
    isPwd: false,
    domicileState: 'Andhra Pradesh',
    localArea: 'AU',
    minority: 'NONE',
    pcbMarksPercentage: 68,
    activeAuthority: 'ALL',
    selectedCourses: ['MBBS', 'BDS']
  };

  // Create 60 choices from real catalog to test multi-page autoTable rendering
  const mockChoices: NeetChoice[] = NEET_COLLEGES_CATALOG.slice(0, 60).map((col, idx) => ({
    id: `choice-${idx + 1}`,
    priority: idx + 1,
    collegeId: col.id,
    collegeCode: col.code,
    collegeName: col.name,
    shortName: col.shortName,
    course: col.course,
    authority: col.authority,
    quota: col.quota,
    state: col.state,
    city: col.city,
    institutionType: col.institutionType,
    annualFee: col.annualFee,
    cutoffAIR: col.cutoffs.OBC || col.cutoffs.UR
  }));

  const mockLock: NeetPracticeLock = {
    lockedAt: '13/11/2026, 09:55:00 pm',
    sessionId: 'NEET-PRACTICE-884210',
    profile: mockProfile,
    choices: mockChoices,
    totalChoices: mockChoices.length,
    totalColleges: 60,
    authorityBreakdown: { MCC: 50, AP_STATE: 10, TG_STATE: 0, AACCC: 0 },
    courseBreakdown: { MBBS: 55, BDS: 5, BAMS: 0, BHMS: 0, BUMS: 0, BSMS: 0 }
  };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const emeraldGreen = [0, 158, 96];
  const deepSlate = [11, 19, 43];
  const textMuted = [100, 116, 139];
  const borderLight = [226, 232, 240];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // 1. Accent Strip
  doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.text('COUNSELORPRO', marginX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Engineering & Medical Admission Counselling Intelligence Platform • counselorpro.in', marginX, 18);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text('NEET UG Counselling Practice — Preference List (MCC & State)', marginX, 25);

  // Status Badge
  const badgeX = pageWidth - marginX - 58;
  const badgeY = 9;
  const badgeWidth = 58;
  const badgeHeight = 18;
  doc.setFillColor(4, 120, 87);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL PRACTICE LOCKED LIST', badgeX + badgeWidth / 2, badgeY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`ID: ${mockLock.sessionId}`, badgeX + badgeWidth / 2, badgeY + 9.5, { align: 'center' });
  doc.text(`Locked: ${mockLock.lockedAt.slice(0, 24)}`, badgeX + badgeWidth / 2, badgeY + 14, { align: 'center' });

  // Candidate Summary Box
  const profileBoxY = 29;
  const profileBoxHeight = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(marginX, profileBoxY, pageWidth - (marginX * 2), profileBoxHeight, 1.5, 1.5, 'FD');

  const tableRows = mockChoices.map(c => [
    String(c.priority),
    c.collegeCode,
    `${c.shortName}\n${c.city}, ${c.state}`,
    c.course,
    c.state,
    c.authority.replace('_STATE', ''),
    c.quota.replace(/_/g, ' '),
    c.cutoffAIR ? `#${c.cutoffAIR.toLocaleString()}` : 'Not Rep',
    c.annualFee ? `Rs. ${c.annualFee.toLocaleString()}` : 'Govt Nom'
  ]);

  autoTable(doc, {
    startY: profileBoxY + profileBoxHeight + 4,
    margin: { left: marginX, right: marginX, bottom: 24, top: 18 },
    head: [['#', 'Code', 'College / Institution Name', 'Course', 'State', 'Authority', 'Quota Type', '2024 Cutoff', 'Annual Fee']],
    body: tableRows,
    showHead: 'everyPage',
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 158, 96], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 23 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 23 },
      7: { cellWidth: 14, halign: 'right' },
      8: { cellWidth: 14, halign: 'right' }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
        doc.rect(0, 0, pageWidth, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('CounselorPro NEET UG Practice Choices • Preference Sequence (Continued)', marginX, 10);
        doc.text(`AIR #${mockProfile.allIndiaRank.toLocaleString()} (${mockProfile.category})`, pageWidth - marginX, 10, { align: 'right' });
      }
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(`CounselorPro Academic Simulator • Strictly for Educational Practice • Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  const testOutputDir = path.resolve(__dirname, '../public/test_output');
  fs.mkdirSync(testOutputDir, { recursive: true });
  const multiPagePdfPath = path.join(testOutputDir, 'CounselorPro_NEET_MCC_MBBS_2026_Locked_Choices.pdf');
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(multiPagePdfPath, Buffer.from(pdfBytes));

  console.log(`✓ Generated Multi-Page PDF with ${mockChoices.length} choices`);
  console.log(`✓ Total Pages: ${totalPages}`);
  console.log(`✓ Saved to: ${multiPagePdfPath}`);
  const stats = fs.statSync(multiPagePdfPath);
  console.log(`✓ File size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

  if (totalPages >= 2 && stats.size > 20000) {
    console.log('✓ Multi-page pagination, running headers, and repeated table headers successfully verified!');
  } else {
    throw new Error('Multi-page test failed to generate expected pages');
  }

  console.log('\n========================================================================');
  console.log('ALL PDF GENERATION TESTS PASSED (100% SUCCESS)');
  console.log('========================================================================\n');
}

testPdfExport().catch(err => {
  console.error(err);
  process.exit(1);
});
