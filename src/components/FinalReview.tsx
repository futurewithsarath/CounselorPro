import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentProfile, WebOption, MockAllotmentResult } from '../types';
import { COLLEGES_DB, COLLEGES_DATASET_METADATA, COLLEGES_SOURCE_YEAR, getCollegeCutoff, getEligibleCutoff, getCollegesForStream, isCollegeAvailableToGender, hasLocalAreaCutoffs } from '../data/colleges';
import { ArrowLeft, CheckCircle2, Award, Download, Building, DollarSign, Calendar, FileText, Sparkles, HelpCircle, AlertTriangle } from 'lucide-react';
import MotionButton from './ui/MotionButton';
import Confetti from './ui/Confetti';
import MockAllotmentScanner from './ui/MockAllotmentScanner';

interface FinalReviewProps {
  profile: StudentProfile;
  selectedOptions: WebOption[];
  onBack: () => void;
  onFinish: () => void;
}

export default function FinalReview({ profile, selectedOptions, onBack, onFinish }: FinalReviewProps) {
  const [allotment, setAllotment] = useState<MockAllotmentResult | null>(null);
  const [runningAllotment, setRunningAllotment] = useState<boolean>(false);

  // Core Mock Allotment Algorithm based on actual EAPCET/EAMCET reservation/cutoff bounds
  const runAllotmentLogic = () => {
    setRunningAllotment(true);
  };

  const handleScanFinished = () => {
    let allottedResult: MockAllotmentResult = { allotted: false };
    const collegesList = getCollegesForStream(profile.stream);

    // Loop through choices in sequential priority order (1 to N)
    for (let i = 0; i < selectedOptions.length; i++) {
      const option = selectedOptions[i];
      // Match option against our DB
      const collegeDb = collegesList.find(c => c.id === option.collegeId);
      
      if (collegeDb && isCollegeAvailableToGender(collegeDb, profile.gender)) {
        const openCutoff = profile.category === 'OC' ? null : getCollegeCutoff(collegeDb, 'OC', profile.gender, profile.region);
        const cutoff = getEligibleCutoff(collegeDb, profile.category, profile.gender, profile.region);

        if (cutoff !== null && profile.rank <= cutoff) {
          allottedResult = {
            allotted: true,
            college: collegeDb,
            optionNumber: option.priority,
            categoryUsed: openCutoff !== null && profile.rank <= openCutoff ? 'OC' : profile.category,
            allotmentType: hasLocalAreaCutoffs() ? `Historical ${profile.region} cutoff match` : 'Historical cutoff match',
            message: `You successfully matched historical seat cutoff boundaries at priority order #${option.priority}.`
          };
          break; // Matched highest preference, exit loop!
        }
      }
    }

    setAllotment(allottedResult);
    setRunningAllotment(false);
  };

  // Printable registered list PDF simulation action
  const handleDownloadSlip = () => {
    const area = profile.exam === 'TS_EAMCET'
      ? ` (Telangana ${profile.region === 'NON_LOCAL' ? '15% Unreserved Quota' : 'OU Local Quota'})`
      : ` (${profile.region === 'NON_LOCAL' ? 'AP 15% Unreserved Quota' : `${profile.region} Local Area`})`;
    const header = `=== COUNSELORPRO PRACTICE OPTIONS LIST ===\nEXAM: ${profile.exam} (${profile.stream})\nRANK: ${profile.rank}\nCATEGORY: ${profile.category}${area}\nGENDER: ${profile.gender}\nGENERATED: ${new Date().toLocaleDateString()}\nPRACTICE COPY ONLY - NOT SUBMITTED TO AN ADMISSIONS AUTHORITY\n\n`;
    const choices = selectedOptions
      .map(o => `Option #${o.priority}: [${o.collegeCode}] ${o.collegeName} - Branch: ${o.branchName || o.branch} (${o.branch})${o.fee === null ? '' : ` (Fee: ₹${o.fee.toLocaleString()}/yr)`}`)
      .join('\n');
    
    const footer = `\n\n======================================\nHistorical cutoff data is for practice only and does not guarantee a future seat.`;
    const fileContent = header + choices + footer;

    const element = document.createElement("a");
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `CounselorPro_${profile.exam}_${profile.stream}_Practice_Options.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Professional PDF report generator using jsPDF and jspdf-autotable
  const handleDownloadPDF = () => {
    try {
      void generatePdf();
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      alert("An error occurred while generating the PDF: " + err.message);
    }
  };

  const generatePdf = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Border Accent (Dark Slate/Teal color scheme)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 6, 'F');

      // Decorative header badge
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(pageWidth / 2 - 40, 10, 80, 8, 2, 2, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("COUNSELORPRO PRACTICE COPY", pageWidth / 2, 15, { align: 'center' });

      // Title & Council
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("YOUR COUNSELLING PRACTICE LIST", pageWidth / 2, 28, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text("PRIORITIZED WEB OPTIONS", pageWidth / 2, 34, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Historical cutoff dataset: ${COLLEGES_DATASET_METADATA?.sourceTitle || 'Not available'} (${COLLEGES_SOURCE_YEAR ?? 'n/a'}) • CounselorPro practice copy`, pageWidth / 2, 39, { align: 'center' });

      // Dividers
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 43, pageWidth - 15, 43);

      // Student Profile Metadata Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(15, 47, pageWidth - 30, 32, 2, 2, 'FD');

      // Heading for student details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("PRACTICE PROFILE DETAILS", 20, 53);

      doc.setDrawColor(241, 245, 249);
      doc.line(20, 55, pageWidth - 20, 55);

      // Metadata Key-Value pairs
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      
      // Col 1
      doc.text("EXAM / STREAM:", 20, 61);
      doc.text("SECURED RANK:", 20, 67);
      doc.text("GENDER:", 20, 73);

      // Col 2
      doc.text("RESERVATION CATEGORY:", 110, 61);
      doc.text(hasLocalAreaCutoffs() ? "LOCAL REGION:" : "CUTOFF AREA:", 110, 67);
      doc.text("SUBMISSION DATE:", 110, 73);

      // Values
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(String(profile.exam || '').replace('_', ' ') + ` (${profile.stream || ''})`, 55, 61);
      doc.text(Number(profile.rank || 0).toLocaleString(), 55, 67);
      doc.text(String(profile.gender || ''), 55, 73);

      doc.text(String(profile.category || ''), 155, 61);
      doc.text(hasLocalAreaCutoffs() ? String(profile.region || '') : 'Not split in source', 155, 67);
      doc.text(new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(), 155, 73);

      // Table Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("PRACTICE CHOICE SEQUENCE & PRIORITY ORDER", 15, 88);

      // Options table
      const tableHeaders = [['No.', 'Code', 'College/Institution Name', 'Branch', 'Annual Fee']];
      const tableRows = selectedOptions.map(opt => [
        String(opt.priority),
        String(opt.collegeCode),
        String(opt.collegeName),
        String(opt.branchName || opt.branch),
        opt.fee === null ? 'Not listed' : `Rs. ${opt.fee.toLocaleString()}/-`
      ]);

      // Call autoTable helper
      autoTable(doc, {
        startY: 92,
        margin: { left: 15, right: 15 },
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42], // slate-900 theme
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }, // Priority
          1: { cellWidth: 25, fontStyle: 'bold', textColor: [5, 150, 105] }, // Code (Emerald)
          2: { cellWidth: 'auto' }, // Name
          3: { cellWidth: 25, halign: 'center' }, // Branch
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } // Fee
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        }
      });

      // Get Y coordinate after table
      let finalY = (doc as any).lastAutoTable.finalY + 10;

      // Check if signature box would overflow page height, if so start new page or handle gracefully
      if (finalY + 45 > pageHeight) {
        doc.addPage();
        finalY = 20;
      }

      // Digital Integrity Footer Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, finalY, pageWidth - 30, 32, 2, 2, 'FD');

      // Integrity Details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text("PRACTICE COPY - NOT AN OFFICIAL COUNSELLING SUBMISSION", 20, finalY + 10);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Cutoff comparisons use the source year shown above and are for practice only.", 20, finalY + 15);
      doc.text("College fees are omitted when they are not present in the source data.", 20, finalY + 19);
      doc.text("Generated: " + new Date().toLocaleString(), 20, finalY + 23);
      doc.text("Student-prepared list; no options have been submitted to an authority.", 20, finalY + 27);

      // Final signature line
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("STUDENT COPY", pageWidth - 55, finalY + 24, { align: 'center' });
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(pageWidth - 75, finalY + 20, pageWidth - 15, finalY + 20);

      // Page numbers & disclaimers at the absolute bottom
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Practice copy only • Historical cutoffs do not guarantee a future seat", pageWidth / 2, pageHeight - 12, { align: 'center' });
              doc.text(`Page ${page} of ${pageCount} | CounselorPro`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }

      // Trigger standard save
      doc.save(`CounselorPro_${profile.exam}_${profile.stream}_Practice_Options.pdf`);
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      alert("An error occurred while generating the PDF: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" id="final-review-workspace">
      
      {/* Step Banner */}
      <div className="text-center mb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Step 4 of 4: Final Review & Allotment
        </span>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          Review & Run Mock Allotment
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
          Review your practice list, then compare your rank with the historical last-rank cutoffs for your category, gender, and local area.
        </p>
      </div>

      {allotment === null ? (
        <div className="space-y-6">
          
          {/* REGISTERED SLIP CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden" id="registered-slip-card">
            
            {/* Slip Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start flex-wrap gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase">COUNSELORPRO • PRACTICE COPY</span>
                <h3 className="font-sans font-extrabold text-slate-900 text-lg">Your Practice Options List</h3>
                <p className="text-xs text-slate-500">Historical cutoff practice only. This list is not submitted to an admissions authority.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MotionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadSlip}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  title="Download Slip Text Document"
                >
                  Download Plain TXT
                </MotionButton>
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadPDF}
                  leftIcon={<FileText className="w-3.5 h-3.5" />}
                  shimmer
                  title="Download practice options list PDF"
                >
                  Download as PDF
                </MotionButton>
              </div>
            </div>

            {/* Student Metadata Strip */}
            <div className="px-6 py-4 bg-slate-100/50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block uppercase text-[9px]">Exam / Stream</span>
                <span className="font-bold text-slate-800">{profile.exam?.replace('_', ' ')} / {profile.stream}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[9px]">Secured Rank</span>
                <span className="font-bold text-slate-800">{profile.rank?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[9px]">Category & Eligibility Quota</span>
                <span className="font-bold text-slate-800">
                  {profile.category} • {profile.exam === 'TS_EAMCET' ? (profile.region === 'NON_LOCAL' ? '15% Unreserved' : 'OU Local (85%)') : (profile.region === 'NON_LOCAL' ? '15% Unreserved' : `${profile.region} Local Area`)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[9px]">Practice Date</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Option Entry Slip Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-6 text-center w-20">Priority No</th>
                    <th className="py-3 px-6">College Code</th>
                    <th className="py-3 px-6">College Name</th>
                    <th className="py-3 px-6">Branch</th>
                    <th className="py-3 px-6 text-right">Fee listed in source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {selectedOptions.map((opt) => (
                    <tr key={opt.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-6 text-center font-bold text-slate-900 bg-slate-50/30 w-20 font-mono">
                        {opt.priority}
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-emerald-700">
                        {opt.collegeCode}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {opt.collegeName}
                      </td>
                      <td className="py-3 px-6">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded">
                          {opt.branchName || opt.branch}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-mono font-semibold text-slate-900">
                        {opt.fee === null ? 'Not listed in source' : `₹${opt.fee.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Call to Allotment Option or Scanner */}
          <AnimatePresence mode="wait">
            {runningAllotment ? (
              <MockAllotmentScanner
                key="scanner"
                examName={profile.exam?.replace('_', ' ') || 'EAPCET'}
                categoryName={profile.category}
                rankNumber={profile.rank}
                onScanComplete={handleScanFinished}
              />
            ) : (
              <motion.div
                key="trigger-box"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 bg-white border border-slate-200 text-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-12 bg-emerald-500/5 h-40 w-40 rounded-full blur-2xl"></div>
                <div className="space-y-1 max-w-xl z-10">
                  <div className="flex items-center gap-1.5 font-bold tracking-wide uppercase text-xs text-emerald-600">
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                    Step 5: Simulated Board Seat Allocation
                  </div>
                  <h4 className="font-sans font-extrabold text-xl text-slate-900">Ready to test your options?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clicking the button will trigger the simulated admissions council seat assignment algorithm. The system evaluates options in descending sequence against reservation boundaries.
                  </p>
                </div>
                
                <MotionButton
                  variant="primary"
                  size="lg"
                  onClick={runAllotmentLogic}
                  id="run-allotment-btn"
                  shimmer
                  className="z-10 text-sm font-bold shadow-lg shadow-emerald-600/25 shrink-0"
                >
                  Run Mock Seat Allotment
                </MotionButton>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back Trigger */}
          <div className="flex justify-start">
            <MotionButton
              variant="secondary"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Adjust Options Sequence
            </MotionButton>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Confetti Celebration on Allotment */}
          {allotment.allotted && <Confetti />}
          
          {/* MOCK ALLOTMENT ORDER LETTER BOX WITH SPRING POP-IN & GLOW */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={`bg-white border-2 shadow-2xl rounded-2xl overflow-hidden relative ${
              allotment.allotted 
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/10' 
                : 'border-slate-300'
            }`}
            id="allotment-letter"
          >
            {/* Watermark background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <Award className="w-96 h-96" />
            </div>

            {/* Letter Header */}
            <div className="p-6 border-b border-slate-200 text-center space-y-1 bg-slate-50">
              <span className="font-mono text-slate-500 text-[10px] font-bold block uppercase tracking-widest">COUNSELORPRO • HISTORICAL CUTOFF PRACTICE</span>
              <h3 className="font-sans font-black text-slate-900 text-xl tracking-tight uppercase">Mock Allotment Result</h3>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold inline-block">
                MOCK ALLOTMENT - PRACTICE ONLY
              </span>
            </div>

            {allotment.allotted ? (
              <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-700">
                <p className="leading-relaxed font-sans">
                  Your rank falls within a reported {COLLEGES_SOURCE_YEAR} final-counselling cutoff for this option in <strong>{profile.exam?.replace('_', ' ')}</strong>. This historical comparison is for practice only; it is not a seat allotment or prediction of a future result.
                </p>

                {/* Main Allotment Details Card */}
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                  <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase font-bold">COLLEGE IN HISTORICAL CUTOFF MATCH</span>
                      <h4 className="font-sans font-extrabold text-slate-900 text-base sm:text-lg">{allotment.college?.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">College Code: {allotment.college?.code} • Region: {allotment.college?.region}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-emerald-100">
                    <div className="space-y-0.5">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase font-bold">BRANCH IN MATCHED OPTION</span>
                      <p className="font-sans font-bold text-slate-900 text-sm">{allotment.college?.branch}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase font-bold">MATCHED PREFERENCE</span>
                      <p className="font-sans font-bold text-slate-900 text-sm">Priority Choice #{allotment.optionNumber}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase font-bold">ANNUAL FEE IN SOURCE</span>
                      <p className="font-sans font-bold text-slate-900 text-sm">{allotment.college?.fee === null ? 'Not listed in source' : `₹${allotment.college?.fee.toLocaleString()}/yr`}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono tracking-widest text-emerald-700 block uppercase font-bold">CUTOFF CATEGORY MATCHED</span>
                      <p className="font-sans font-bold text-slate-900 text-sm">{allotment.categoryUsed === 'OC' && profile.category !== 'OC' ? `OC open competition (profile category: ${profile.category})` : profile.category} ({allotment.allotmentType})</p>
                    </div>
                  </div>
                </div>

                {/* Reporting Instructions */}
                <div className="space-y-2 border-t border-slate-100 pt-5 text-slate-600 leading-relaxed">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    How to read this result
                  </h5>
                  <p className="text-xs">The comparison checks this option against the selected local-area, category, and gender cutoff values in the {COLLEGES_SOURCE_YEAR} source PDF. Actual counselling uses current-year rules, seat availability, and official processing.</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full w-fit mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="font-sans font-black text-slate-900 text-lg">NO HISTORICAL CUTOFF MATCH</h4>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                    Your rank of <strong>{profile.rank.toLocaleString()}</strong> is outside the reported cutoff values for the selected choices, or the source has no cutoff for one or more options. This does not determine eligibility for current or future counselling.
                  </p>
                  <div className="pt-2">
                    <MotionButton
                      variant="primary"
                      size="sm"
                      onClick={() => setAllotment(null)}
                    >
                      Go Back & Add Safety Colleges
                    </MotionButton>
                  </div>
                </div>
              </div>
            )}

            {/* Official Looking Seal/Footer */}
            {allotment.allotted && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>PRACTICE RESULT • SOURCE YEAR {COLLEGES_SOURCE_YEAR}</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  HISTORICAL CUTOFF MATCH
                </span>
              </div>
            )}
          </motion.div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
            <MotionButton
              variant="secondary"
              size="md"
              onClick={() => setAllotment(null)}
            >
              Reset Mock Allotment
            </MotionButton>
            <MotionButton
              variant="primary"
              size="lg"
              onClick={onFinish}
              id="finish-simulation-btn"
              shimmer
            >
              Submit & Complete Practice
            </MotionButton>
          </div>
        </div>
      )}
    </div>
  );
}
