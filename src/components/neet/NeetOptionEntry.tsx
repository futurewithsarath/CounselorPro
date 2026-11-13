import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpToLine, 
  Check, 
  Building2, 
  MapPin, 
  GraduationCap, 
  HelpCircle, 
  Info, 
  ArrowRight, 
  Save, 
  AlertTriangle, 
  Sparkles,
  BookOpen,
  Layers,
  Award,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { 
  NeetStudentProfile, 
  NeetChoice, 
  NeetCollegeRecord, 
  NeetCounsellingAuthority, 
  NeetCourseType, 
  NeetInstitutionType 
} from '../../types';
import { 
  NEET_COLLEGES_CATALOG, 
  calculateNeetProbability, 
  validateNeetEligibility,
  NEET_AUTHORITY_INFO,
  normalizeIndianState,
  CANONICAL_INDIAN_STATES 
} from '../../data/neetCatalog';
import { PROBABILITY_CONFIG } from '../../data/colleges';
import MotionButton from '../ui/MotionButton';
import ProbabilityBadge from '../ui/ProbabilityBadge';

interface NeetOptionEntryProps {
  profile: NeetStudentProfile;
  selectedChoices: NeetChoice[];
  onUpdateChoices: (choices: NeetChoice[]) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenLearningCentre: () => void;
}

