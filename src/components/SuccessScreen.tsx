import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Compass, 
  Award, 
  Download, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle, 
  Building, 
  TrendingUp, 
  CheckCircle2, 
  MapPin, 
  ShieldCheck,
  Share2,
  Users,
  Copy,
  MessageCircle,
  Send,
  Heart
} from 'lucide-react';
import { StudentProfile, WebOption, MockAllotmentResult, College } from '../types';
import { COLLEGES_DB, COLLEGES_DATASET_METADATA, COLLEGES_SOURCE_YEAR, getCollegeCutoff, getEligibleCutoff, getSeatProbability, isCollegeAvailableToGender, hasLocalAreaCutoffs } from '../data/colleges';
import MotionButton from './ui/MotionButton';
import Confetti from './ui/Confetti';

interface SuccessScreenProps {
  profile: StudentProfile;
  selectedOptions: WebOption[];
  optionsLength: number;
  onReset: () => void;
}

const ANALYSIS_STEPS = [
  "Retrieving choice submission matrix...",
  "Matching candidate category quotas against reservation pools...",
  "Applying regional local vs non-local priority guidelines...",
  "Scanning historical convenor seat cutoff boundaries...",
  "Comparing your options with the historical cutoff data..."
];

export default function SuccessScreen({ profile, selectedOptions, optionsLength, onReset }: SuccessScreenProps) {
  const [analyzing, setAnalyzing] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>(ANALYSIS_STEPS[0]);
  const [allotment, setAllotment] = useState<MockAllotmentResult | null>(null);
  const [alternatives, setAlternatives] = useState<College[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const sourceLabel = COLLEGES_DATASET_METADATA?.sourceTitle && COLLEGES_SOURCE_YEAR
    ? `${COLLEGES_DATASET_METADATA.sourceTitle} (${COLLEGES_SOURCE_YEAR})`
    : 'No verified historical dataset';

  useEffect(() => {
    // 1. Core Mock Allotment Algorithm based on actual reservation and cutoff boundaries
    let allottedResult: MockAllotmentResult = { allotted: false };

    for (let i = 0; i < selectedOptions.length; i++) {
      const option = selectedOptions[i];
      const collegeDb = COLLEGES_DB.find(c => c.id === option.collegeId);
      
      if (collegeDb && collegeDb.exam === profile.exam && collegeDb.stream === profile.stream && isCollegeAvailableToGender(collegeDb, profile.gender)) {
        const openCutoff = profile.category === 'OC' ? null : getCollegeCutoff(collegeDb, 'OC', profile.gender, profile.region);
        const cutoff = getEligibleCutoff(collegeDb, profile.category, profile.gender, profile.region);

        if (cutoff !== null && profile.rank <= cutoff) {
          allottedResult = {
            allotted: true,
            college: collegeDb,
            optionNumber: option.priority,
            categoryUsed: openCutoff !== null && profile.rank <= openCutoff ? 'OC' : profile.category,
            allotmentType: hasLocalAreaCutoffs() ? `Historical ${profile.region} cutoff match` : 'Historical cutoff match',
            message: `Historical cutoff match at priority order #${option.priority}.`
          };
          break; // Stop at highest preference
        }
      }
    }

    // Find additional colleges whose reported historical cutoffs are near this rank.
    const candidates = COLLEGES_DB.filter(c => {
      if (c.exam !== profile.exam || c.stream !== profile.stream || !isCollegeAvailableToGender(c, profile.gender)) return false;
      const cutoff = getEligibleCutoff(c, profile.category, profile.gender, profile.region);
      // Find colleges where student rank is within acceptable buffer
      return cutoff !== null && profile.rank <= cutoff * 1.6;
    });

    // Sort by distance from the reported cutoff; suggestions are not guarantees.
    const sortedAlts = candidates
      .map(c => ({
        college: c,
        score: Math.abs((getEligibleCutoff(c, profile.category, profile.gender, profile.region) ?? profile.rank) - profile.rank)
      }))
      .sort((a, b) => a.score - b.score)
      .map(item => item.college)
      // Exclude colleges already chosen by user to avoid duplicate suggestions
      .filter(c => !selectedOptions.some(opt => opt.collegeId === c.id))
      .slice(0, 3);

    setAlternatives(sortedAlts);
    setAllotment(allottedResult);

    // Show a short progress state while the historical cutoff comparison is prepared.
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < ANALYSIS_STEPS.length) {
        setLoadingText(ANALYSIS_STEPS[stepIndex]);
      } else {
        clearInterval(interval);
        setAnalyzing(false);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [profile, selectedOptions]);

  // Download a local practice summary without the student's hall-ticket identifier.
  const handleDownloadRegisteredSummary = () => {
    const area = profile.exam === 'TS_EAMCET'
      ? `Telangana Eligibility: ${profile.region === 'NON_LOCAL' ? '15% Unreserved Quota (G.O.Ms. 15)' : 'OU Local (85% Local Quota)'}`
      : `AP Local Area: ${profile.region === 'NON_LOCAL' ? '15% Statewide Unreserved Pool' : `${profile.region} Local Area`}`;
    const fileContent = `COUNSELORPRO PRACTICE OPTIONS SUMMARY\nPRACTICE COPY ONLY - NOT AN OFFICIAL ALLOTMENT\nExam: ${profile.exam} (${profile.stream})\nRank: ${profile.rank}\nCategory: ${profile.category}\n${area}\nGender: ${profile.gender}\nOptions: ${optionsLength}\nGenerated: ${new Date().toLocaleDateString()}\n\nHistorical cutoff comparisons do not guarantee a future seat.`;
    
    const element = document.createElement("a");
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `CounselorPro_${profile.exam}_${profile.stream}_Practice_Summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadOptionsPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('CounselorPro Practice List', 15, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Exam: ${profile.exam} (${profile.stream})  |  Historical dataset: ${sourceLabel}`, 15, 28);
    doc.text(`Rank: ${profile.rank.toLocaleString()}  |  Category: ${profile.category}  |  Gender: ${profile.gender}${hasLocalAreaCutoffs() ? `  |  Local area: ${profile.region}` : '  |  No local-area split reported'}`, 15, 34);
    doc.text(`Historical cutoff comparison: ${allotment?.allotted && allotment.college ? `Option #${allotment.optionNumber} - ${allotment.college.code} / ${allotment.college.branch}` : 'No match in selected options'}`, 15, 40);

    const rows = selectedOptions.map(option => {
      const college = COLLEGES_DB.find(item => item.id === option.collegeId);
      const cutoff = college ? getEligibleCutoff(college, profile.category, profile.gender, profile.region) : null;
      return [String(option.priority), option.collegeCode, option.collegeName, option.branchName || option.branch, cutoff?.toLocaleString() ?? 'Not reported'];
    });
    autoTable(doc, {
      startY: 48,
      margin: { left: 15, right: 15 },
      head: [['Priority', 'Code', 'College', 'Branch', `Applicable ${COLLEGES_SOURCE_YEAR ?? 'historical'} last rank`]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 22 }, 3: { cellWidth: 24 }, 4: { cellWidth: 37 } },
    });

    let footerY = (doc as any).lastAutoTable.finalY + 9;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (footerY + 12 > pageHeight - 18) {
      doc.addPage();
      footerY = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Practice copy only. Historical final-counselling last ranks do not guarantee a future seat.', 15, footerY);
    doc.text('Tuition fees are not included in the uploaded cutoff PDF.', 15, footerY + 5);
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${page} of ${pageCount} • CounselorPro practice copy`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
    doc.save(`CounselorPro_${profile.exam}_${profile.stream}_Practice_List.pdf`);
  };

  // Copy structured text summary to clipboard or share using Web Share API
  const handleShareSimulationResult = async () => {
    let resultText = `🌟 CounselorPro Historical Cutoff Practice Result 🌟\n`;
    resultText += `--------------------------------------------------\n`;
    resultText += `🎓 Entrance Exam: ${profile.exam === 'TS_EAMCET' ? 'TS EAMCET (Telangana)' : 'AP EAPCET (Andhra Pradesh)'}\n`;
    resultText += `🏆 Candidate Rank: ${profile.rank.toLocaleString()}\n`;
    resultText += `📂 Quota Category: ${profile.category}${hasLocalAreaCutoffs() ? ` (${profile.region} Region)` : ''}\n`;
    resultText += `🎯 Choices Submitted: ${optionsLength} Colleges\n`;
    resultText += `--------------------------------------------------\n`;
    
    if (allotment && allotment.allotted && allotment.college) {
      resultText += `🏫 HISTORICAL CUTOFF MATCH:\n`;
      resultText += `   ${allotment.college.name} (${allotment.college.code})\n`;
      resultText += `💻 Course/Branch: ${allotment.college.branch}\n`;
      resultText += `🎯 Matched Preference Order: Choice #${allotment.optionNumber}\n`;
      resultText += `📈 Rank vs ${COLLEGES_SOURCE_YEAR ?? 'historical'} cutoff: ${getSeatProbability(allotment.college, profile.rank, profile.category, profile.gender, profile.region)} range\n`;
      resultText += `💰 Tuition Fee: ${allotment.college.fee === null ? 'Not listed in source' : `₹${allotment.college.fee.toLocaleString()}/Year`}\n`;
    } else {
      resultText += `❌ No historical cutoff match in the selected options.\n`;
    }
    
    resultText += `--------------------------------------------------\n`;
    resultText += `🚀 Practice web options, check cutoffs, and prevent locking errors at CounselorPro!\n`;
    resultText += `🔗 Try it yourself here: ${window.location.origin}\n`;

    const copyToClipboardFallback = () => {
      navigator.clipboard.writeText(resultText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My CounselorPro AI Counselling Simulation Result',
          text: resultText,
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Web Share interaction dismissed or failed:', err);
        // Only copy to clipboard if the user didn't explicitly abort/cancel the share window
        if (err instanceof Error && err.name !== 'AbortError') {
          copyToClipboardFallback();
        }
      }
    } else {
      copyToClipboardFallback();
    }
  };

  // Generate professional invitation text for classmates
  const getShareText = () => {
    const url = window.location.origin;
    return `Hey! AP/TS EAPCET & EAMCET option entry is starting soon. Check out this free CounselorPro Web Options Simulator to check your seat allotment probability based on previous cutoffs and optimize your list. It prevents selection and locking errors: ${url}`;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent('AP/TS EAPCET & EAMCET Web Options Simulator - Check your seat allotment probability! Try it here:')}`, '_blank');
  };

  const handleCopyInviteLink = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CounselorPro AI Simulator',
          text: 'AP & TS EAMCET/EAPCET Web Options Simulator - Check your seat allotment probability!',
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyInviteLink();
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4" id="success-screen">
      <Confetti />
      
      {/* Top celebratory state */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mx-auto h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs mb-4"
        >
          <Check className="w-10 h-10 stroke-[3]" />
        </motion.div>
      <h2 className="font-sans font-black text-3xl text-slate-900 tracking-tight">
          Practice List Ready
        </h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
          Your options were compared with the selected historical cutoff dataset. No official options were submitted.
        </p>
      </div>

      {/* Historical Cutoff Comparison */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-8 animate-fade-in" id="ai-allotment-workspace">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
            <h3 className="font-sans font-extrabold text-slate-900 text-sm sm:text-base">
              Historical Cutoff Comparison
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Live Simulator
          </span>
        </div>

        {analyzing ? (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative flex items-center justify-center h-20 w-20 mb-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
              <div className="relative rounded-full h-14 w-14 bg-emerald-50 flex items-center justify-center border border-emerald-200">
                <Compass className="w-7 h-7 text-emerald-600 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
            
            <p className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest animate-pulse mb-2">
              Processing Allotment Logic...
            </p>
            <p className="text-sm text-slate-500 max-w-sm font-mono h-12 leading-relaxed">
              {loadingText}
            </p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            {allotment?.allotted && allotment.college ? (
              <div className="space-y-6">
                
                {/* PROVISIONAL SEAT CARD */}
                <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-200/80 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 bg-emerald-500/10 h-32 w-32 rounded-full blur-xl"></div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-100 flex-shrink-0 mt-0.5">
                        <Building className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                          <span className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-600 uppercase block">Historical Cutoff Match</span>
                        <h4 className="font-sans font-black text-slate-900 text-lg leading-snug">
                          {allotment.college.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                          <span>Code: <strong className="text-slate-800">{allotment.college.code}</strong></span>
                          <span>•</span>
                          <span>Region: <strong className="text-slate-800">{allotment.college.region}</strong></span>
                          <span>•</span>
                          <span>District: <strong className="text-slate-800">{allotment.college.district}</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 self-stretch sm:self-auto flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Cutoff Match
                    </div>
                  </div>

                  {/* Seat details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">Matched Branch</span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5">{allotment.college.branch}</span>
                    </div>
                    <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">Matched Preference</span>
                      <span className="font-bold text-emerald-700 text-sm block mt-0.5 font-mono">Choice #{allotment.optionNumber}</span>
                    </div>
                    <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">Simulated Fee</span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5">{allotment.college.fee === null ? 'Not listed in source' : `₹${allotment.college.fee.toLocaleString()}/yr`}</span>
                    </div>
                    <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">Cutoff Basis</span>
                      <span className="font-bold text-slate-800 text-xs block mt-1 truncate">{allotment.allotmentType}</span>
                    </div>
                  </div>

                  {/* Rank proximity to the reported cutoff */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span className="text-slate-600 font-medium">
                        Rank vs {COLLEGES_SOURCE_YEAR ?? 'historical'} cutoff:
                      </span>
                      <span className="font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded">
                        {getSeatProbability(allotment.college, profile.rank, profile.category, profile.gender, profile.region)} range
                      </span>
                    </div>
                    
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 leading-relaxed flex gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-0.5 text-emerald-900">Historical data note</h5>
                    <span>This option's reported {COLLEGES_SOURCE_YEAR ?? 'historical'} cutoff is within your entered rank. Current-year eligibility and allotment depend on official rules, seats, and processing.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* NO SEAT ALLOTTED CARD */}
                <div className="bg-gradient-to-r from-red-500/5 to-amber-500/5 border border-red-200 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 bg-red-500/10 h-32 w-32 rounded-full blur-xl"></div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xl">
                      <span className="text-[10px] font-mono tracking-wider font-extrabold text-red-600 uppercase block">Simulation Status</span>
                      <h4 className="font-sans font-black text-slate-900 text-lg">No Historical Cutoff Match</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Based on your rank of <strong>{profile.rank.toLocaleString()}</strong> and selected list of choices, you did not match any historical cutoff boundaries. This typically happens if you only choose highly competitive top-tier options without sufficient safety options.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Safety Alternatives Recommendations */}
                {alternatives.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-sans font-black text-slate-800 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    Other options near your rank in the historical data ({profile.rank.toLocaleString()})
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {alternatives.map((college) => {
                        const probability = getSeatProbability(college, profile.rank, profile.category, profile.gender, profile.region);
                        const isHigh = probability === 'HIGH';
                        
                        return (
                          <div 
                            key={college.id} 
                            className="bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 p-4 rounded-xl flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded">
                                {college.code}
                              </span>
                              <h6 className="font-sans font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                {college.name}
                              </h6>
                              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {college.district} ({college.region})
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                              <div>
                                <span className="text-slate-500 block font-mono uppercase">Branch</span>
                                <span className="font-bold text-slate-800 font-mono">{college.branch}</span>
                              </div>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                isHigh ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                              }`}>
                                {probability} cutoff range
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-mono text-center">
                      *Adding these colleges to your prioritized list would secure a high likelihood of seat reservation on final council dates.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary stats display list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4 mb-8">
        <h4 className="font-sans font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
          Simulation Record Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-0.5 text-[9px] uppercase">Secured Rank</span>
            <span className="font-bold text-slate-800">{profile.rank?.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-0.5 text-[9px] uppercase">Quota Category</span>
            <span className="font-bold text-slate-800">{profile.category}{hasLocalAreaCutoffs() ? ` (${profile.region})` : ''}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-0.5 text-[9px] uppercase">Choices Submitted</span>
            <span className="font-bold text-slate-800">{optionsLength} Prioritized</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-left flex gap-2.5 items-start text-xs border border-emerald-100 leading-relaxed">
          <Award className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>Use this list to practice option ordering. Historical cutoffs can guide comparisons, but they cannot guarantee a current-year result.</span>
        </div>
      </div>

      {/* Share the Website with Friends / Trust Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 mb-8 relative overflow-hidden" id="share-with-classmates-trust-card">
        {/* Background visual detail */}
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">Admissions Safety Initiative</span>
            </div>
            <h4 className="font-sans font-black text-xl text-white tracking-tight">
              Help Classmates Avoid Option-Entry Mistakes!
            </h4>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-medium font-mono text-white/80 self-start sm:self-auto shrink-0">
            <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
            Empower Peers
          </div>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
          Share CounselorPro with classmates who want to practice organizing college options against historical cutoff data.
        </p>

        {/* Sharing Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WhatsApp share */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-xs"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-4.5 h-4.5 fill-white text-[#25D366]" />
            <span>WhatsApp Share</span>
          </button>

          {/* Telegram share */}
          <button
            onClick={handleTelegramShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] hover:bg-[#0077b3] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-xs"
            title="Share on Telegram"
          >
            <Send className="w-4.5 h-4.5 fill-white text-[#0088cc]" />
            <span>Telegram Share</span>
          </button>

          {/* Copy Link button */}
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/10 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-xs"
            title="Copy Invite Link"
          >
            {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/80" />}
            <span>{linkCopied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>

        {/* Native mobile share fallback button */}
        <div className="text-center pt-1 border-t border-white/5">
          <button
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>Use standard device sharing panel</span>
          </button>
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
        <MotionButton
          variant="primary"
          size="md"
          onClick={handleDownloadOptionsPdf}
          leftIcon={<Download className="w-4 h-4" />}
          shimmer
          className="w-full sm:w-auto"
        >
          Download Practice List PDF
        </MotionButton>
        <MotionButton
          variant="secondary"
          size="md"
          onClick={handleDownloadRegisteredSummary}
          leftIcon={<Download className="w-4 h-4 text-slate-500" />}
          className="w-full sm:w-auto"
        >
          Download Summary
        </MotionButton>

        {/* Share Result Snippet Trigger */}
        <MotionButton
          variant="secondary"
          size="md"
          onClick={handleShareSimulationResult}
          leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
          className="w-full sm:w-auto"
        >
          {copied ? 'Copied!' : 'Share Result'}
        </MotionButton>

        <MotionButton
          variant="primary"
          size="md"
          onClick={onReset}
          leftIcon={<RefreshCw className="w-4 h-4" />}
          shimmer
          className="w-full sm:w-auto font-bold"
        >
          Practice Again
        </MotionButton>
      </div>

      {/* Share feedback reminder */}
      <div className="mt-8 text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <Compass className="w-4 h-4 text-slate-300" />
        <span>CounselorPro Simulator, built to maximize admissions safety.</span>
      </div>
    </div>
  );
}
