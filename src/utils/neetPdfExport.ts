/**
 * CounselorPro — NEET UG Counselling Preference List PDF Generator
 * Generates an authentic, academic-grade, multi-page printable PDF of the student's complete choice list.
 * 
 * Supports:
 * - Unlocked Draft Preference Lists
 * - Final Locked Practice Sessions with Session ID & Verification Hash
 * - Multi-page table auto-continuation with repeated column headers
 * - Strict preference order preservation
 * - Fully client-side using jspdf and jspdf-autotable
 */

import { NeetStudentProfile, NeetChoice, NeetPracticeLock } from '../types';

export interface GenerateNeetPdfOptions {
  profile: NeetStudentProfile;
  choices: NeetChoice[];
  lockData?: NeetPracticeLock | null;
  isLocked?: boolean;
}

export async function generateNeetPreferencePdf({
  profile,
  choices,
  lockData,
  isLocked = false
}: GenerateNeetPdfOptions): Promise<{ success: boolean; filename: string }> {
  if (!choices || choices.length === 0) {
    throw new Error('Your preference list is empty. Add at least one college before downloading your PDF.');
  }

  // Dynamic import of jspdf and jspdf-autotable for optimal bundle performance
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;

  // Primary Theme Colors (CounselorPro Brand Palette)
  const emeraldGreen = [0, 158, 96]; // #009E60
  const deepSlate = [11, 19, 43];    // #0B132B
  const textMuted = [100, 116, 139]; // #64748B
  const borderLight = [226, 232, 240];

  // 1. Top Decorative Brand Accent Strip
  doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Branding
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
  const authorityTitle = profile.activeAuthority === 'ALL' 
    ? 'All India & State Authorities' 
    : (profile.activeAuthority === 'MCC' ? 'MCC All India Quota' : profile.activeAuthority);
  doc.text(`NEET UG Counselling Practice — Preference List (${authorityTitle})`, marginX, 25);

  // 3. Status Badge Box (Top Right)
  const badgeX = pageWidth - marginX - 58;
  const badgeY = 9;
  const badgeWidth = 58;
  const badgeHeight = 18;

  if (isLocked && lockData) {
    // Locked Practice Badge
    doc.setFillColor(4, 120, 87); // #047857
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PRACTICE CHOICES LOCKED', badgeX + badgeWidth / 2, badgeY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`ID: ${lockData.sessionId}`, badgeX + badgeWidth / 2, badgeY + 9.5, { align: 'center' });
    doc.text(`Locked: ${lockData.lockedAt.slice(0, 24)}`, badgeX + badgeWidth / 2, badgeY + 14, { align: 'center' });
  } else {
    // Draft Practice Badge
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('PRACTICE SESSION DRAFT', badgeX + badgeWidth / 2, badgeY + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Choices Not Yet Locked', badgeX + badgeWidth / 2, badgeY + 11, { align: 'center' });
    doc.text(`Exported: ${new Date().toLocaleDateString('en-IN')}`, badgeX + badgeWidth / 2, badgeY + 15, { align: 'center' });
  }

  // 4. Student Profile & Simulation Parameters Card
  const profileBoxY = 29;
  const profileBoxHeight = 22;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(marginX, profileBoxY, pageWidth - (marginX * 2), profileBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  
  // Column 1
  const col1X = marginX + 3;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text('CANDIDATE PARAMETERS', col1X, profileBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`All India Rank (AIR): `, col1X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.text(`#${profile.allIndiaRank.toLocaleString()}`, col1X + 27, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`NEET Score: `, col1X, profileBoxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.neetScore} / 720`, col1X + 17, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`PCB Aggregate: `, col1X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.pcbMarksPercentage}%`, col1X + 20, profileBoxY + 19.5);

  // Column 2
  const col2X = marginX + 64;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text('RESERVATION & DOMICILE', col2X, profileBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Category: `, col2X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.category} ${profile.isPwd ? '(PwD)' : ''}`, col2X + 14, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Gender: `, col2X, profileBoxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.gender}`, col2X + 12, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Domicile State: `, col2X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.domicileState}${profile.localArea ? ` (${profile.localArea})` : ''}`, col2X + 20, profileBoxY + 19.5);

  // Column 3
  const col3X = marginX + 128;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text('PRACTICE SESSION DETAILS', col3X, profileBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Selected Options: `, col3X, profileBoxY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.text(`${choices.length} Choices`, col3X + 24, profileBoxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Academic Courses: `, col3X, profileBoxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.selectedCourses.join(', ')}`, col3X + 26, profileBoxY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Admission Year: `, col3X, profileBoxY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(deepSlate[0], deepSlate[1], deepSlate[2]);
  doc.text(`${profile.admissionYear || 2026}`, col3X + 23, profileBoxY + 19.5);

  // 5. Build Complete Preferences Table
  // Suggested Columns:
  // 1. Pref #
  // 2. Code
  // 3. College / Institution Name (with City & State)
  // 4. Course
  // 5. State
  // 6. Authority
  // 7. Quota / Seat Type
  // 8. 2024 Cutoff AIR
  // 9. Annual Fee
  const tableRows = choices.map((c) => {
    const feeStr = c.annualFee ? `Rs. ${c.annualFee.toLocaleString()}` : 'Govt Nom';
    const cutoffStr = c.cutoffAIR ? `#${c.cutoffAIR.toLocaleString()}` : 'Not Rep';
    return [
      String(c.priority),
      c.collegeCode,
      `${c.shortName}\n${c.city}, ${c.state}`,
      c.course,
      c.state,
      c.authority.replace('_STATE', ''),
      c.quota.replace(/_/g, ' '),
      cutoffStr,
      feeStr
    ];
  });

  autoTable(doc, {
    startY: profileBoxY + profileBoxHeight + 4,
    margin: { left: marginX, right: marginX, bottom: 24, top: 18 },
    head: [[
      '#',
      'Code',
      'College / Institution Name',
      'Course',
      'State',
      'Authority',
      'Quota Type',
      '2024 Cutoff',
      'Annual Fee'
    ]],
    body: tableRows,
    showHead: 'everyPage',
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [0, 158, 96],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [250, 252, 254]
    },
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
      // Running header on pages after the first
      if (data.pageNumber > 1) {
        doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
        doc.rect(0, 0, pageWidth, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(
          `CounselorPro NEET UG Practice Choices • Preference Sequence (Continued)`,
          marginX,
          10
        );
        doc.text(
          `AIR #${profile.allIndiaRank.toLocaleString()} (${profile.category})`,
          pageWidth - marginX,
          10,
          { align: 'right' }
        );
      }
    }
  });

  // 6. Disclaimer & Bottom Signature Box
  let finalY = (doc as any).lastAutoTable?.finalY + 6;
  if (finalY + 22 > pageHeight - 16) {
    doc.addPage();
    finalY = 18;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(marginX, finalY, pageWidth - (marginX * 2), 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('MANDATORY STATUTORY DISCLAIMER:', marginX + 3, finalY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  const disclaimerText = 
    'This document is generated by CounselorPro for counselling practice and personal reference only. ' +
    'It is not an official counselling application, choice submission, seat allotment order or admission confirmation. ' +
    'Students must complete their actual counselling procedures through the relevant official admission authority ' +
    '(MCC, Dr. YSRUHS, KNRUHS, or AACCC). Historical cutoff ranks are reference benchmarks and do not guarantee future allotment.';
  
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - (marginX * 2) - 6);
  doc.text(splitDisclaimer, marginX + 3, finalY + 8);

  // 7. Page Numbering & Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `CounselorPro Academic Simulator • Strictly for Educational Practice • Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // 8. Filename formatting
  const authCode = profile.activeAuthority === 'ALL' ? 'MCC_STATE' : profile.activeAuthority;
  const courseCode = profile.selectedCourses.length === 1 ? profile.selectedCourses[0] : 'MED';
  const statusStr = isLocked ? 'Locked' : 'Draft';
  const filename = `CounselorPro_NEET_${authCode}_${courseCode}_${profile.admissionYear || 2026}_${statusStr}_Choices.pdf`;

  // Trigger download
  doc.save(filename);

  return {
    success: true,
    filename
  };
}
