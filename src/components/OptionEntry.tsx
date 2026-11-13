import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { College, StudentProfile, WebOption } from '../types';
import { getCollegeCutoff, getSeatProbability, getCollegesForStream, isCollegeAvailableToGender, hasLocalAreaCutoffs, COLLEGES_DATASET_METADATA, COLLEGES_SOURCE_YEAR, PROBABILITY_CONFIG } from '../data/colleges';
import { Search, Filter, Plus, Trash2, ArrowUp, ArrowDown, ListOrdered, GraduationCap, DollarSign, RefreshCw, AlertCircle, CheckCircle2, ArrowLeftRight, GripVertical, Sparkles } from 'lucide-react';
import MotionButton from './ui/MotionButton';
import ProbabilityBadge from './ui/ProbabilityBadge';

interface OptionEntryProps {
  profile: StudentProfile;
  selectedOptions: WebOption[];
  onUpdateOptions: (options: WebOption[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function OptionEntry({ profile, selectedOptions, onUpdateOptions, onNext, onBack }: OptionEntryProps) {
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedProb, setSelectedProb] = useState('ALL');
  
  // Compute dynamically adapted colleges based on stream (MPC / BiPC)
  const collegesList = useMemo(() => {
    return getCollegesForStream(profile.stream).filter(college => isCollegeAvailableToGender(college, profile.gender));
  }, [profile.stream, profile.gender]);

  // College comparison slot states
  const [compareAId, setCompareAId] = useState<string>('');
  const [compareBId, setCompareBId] = useState<string>('');

  const compareCollegeA = useMemo(() => {
    return collegesList.find(c => c.id === compareAId) || null;
  }, [compareAId, collegesList]);

  const compareCollegeB = useMemo(() => {
    return collegesList.find(c => c.id === compareBId) || null;
  }, [compareBId, collegesList]);

  const allExamColleges = useMemo(() => {
    return [...collegesList]
      .filter(c => c && typeof c.name === 'string')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collegesList]);

  const handleCompareClick = (college: College) => {
    if (compareAId === college.id) {
      setCompareAId('');
    } else if (compareBId === college.id) {
      setCompareBId('');
    } else if (!compareAId) {
      setCompareAId(college.id);
    } else if (!compareBId) {
      setCompareBId(college.id);
    } else {
      setCompareBId(college.id);
    }
  };
  
  // Custom priority change state for manual index assignment
  const [manualIndexState, setManualIndexState] = useState<{ [optionId: string]: string }>({});
  const [priorityErrorState, setPriorityErrorState] = useState<{ [optionId: string]: string }>({});

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...selectedOptions];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reindexed = updated.map((opt, idx) => ({ ...opt, priority: idx + 1 }));
    onUpdateOptions(reindexed);
    setDraggedIndex(null);
  }, [draggedIndex, selectedOptions, onUpdateOptions]);

  const [visibleCount, setVisibleCount] = useState(60);

  // Reset visible count when filters change to maintain maximum responsiveness
  useEffect(() => {
    setVisibleCount(60);
  }, [search, selectedBranch, selectedDistrict, selectedType, selectedProb]);

  // Filter colleges based on user profile's exam first, then other filters
  const filteredColleges = useMemo(() => {
    return collegesList.filter(col => {
      // Search term
      if (search && !col.name.toLowerCase().includes(search.toLowerCase()) && !col.code.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Branch
      if (selectedBranch !== 'ALL' && col.branch !== selectedBranch) {
        return false;
      }

      // District
      if (selectedDistrict !== 'ALL' && col.district !== selectedDistrict) {
        return false;
      }

      // College Type
      if (selectedType !== 'ALL' && col.type !== selectedType) {
        return false;
      }

      // Probability
      if (selectedProb !== 'ALL') {
        const prob = getSeatProbability(col, profile.rank, profile.category, profile.gender, profile.region);
        if (prob !== selectedProb) return false;
      }

      return true;
    });
  }, [collegesList, search, selectedBranch, selectedDistrict, selectedType, selectedProb, profile.rank, profile.category, profile.gender, profile.region]);

  // List of distinct districts & branches in the current exam database for drop-down filters
  const distinctDistricts = useMemo(() => {
    const districts = collegesList.map(c => c.district);
    return Array.from(new Set(districts)).sort();
  }, [collegesList]);

  const distinctBranches = useMemo(() => {
    const branches = collegesList.map(c => c.branch);
    return Array.from(new Set(branches)).sort();
  }, [collegesList]);

  // Add an option to the priority list
  const addOption = useCallback((college: College) => {
    // Check if college + branch is already selected
    const isAlreadySelected = selectedOptions.some(opt => 
      opt.collegeId === college.id || 
      (opt.collegeCode.toLowerCase() === college.code.toLowerCase() && opt.branch.toLowerCase() === college.branch.toLowerCase())
    );
    if (isAlreadySelected) return;

    const newOption: WebOption = {
      id: `${college.id}-${Date.now()}`, // unique id
      priority: selectedOptions.length + 1,
      collegeId: college.id,
      collegeCode: college.code,
      collegeName: college.name,
      branch: college.branch,
      branchName: college.branchName || college.branch,
      district: college.district,
      fee: college.fee,
    };

    onUpdateOptions([...selectedOptions, newOption]);
  }, [selectedOptions, onUpdateOptions]);

  // Remove an option
  const removeOption = useCallback((id: string) => {
    const remaining = selectedOptions.filter(opt => opt.id !== id);
    // Re-index priorities
    const reindexed = remaining.map((opt, index) => ({
      ...opt,
      priority: index + 1
    }));
    onUpdateOptions(reindexed);
  }, [selectedOptions, onUpdateOptions]);

  // Move option up in priority
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    const updated = [...selectedOptions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    // re-assign priorities
    const reindexed = updated.map((opt, idx) => ({ ...opt, priority: idx + 1 }));
    onUpdateOptions(reindexed);
  }, [selectedOptions, onUpdateOptions]);

  // Move option down in priority
  const moveDown = useCallback((index: number) => {
    if (index === selectedOptions.length - 1) return;
    const updated = [...selectedOptions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    // re-assign priorities
    const reindexed = updated.map((opt, idx) => ({ ...opt, priority: idx + 1 }));
    onUpdateOptions(reindexed);
  }, [selectedOptions, onUpdateOptions]);

  // Move option to arbitrary target priority index
  const handleMoveToPriority = useCallback((id: string, currentIndex: number) => {
    const targetPriorityStr = manualIndexState[id] || '';
    
    if (!targetPriorityStr.trim()) {
      setPriorityErrorState(prev => ({ ...prev, [id]: 'Empty value.' }));
      return;
    }

    if (!/^\d+$/.test(targetPriorityStr)) {
      setPriorityErrorState(prev => ({ ...prev, [id]: 'Digits only.' }));
      return;
    }

    const targetPriority = parseInt(targetPriorityStr, 10);
    
    if (isNaN(targetPriority) || targetPriority < 1 || targetPriority > selectedOptions.length) {
      setPriorityErrorState(prev => ({ ...prev, [id]: `Enter 1-${selectedOptions.length}.` }));
      return;
    }

    // Clear error
    setPriorityErrorState(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const targetIndex = targetPriority - 1;
    if (targetIndex === currentIndex) {
      setManualIndexState(prev => ({ ...prev, [id]: '' }));
      return;
    }

    const updated = [...selectedOptions];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    // re-index priorities
    const reindexed = updated.map((opt, idx) => ({ ...opt, priority: idx + 1 }));
    onUpdateOptions(reindexed);
    
    // Clear manual index input
    setManualIndexState(prev => ({ ...prev, [id]: '' }));
  }, [selectedOptions, manualIndexState, onUpdateOptions]);

  const clearAllOptions = useCallback(() => {
    if (window.confirm("Are you sure you want to clear your current choice list? This cannot be undone.")) {
      onUpdateOptions([]);
    }
  }, [onUpdateOptions]);

  // Calculate sum of fees, count of branches
  const totalEstimatedFees = useMemo(() => selectedOptions.reduce((sum, opt) => sum + (opt.fee ?? 0), 0), [selectedOptions]);
  const optionsWithKnownFees = useMemo(() => selectedOptions.filter(opt => opt.fee !== null).length, [selectedOptions]);
  const cseCount = useMemo(() => selectedOptions.filter(opt => opt.branch.includes('CSE')).length, [selectedOptions]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4" id="options-entry-workspace">
      {/* Mini Profile Header Summary */}
      <div className="bg-white border border-slate-200 text-slate-800 p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 block uppercase">EXAM PORTAL</span>
            <span className="font-sans font-bold text-base text-emerald-600">{profile.exam?.replace('_', ' ')}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 block uppercase">SECURED RANK</span>
            <span className="font-mono text-sm font-bold text-emerald-600">{profile.rank?.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 block uppercase">{hasLocalAreaCutoffs() ? 'CATEGORY / REGION' : 'CATEGORY'}</span>
            <span className="font-mono text-sm font-semibold text-slate-800">{profile.category}{hasLocalAreaCutoffs() ? ` (${profile.region})` : ''}</span>
          </div>
        </div>
        <div className="text-xs bg-slate-100 border border-slate-200 rounded px-2.5 py-1 text-slate-600 font-mono">
          STATUS: IN-PROGRESS DRAFT
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Counselling Web Options Entry Form
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Search matching colleges and branches, then place your most preferred options first. Results use the selected exam, stream, rank, category, gender, and local area.
        </p>
      </div>

      {collegesList.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Verified college data is not available yet for {profile.exam?.replace('_', ' ')} {profile.stream}. Choose another stream with an available verified dataset.
        </div>
      )}
      {collegesList.length > 0 && COLLEGES_DATASET_METADATA && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900" role="note">
          {COLLEGES_DATASET_METADATA.sourceTitle} ({COLLEGES_SOURCE_YEAR}) cutoffs are historical final-counselling last ranks by local area, category, and gender. {COLLEGES_DATASET_METADATA.feesIncluded ? 'Fees are taken from the source PDF.' : 'Fees are not listed in this source.'} Historical ranks do not guarantee a future seat.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: BROWSE & ADD COLLEGES (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs p-4 h-[600px] sm:h-[700px] flex flex-col justify-between min-h-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="font-sans font-bold text-slate-950 flex items-center gap-1.5 text-sm">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                College Search Database
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Found {filteredColleges.length} Matching
              </span>
            </div>

            {/* Searches & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search college name or code (e.g. CBIT)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="college-search-input"
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="ALL">All Branches</option>
                    {distinctBranches.map(br => <option key={br} value={br}>{br}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="ALL">All Districts</option>
                    {distinctDistricts.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="ALL">All Types</option>
                    {Array.from(new Set(collegesList.map(college => college.type))).sort().map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Historical Chance</label>
                  <select
                    value={selectedProb}
                    onChange={(e) => setSelectedProb(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="ALL">All Chances</option>
                    <option value="HIGH">High Chance (Within cutoff)</option>
                    <option value="MODERATE">Moderate Chance (Near cutoff)</option>
                    <option value="REACH">Reach / Competitive (Slightly beyond)</option>
                    <option value="LOW">Low Chance (Far beyond cutoff)</option>
                    <option value="NO_DATA">No Historical Cutoff Data</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Colleges matching scroll lists */}
          <div className="flex-grow overflow-y-auto mt-4 space-y-2.5 pr-1 py-1">
            {filteredColleges.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No colleges match your filter queries.</p>
                <button 
                  onClick={() => { setSearch(''); setSelectedBranch('ALL'); setSelectedDistrict('ALL'); setSelectedType('ALL'); setSelectedProb('ALL'); }}
                  className="text-xs text-emerald-600 font-semibold underline"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <motion.div 
                className="space-y-2.5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.035
                    }
                  }
                }}
              >
                {filteredColleges.slice(0, visibleCount).map(col => {
                  const isSelected = selectedOptions.some(opt => 
                    opt.collegeId === col.id || 
                    (opt.collegeCode.toLowerCase() === col.code.toLowerCase() && opt.branch.toLowerCase() === col.branch.toLowerCase())
                  );
                  const prob = getSeatProbability(col, profile.rank, profile.category, profile.gender, profile.region);
                  const probMeta = PROBABILITY_CONFIG[prob] || PROBABILITY_CONFIG.NO_DATA;

                  return (
                    <motion.div 
                      key={col.id} 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      transition={{ duration: 0.2 }}
                      className={`p-3 rounded-xl border transition-all flex justify-between items-center ${
                        isSelected ? 'bg-slate-50 border-slate-200 opacity-65' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                            {col.code}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            {col.branchName || col.branch}
                          </span>
                          <ProbabilityBadge meta={probMeta} />
                        </div>
                        <h4 className="font-sans font-bold text-xs text-slate-900 line-clamp-1">{col.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {col.place ? `${col.place}, ` : ''}{col.district} • {col.type}{col.fee === null ? '' : ` • Fee: ₹${col.fee.toLocaleString()}/yr`} • {col.year} data
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <MotionButton
                          variant={compareAId === col.id || compareBId === col.id ? "primary" : "secondary"}
                          size="icon"
                          onClick={() => handleCompareClick(col)}
                          className={`!p-2 !min-h-[34px] !min-w-[34px] !rounded-lg ${
                            compareAId === col.id || compareBId === col.id
                              ? '!bg-amber-500 hover:!bg-amber-600 !border-amber-400 !text-white'
                              : '!text-slate-600'
                          }`}
                          title={compareAId === col.id || compareBId === col.id ? "Selected for comparison" : "Compare Side-by-Side"}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </MotionButton>

                        <MotionButton
                          variant="primary"
                          size="icon"
                          disabled={isSelected}
                          onClick={() => addOption(col)}
                          className={`!p-2 !min-h-[34px] !min-w-[34px] !rounded-lg ${
                            isSelected ? '!bg-slate-100 !text-slate-400 !border-slate-200' : ''
                          }`}
                          title={isSelected ? "Already Added" : "Add to Web Options"}
                          shimmer={!isSelected}
                        >
                          <Plus className="w-4 h-4" />
                        </MotionButton>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredColleges.length > visibleCount && (
                  <MotionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleCount(prev => prev + 100)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="w-full !py-2.5 !text-xs !font-bold !bg-emerald-50 hover:!bg-emerald-100 !text-emerald-800 !border-emerald-200 mt-2"
                  >
                    Load More Colleges ({filteredColleges.length - visibleCount} remaining)
                  </MotionButton>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WEB OPTIONS PRIORITIZED LIST (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs p-4 h-[700px] flex flex-col justify-between">
          <div className="h-[92%] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <span className="font-sans font-bold text-slate-950 flex items-center gap-1.5 text-sm">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                Your Selected Priority Web Options
              </span>
              <div className="flex gap-2">
                {selectedOptions.length > 0 && (
                  <button
                    onClick={clearAllOptions}
                    className="text-xs text-red-600 font-semibold hover:bg-red-50 px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Options
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable list of Web Options with Smooth Layout Reordering */}
            <div className="flex-grow overflow-y-auto mt-2 space-y-2 pr-1 py-1" id="web-options-list">
              {selectedOptions.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3">
                  <ListOrdered className="w-12 h-12 mx-auto text-slate-200" />
                  <p className="text-sm">No options selected yet. Add colleges from the database on the left.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Choose CSE, ECE, EEE, or MECH from JNTU, CBIT, OUCE, etc. to see how the allotment engine prioritizes options.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {selectedOptions.map((opt, index) => {
                    const isBeingDragged = index === draggedIndex;
                    return (
                      <motion.div 
                        key={opt.id}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        draggable="true"
                        onDragStart={(e: any) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e: any) => handleDrop(e, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={`p-2.5 sm:p-3 bg-white border rounded-xl shadow-2xs hover:border-emerald-300 transition-colors flex items-center justify-between gap-2.5 relative ${
                          isBeingDragged ? 'opacity-40 border-dashed border-emerald-500 bg-slate-50' : 'border-slate-200'
                        }`}
                      >
                        {/* Drag Handle & Priority Number */}
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <div 
                            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing hidden sm:flex items-center justify-center h-10 w-6"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="bg-emerald-600 text-white font-mono font-black text-xs h-8 w-8 rounded-lg flex items-center justify-center shadow-xs">
                            {opt.priority}
                          </div>
                        </div>

                        {/* College Branch Title details */}
                        <div className="flex-grow space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-sans font-extrabold text-xs text-slate-900">{opt.collegeCode}</span>
                            <span className="font-mono text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border border-emerald-100 rounded">
                              {opt.branch}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate max-w-[80px]">{opt.district}</span>
                          </div>
                          <h4 className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1">{opt.collegeName}</h4>
                        </div>

                        {/* Manual index target input & re-ordering buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          
                          {/* Priority shift field (compact on mobile) */}
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Set"
                                value={manualIndexState[opt.id] || ''}
                                onChange={(e) => {
                                  setManualIndexState({ ...manualIndexState, [opt.id]: e.target.value });
                                  if (priorityErrorState[opt.id]) {
                                    setPriorityErrorState(prev => {
                                      const copy = { ...prev };
                                      delete copy[opt.id];
                                      return copy;
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleMoveToPriority(opt.id, index);
                                  }
                                }}
                                className="w-10 text-center text-xs border border-slate-300 rounded p-1 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                title="Enter new position and hit Enter or click Go"
                              />
                              <MotionButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleMoveToPriority(opt.id, index)}
                                className="!px-2 !py-0.5 !min-h-[26px] !text-[10px] !rounded"
                              >
                                Go
                              </MotionButton>
                            </div>
                            {priorityErrorState[opt.id] && (
                              <span className="text-[9px] text-red-500 font-medium whitespace-nowrap">
                                {priorityErrorState[opt.id]}
                              </span>
                            )}
                          </div>

                          {/* Arrows with Large Mobile Touch Targets */}
                          <div className="flex items-center gap-1">
                            <MotionButton
                              variant="secondary"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => moveUp(index)}
                              className="!w-9 !h-9 sm:!w-10 sm:!h-10 !min-h-[36px] !min-w-[36px] !p-0 !rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Move Option Up"
                              aria-label="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </MotionButton>

                            <MotionButton
                              variant="secondary"
                              size="icon"
                              disabled={index === selectedOptions.length - 1}
                              onClick={() => moveDown(index)}
                              className="!w-9 !h-9 sm:!w-10 sm:!h-10 !min-h-[36px] !min-w-[36px] !p-0 !rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Move Option Down"
                              aria-label="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </MotionButton>
                          </div>

                          {/* Delete trash button */}
                          <MotionButton
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(opt.id)}
                            className="!w-9 !h-9 sm:!w-10 sm:!h-10 !min-h-[36px] !min-w-[36px] !p-0 !rounded-lg text-slate-400 hover:!text-red-600 hover:!bg-red-50"
                            title="Remove Choice"
                            aria-label="Delete option"
                          >
                            <Trash2 className="w-4 h-4" />
                          </MotionButton>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Real-time Summary & Total Stats */}
          {selectedOptions.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Options</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{selectedOptions.length}</span>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">CSE Specialized</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{cseCount}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Est. Annual Fee</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{optionsWithKnownFees === selectedOptions.length ? `₹${totalEstimatedFees.toLocaleString()}` : 'Not in source'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* College Comparison Hub Section */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" id="college-comparison-hub">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 shadow-3xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-sm">College Comparison Sandbox</h3>
              <p className="text-xs text-slate-500">Compare branch codes, reported fees, and historical cutoff ranges side-by-side</p>
            </div>
          </div>
          {(compareCollegeA || compareCollegeB) && (
            <button
              onClick={() => { setCompareAId(''); setCompareBId(''); }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
            >
              Clear Comparison
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Slot A Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase block">College Choice A</label>
              <select
                value={compareAId}
                onChange={(e) => setCompareAId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
              >
                <option value="">-- Choose first college to compare --</option>
                {allExamColleges.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name} - {c.branchName || c.branch} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Slot B Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase block">College Choice B</label>
              <select
                value={compareBId}
                onChange={(e) => setCompareBId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
              >
                <option value="">-- Choose second college to compare --</option>
                {allExamColleges.map(c => (
                  <option key={c.id} value={c.id} disabled={c.id === compareAId}>
                    [{c.code}] {c.name} - {c.branchName || c.branch} ({c.district})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!compareCollegeA || !compareCollegeB ? (
            <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
              <p className="text-sm font-medium text-slate-700">Comparison Table Pending</p>
              <p className="text-xs max-w-md mx-auto text-slate-500 leading-relaxed">
                {!compareCollegeA && !compareCollegeB
                  ? 'Select two colleges using the dropdowns above, or click the ⚖️ Compare button on any college card in the left database list to auto-populate the slot comparison analysis!'
                  : 'Select a second college to enable side-by-side analysis.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-mono border-b border-slate-200">
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider w-[24%]">Metric / Attribute</th>
                    <th className="py-3.5 px-4 font-bold text-slate-900 bg-amber-50/20 border-x border-slate-200 w-[38%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {compareCollegeA.code}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          {compareCollegeA.branchName || compareCollegeA.branch}
                        </span>
                      </div>
                      <span className="font-sans text-xs font-bold line-clamp-1">{compareCollegeA.name}</span>
                    </th>
                    <th className="py-3.5 px-4 font-bold text-slate-900 bg-amber-50/20 w-[38%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {compareCollegeB.code}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          {compareCollegeB.branchName || compareCollegeB.branch}
                        </span>
                      </div>
                      <span className="font-sans text-xs font-bold line-clamp-1">{compareCollegeB.name}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">College Code</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-800 bg-slate-50/20 border-x border-slate-200">{compareCollegeA.code}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-teal-800">{compareCollegeB.code}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">Branch Code</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 bg-slate-50/20 border-x border-slate-200">{compareCollegeA.branchName || compareCollegeA.branch}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{compareCollegeB.branchName || compareCollegeB.branch}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">Institution Type</td>
                    <td className="py-2.5 px-4 bg-slate-50/20 border-x border-slate-200">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {compareCollegeA.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {compareCollegeB.type}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">Region & District</td>
                    <td className="py-2.5 px-4 bg-slate-50/20 border-x border-slate-200">{compareCollegeA.region} Quota • {compareCollegeA.district}</td>
                    <td className="py-2.5 px-4">{compareCollegeB.region} Quota • {compareCollegeB.district}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">Annual Tuition Fee</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 bg-slate-50/20 border-x border-slate-200">{compareCollegeA.fee === null ? 'Not in source' : `₹${compareCollegeA.fee.toLocaleString()}/yr`}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{compareCollegeB.fee === null ? 'Not in source' : `₹${compareCollegeB.fee.toLocaleString()}/yr`}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-500 font-mono">Historical rank match</td>
                    <td className="py-2.5 px-4 bg-slate-50/20 border-x border-slate-200 font-bold">
                      {(() => {
                        const prob = getSeatProbability(compareCollegeA, profile.rank, profile.category, profile.gender, profile.region);
                        const colors = {
                          HIGH: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
                          MEDIUM: 'text-teal-700 bg-teal-50 border border-teal-100',
                          LOW: 'text-amber-700 bg-amber-50 border border-amber-100',
                          VERY_LOW: 'text-red-700 bg-red-50 border border-red-100',
                          NO_DATA: 'text-slate-600 bg-slate-100 border border-slate-200'
                        }[prob];
                        return <span className={`px-2 py-0.5 rounded text-[10px] ${colors}`}>{prob} CHANCE</span>;
                      })()}
                    </td>
                    <td className="py-2.5 px-4 font-bold">
                      {(() => {
                        const prob = getSeatProbability(compareCollegeB, profile.rank, profile.category, profile.gender, profile.region);
                        const colors = {
                          HIGH: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
                          MEDIUM: 'text-teal-700 bg-teal-50 border border-teal-100',
                          LOW: 'text-amber-700 bg-amber-50 border border-amber-100',
                          VERY_LOW: 'text-red-700 bg-red-50 border border-red-100',
                          NO_DATA: 'text-slate-600 bg-slate-100 border border-slate-200'
                        }[prob];
                        return <span className={`px-2 py-0.5 rounded text-[10px] ${colors}`}>{prob} CHANCE</span>;
                      })()}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/10 font-bold">
                    <td className="py-2.5 px-4 font-semibold text-amber-800 font-mono">{COLLEGES_SOURCE_YEAR} {profile.category} / {profile.gender}{hasLocalAreaCutoffs() ? ` / ${profile.region}` : ''} last rank</td>
                    <td className="py-2.5 px-4 font-mono text-amber-900 bg-slate-50/20 border-x border-slate-200">
                      {getCollegeCutoff(compareCollegeA, profile.category, profile.gender, profile.region)?.toLocaleString() ?? 'Not reported'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-amber-900">
                      {getCollegeCutoff(compareCollegeB, profile.category, profile.gender, profile.region)?.toLocaleString() ?? 'Not reported'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Button Navigation Panel */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <MotionButton
          variant="secondary"
          size="md"
          onClick={onBack}
        >
          Back
        </MotionButton>

        <MotionButton
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={selectedOptions.length === 0 || collegesList.length === 0}
          id="submit-options-btn"
          shimmer
          rightIcon={<ArrowUp className="w-4 h-4 rotate-90" />}
        >
          Proceed to Final Review
        </MotionButton>
      </div>
    </div>
  );
}