export default function NeetOptionEntry({
  profile,
  selectedChoices,
  onUpdateChoices,
  onNext,
  onBack,
  onOpenLearningCentre
}: NeetOptionEntryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState<NeetCounsellingAuthority | 'ALL'>(
    profile.activeAuthority || 'ALL'
  );
  const [courseFilter, setCourseFilter] = useState<NeetCourseType | 'ALL'>('ALL');
  const [instTypeFilter, setInstTypeFilter] = useState<NeetInstitutionType | 'ALL'>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [activeMobileTab, setActiveMobileTab] = useState<'available' | 'selected'>('available');
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  // Compute state-wise college counts across verified catalog
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NEET_COLLEGES_CATALOG.forEach(c => {
      const s = c.state;
      if (s) {
        counts[s] = (counts[s] || 0) + 1;
      }
    });
    return counts;
  }, []);

  const availableStates = useMemo(() => {
    return Object.keys(stateCounts).sort((a, b) => a.localeCompare(b));
  }, [stateCounts]);

  // Reset pagination limit when filters change
  React.useEffect(() => {
    setDisplayLimit(50);
  }, [searchQuery, authorityFilter, courseFilter, instTypeFilter, stateFilter]);

  // Filter available colleges based on current query and filters
  const filteredColleges = useMemo(() => {
    return NEET_COLLEGES_CATALOG.filter(college => {
      // 1. Authority
      if (authorityFilter !== 'ALL' && college.authority !== authorityFilter) {
        return false;
      }
      // 2. Course
      if (courseFilter !== 'ALL' && college.course !== courseFilter) {
        return false;
      } else if (courseFilter === 'ALL' && !profile.selectedCourses.includes(college.course)) {
        // Only show courses the candidate selected on Step 2
        return false;
      }
      // 3. Institution Type
      if (instTypeFilter !== 'ALL' && college.institutionType !== instTypeFilter) {
        return false;
      }
      // 4. State / Location Filter (Robust canonical mapping)
      if (stateFilter !== 'ALL') {
        const normColState = normalizeIndianState(college.state);
        const normFiltState = normalizeIndianState(stateFilter);
        if (normColState !== normFiltState && college.state !== stateFilter) {
          return false;
        }
      }
      // 5. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = college.name.toLowerCase().includes(q);
        const matchesShort = college.shortName.toLowerCase().includes(q);
        const matchesCode = college.code.toLowerCase().includes(q);
        const matchesCity = college.city.toLowerCase().includes(q);
        const matchesState = college.state.toLowerCase().includes(q);
        const matchesQuota = (college.quotaName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesShort && !matchesCode && !matchesCity && !matchesState && !matchesQuota) {
          return false;
        }
      }
      return true;
    });
  }, [authorityFilter, courseFilter, instTypeFilter, stateFilter, searchQuery, profile.selectedCourses]);

  // Set of already selected college IDs
  const selectedCollegeIds = useMemo(() => {
    return new Set(selectedChoices.map(c => c.collegeId));
  }, [selectedChoices]);

  // Add choice
  const handleAddChoice = (college: NeetCollegeRecord) => {
    if (selectedCollegeIds.has(college.id)) return;

    const prob = calculateNeetProbability(profile.allIndiaRank, college.cutoffs, profile.category, profile.isPwd);
    const newChoice: NeetChoice = {
      id: `choice-${Date.now()}-${college.id}`,
      priority: selectedChoices.length + 1,
      collegeId: college.id,
      collegeCode: college.code,
      collegeName: college.name,
      shortName: college.shortName,
      course: college.course,
      authority: college.authority,
      quota: college.quota,
      state: college.state,
      city: college.city,
      institutionType: college.institutionType,
      annualFee: college.annualFee,
      cutoffAIR: prob.cutoffRank
    };

    onUpdateChoices([...selectedChoices, newChoice]);
  };

  // Remove choice
  const handleRemoveChoice = (choiceId: string) => {
    const updated = selectedChoices
      .filter(c => c.id !== choiceId)
      .map((c, idx) => ({ ...c, priority: idx + 1 }));
    onUpdateChoices(updated);
  };

  // Reorder choices
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...selectedChoices];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;
    onUpdateChoices(reordered.map((c, idx) => ({ ...c, priority: idx + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedChoices.length - 1) return;
    const reordered = [...selectedChoices];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;
    onUpdateChoices(reordered.map((c, idx) => ({ ...c, priority: idx + 1 })));
  };

  const handleMoveToTop = (index: number) => {
    if (index === 0) return;
    const reordered = [...selectedChoices];
    const [item] = reordered.splice(index, 1);
    reordered.unshift(item);
    onUpdateChoices(reordered.map((c, idx) => ({ ...c, priority: idx + 1 })));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your current choice filling list?')) {
      onUpdateChoices([]);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('counselor_neet_choices', JSON.stringify(selectedChoices));
    localStorage.setItem('counselor_neet_profile', JSON.stringify(profile));
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2500);
  };

  // Authority breakdown
  const authorityCounts = useMemo(() => {
    const counts: Record<string, number> = { MCC: 0, AP_STATE: 0, TG_STATE: 0, AACCC: 0 };
    selectedChoices.forEach(c => {
      counts[c.authority] = (counts[c.authority] || 0) + 1;
    });
    return counts;
  }, [selectedChoices]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4" id="neet-option-entry-step">
      {/* Top Banner with Profile Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans font-bold text-slate-900 text-base">
                NEET UG Web Options Practice Workspace
              </span>
              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                AIR: {profile.allIndiaRank.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                Score: {profile.neetScore}/720
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                Cat: {profile.category}
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                Domicile: {profile.domicileState}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequence your preference order. Your options will be tested against verified 2024 closing ranks across MCC, Dr. YSRUHS, KNRUHS, and AACCC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MotionButton
            variant="outline"
            size="sm"
            onClick={onOpenLearningCentre}
            className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            leftIcon={<BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
          >
            NEET & MCC Rules Guide
          </MotionButton>

          <MotionButton
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs"
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {showSaveFeedback ? 'Saved!' : 'Save Draft'}
          </MotionButton>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-slate-200 mb-4 bg-white rounded-xl p-1 shadow-xs">
        <button
          onClick={() => setActiveMobileTab('available')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeMobileTab === 'available'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Colleges & Courses ({filteredColleges.length})
        </button>
        <button
          onClick={() => setActiveMobileTab('selected')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${
            activeMobileTab === 'selected'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Selected Options ({selectedChoices.length})
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: College Browsing & Filter Panel (md:col-span-7) */}
        <div className={`md:col-span-7 space-y-4 ${activeMobileTab === 'selected' ? 'hidden md:block' : 'block'}`}>
          {/* Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search college, city, state, or course (e.g. AIIMS, Osmania, BAMS)..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Authority Pills */}
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Counselling Authority
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'All Authorities' },
                  { id: 'MCC', label: 'MCC (All India / AIIMS)' },
                  { id: 'AP_STATE', label: 'Dr. YSRUHS (AP)' },
                  { id: 'TG_STATE', label: 'KNRUHS (Telangana)' },
                  { id: 'AACCC', label: 'AACCC (AYUSH)' },
                ].map((auth) => (
                  <button
                    key={auth.id}
                    onClick={() => setAuthorityFilter(auth.id as any)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      authorityFilter === auth.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {auth.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Row: State / Location, Degree Course & Institute Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>State / Location</span>
                  {stateFilter !== 'ALL' && (
                    <button 
                      onClick={() => setStateFilter('ALL')} 
                      className="text-[10px] text-emerald-600 hover:underline capitalize"
                    >
                      Reset
                    </button>
                  )}
                </span>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All States & UTs ({NEET_COLLEGES_CATALOG.length} options)</option>
                  {availableStates.map(st => (
                    <option key={st} value={st}>
                      {st} ({stateCounts[st]} options)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Degree Course
                </span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Selected Courses</option>
                  {profile.selectedCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Institute Category
                </span>
                <select
                  value={instTypeFilter}
                  onChange={(e) => setInstTypeFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="AIIMS">AIIMS Institutes</option>
                  <option value="CENTRAL_INSTITUTE">Central Institutes</option>
                  <option value="GOVT_MEDICAL">Govt Medical Colleges</option>
                  <option value="PVT_MEDICAL">Private Medical Colleges</option>
                  <option value="GOVT_DENTAL">Dental Colleges (BDS)</option>
                  <option value="NATIONAL_AYUSH">National AYUSH Bodies</option>
                  <option value="DEEMED_UNIVERSITY">Deemed Universities</option>
                </select>
              </div>
            </div>

            {/* Quick State Location Chips */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0 mr-1">
                  Quick States:
                </span>
                <button
                  onClick={() => setStateFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all shrink-0 ${
                    stateFilter === 'ALL'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  All India ({NEET_COLLEGES_CATALOG.length})
                </button>
                {stateCounts[profile.domicileState] && (
                  <button
                    onClick={() => setStateFilter(profile.domicileState)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 ${
                      stateFilter === profile.domicileState
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>★</span>
                    <span>{profile.domicileState} ({stateCounts[profile.domicileState]})</span>
                  </button>
                )}
                {['Andhra Pradesh', 'Telangana', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Kerala', 'Rajasthan']
                  .filter(st => st !== profile.domicileState && stateCounts[st])
                  .map(st => (
                    <button
                      key={st}
                      onClick={() => setStateFilter(st)}
                      className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all shrink-0 ${
                        stateFilter === st
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {st} ({stateCounts[st]})
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{Math.min(filteredColleges.length, displayLimit)}</strong> of <strong>{filteredColleges.length}</strong> eligible programs
              {stateFilter !== 'ALL' && <span className="text-emerald-700 font-medium ml-1">in {stateFilter}</span>}
            </span>
            <span className="text-[11px] font-mono">
              Click &quot;Add Option&quot; to prioritize
            </span>
          </div>

          {/* Staggered College Cards Cascade */}
          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {filteredColleges.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-800">No matching medical colleges found</p>
                <p className="text-xs mt-1">Try adjusting your state filter ({stateFilter}), course selections, or search keywords.</p>
                {stateFilter !== 'ALL' && (
                  <button
                    onClick={() => setStateFilter('ALL')}
                    className="mt-3 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    View All States
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredColleges.slice(0, displayLimit).map((college, idx) => {
                  const isSelected = selectedCollegeIds.has(college.id);
                  const prob = calculateNeetProbability(
                    profile.allIndiaRank, 
                    college.cutoffs, 
                    profile.category, 
                    profile.isPwd
                  );
                  const elig = validateNeetEligibility(profile, college);

                  return (
                    <motion.div
                      key={college.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.3) }}
                      className={`p-4 rounded-xl border transition-all bg-white relative overflow-hidden ${
                        isSelected
                          ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Tags Bar */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {college.code}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                              {college.course}
                            </span>
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                              {NEET_AUTHORITY_INFO[college.authority].name}
                            </span>
                            <span className="text-[10px] font-mono bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                              {college.quotaName || college.quota.replace('_', ' ')}
                            </span>
                            {college.quotaSeats !== undefined && (
                              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                Quota: {college.quotaSeats} Seats
                              </span>
                            )}
                            {college.approvedIntake2025_26 !== undefined && (
                              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                NMC: {college.approvedIntake2025_26}
                              </span>
                            )}
                            {college.nirfRank && (
                              <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                NIRF #{college.nirfRank}
                              </span>
                            )}
                          </div>

                          {/* College Name & Location */}
                          <div>
                            <h4 className="font-sans font-bold text-sm text-slate-900 leading-snug">
                              {college.shortName}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {college.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 pt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {college.city}, <span className="text-emerald-800 font-semibold">{college.state}</span>
                            </span>
                            <span>•</span>
                            <span>Intake: <strong>{college.sanctionedIntake} Seats</strong></span>
                            {college.quotaSeats !== undefined && (
                              <>
                                <span>•</span>
                                <span>Quota Contribution: <strong className="text-emerald-700">{college.quotaSeats}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              Fee: <strong>{college.annualFee ? `₹${college.annualFee.toLocaleString()}/yr` : 'Govt Nom'}</strong>
                            </span>
                          </div>

                          {/* Eligibility Warning if Ineligible */}
                          {!elig.eligible && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{elig.reasons[0]}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Action: Probability Badge & Add Button */}
                        <div className="flex flex-col items-end gap-2.5 shrink-0">
                          <ProbabilityBadge
                            meta={{
                              ...PROBABILITY_CONFIG[prob.probability],
                              description: prob.cutoffRank ? `Official 2024 Cutoff: #${prob.cutoffRank.toLocaleString()}` : PROBABILITY_CONFIG[prob.probability].description
                            }}
                          />

                          <MotionButton
                            variant={isSelected ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => handleAddChoice(college)}
                            disabled={isSelected}
                            className="text-xs"
                            leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          >
                            {isSelected ? 'Added' : 'Add Option'}
                          </MotionButton>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Pagination / Load More Controls */}
                {filteredColleges.length > displayLimit && (
                  <div className="pt-3 pb-2 text-center flex items-center justify-center gap-2">
                    <MotionButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setDisplayLimit(prev => Math.min(prev + 50, filteredColleges.length))}
                      className="text-xs"
                    >
                      Load More Colleges (+50)
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisplayLimit(filteredColleges.length)}
                      className="text-xs text-slate-600"
                    >
                      Show All ({filteredColleges.length})
                    </MotionButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Priority Preference List (md:col-span-5) */}
        <div className={`md:col-span-5 space-y-4 ${activeMobileTab === 'available' ? 'hidden md:block' : 'block'}`}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs sticky top-20">
            {/* Header of Options List */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900">
                  Web Options Priority List
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedChoices.length} Choices Added
                </p>
              </div>

              {selectedChoices.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Authority Breakdown Pills */}
            {selectedChoices.length > 0 && (
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400">Breakdown:</span>
                {Object.entries(authorityCounts).map(([auth, count]) => {
                  if (count === 0) return null;
                  return (
                    <span key={auth} className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {auth}: <strong>{count}</strong>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Choices Container with FLIP Layout Animations */}
            <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {selectedChoices.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400"
                  >
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">No choices added yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Browse programs on the left and click &quot;Add Option&quot; to build your official priority list.
                    </p>
                  </motion.div>
                ) : (
                  selectedChoices.map((choice, index) => (
                    <motion.div
                      key={choice.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2.5 group hover:border-emerald-300 hover:bg-emerald-50/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Priority Badge */}
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {choice.priority}
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {choice.shortName}
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 rounded">
                              {choice.course}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>{choice.authority}</span>
                            <span>•</span>
                            <span className="truncate">{choice.city}</span>
                            {choice.cutoffAIR && (
                              <>
                                <span>•</span>
                                <span>Cutoff: #{choice.cutoffAIR.toLocaleString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedChoices.length - 1}
                          title="Move Down"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMoveToTop(index)}
                          disabled={index === 0}
                          title="Move to Top"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowUpToLine className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveChoice(choice.id)}
                          title="Delete Choice"
                          className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col gap-2">
              <MotionButton
                variant="primary"
                size="lg"
                onClick={onNext}
                disabled={selectedChoices.length === 0}
                className="w-full text-sm"
                shimmer
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review & Mock Allotment ({selectedChoices.length})
              </MotionButton>

              <MotionButton
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="w-full text-xs text-slate-600"
              >
                Back to Profile
              </MotionButton>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
