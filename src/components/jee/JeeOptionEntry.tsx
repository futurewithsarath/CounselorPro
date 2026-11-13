import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JeeStudentProfile, JeePracticeChoice, NitAcademicProgram } from '../../types';
import { ALL_NITS, ALL_NIT_PROGRAMS, determineNitQuota, INDIAN_STATES_UTS } from '../../data/jeeNitCatalog';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ListOrdered, 
  Building2, 
  Save, 
  GripVertical, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  GraduationCap,
  Sparkles,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import MotionButton from '../ui/MotionButton';

interface JeeOptionEntryProps {
  profile: JeeStudentProfile;
  selectedChoices: JeePracticeChoice[];
  onUpdateChoices: (choices: JeePracticeChoice[]) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenLearningCentre?: () => void;
}

export default function JeeOptionEntry({
  profile,
  selectedChoices,
  onUpdateChoices,
  onNext,
  onBack,
  onOpenLearningCentre
}: JeeOptionEntryProps) {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNitCode, setSelectedNitCode] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedQuotaFilter, setSelectedQuotaFilter] = useState<'ALL' | 'HS' | 'OS'>('ALL');

  // Mobile View Toggle: 'available' vs 'selected'
  const [mobileTab, setMobileTab] = useState<'available' | 'selected'>('available');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Clear modal confirmation state
  const [showClearModal, setShowClearModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Distinct branches list for dropdown
  const distinctBranches = useMemo(() => {
    const set = new Set<string>();
    ALL_NIT_PROGRAMS.forEach(p => set.add(p.programCode));
    return Array.from(set).sort();
  }, []);

  // Filter available programs
  const filteredPrograms = useMemo(() => {
    return ALL_NIT_PROGRAMS.filter(prog => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = prog.instituteName.toLowerCase().includes(query);
        const matchShort = prog.instituteShortName.toLowerCase().includes(query);
        const matchCode = prog.instituteCode.includes(query);
        const matchBranch = prog.programName.toLowerCase().includes(query) || prog.programCode.toLowerCase().includes(query);
        if (!matchName && !matchShort && !matchCode && !matchBranch) {
          return false;
        }
      }

      // NIT Filter
      if (selectedNitCode !== 'ALL' && prog.instituteCode !== selectedNitCode) {
        return false;
      }

      // State Filter
      if (selectedState !== 'ALL' && prog.instituteState.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }

      // Branch Filter
      if (selectedBranch !== 'ALL' && prog.programCode !== selectedBranch) {
        return false;
      }

      // Quota Filter (Home State vs Other State)
      if (selectedQuotaFilter !== 'ALL') {
        const quota = determineNitQuota(profile.stateOfEligibility, prog.instituteState);
        if (selectedQuotaFilter === 'HS' && quota !== 'Home State (HS)') return false;
        if (selectedQuotaFilter === 'OS' && quota !== 'Other State (OS)') return false;
      }

      return true;
    });
  }, [searchTerm, selectedNitCode, selectedState, selectedBranch, selectedQuotaFilter, profile.stateOfEligibility]);

  // Add choice to priority list
  const addChoice = useCallback((program: NitAcademicProgram) => {
    const isAlreadyAdded = selectedChoices.some(c => c.programId === program.id);
    if (isAlreadyAdded) return;

    const quota = determineNitQuota(profile.stateOfEligibility, program.instituteState);

    const newChoice: JeePracticeChoice = {
      id: `${program.id}-${Date.now()}`,
      priority: selectedChoices.length + 1,
      programId: program.id,
      instituteCode: program.instituteCode,
      instituteName: program.instituteName,
      instituteShortName: program.instituteShortName,
      instituteState: program.instituteState,
      programCode: program.programCode,
      programName: program.programName,
      degree: program.degree,
      quotaApplied: quota
    };

    onUpdateChoices([...selectedChoices, newChoice]);
  }, [selectedChoices, profile.stateOfEligibility, onUpdateChoices]);

  // Remove choice
  const removeChoice = useCallback((id: string) => {
    const remaining = selectedChoices.filter(c => c.id !== id);
    const reindexed = remaining.map((c, idx) => ({ ...c, priority: idx + 1 }));
    onUpdateChoices(reindexed);
  }, [selectedChoices, onUpdateChoices]);

  // Move up
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const updated = [...selectedChoices];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    const reindexed = updated.map((c, idx) => ({ ...c, priority: idx + 1 }));
    onUpdateChoices(reindexed);
  }, [selectedChoices, onUpdateChoices]);

  // Move down
  const moveDown = useCallback((index: number) => {
    if (index >= selectedChoices.length - 1) return;
    const updated = [...selectedChoices];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    const reindexed = updated.map((c, idx) => ({ ...c, priority: idx + 1 }));
    onUpdateChoices(reindexed);
  }, [selectedChoices, onUpdateChoices]);

  // Clear all
  const handleClearAll = () => {
    onUpdateChoices([]);
    setShowClearModal(false);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...selectedChoices];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    const reindexed = updated.map((c, idx) => ({ ...c, priority: idx + 1 }));
    onUpdateChoices(reindexed);
    setDraggedIndex(null);
  };

  // Save Draft
  const handleSaveDraft = () => {
    localStorage.setItem('counselor_jee_choices', JSON.stringify(selectedChoices));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Unique NITs in selected choices
  const uniqueNitsInChoices = useMemo(() => {
    return new Set(selectedChoices.map(c => c.instituteCode)).size;
  }, [selectedChoices]);

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      {/* Top Banner & Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
              JoSAA NIT Choice Filling
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Class XII State: <strong>{profile.stateOfEligibility}</strong>
            </span>
          </div>
          <h2 className="text-xl font-sans font-bold text-slate-900 mt-1">
            NIT Preference Ordering Workspace
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Add academic programmes from the 31 National Institutes of Technology on the left and arrange your exact preference order on the right.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenLearningCentre && (
            <button
              onClick={onOpenLearningCentre}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Counselling Guide</span>
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Save your choices in browser storage"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={onNext}
            disabled={selectedChoices.length === 0}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
              selectedChoices.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Review & Lock ({selectedChoices.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save Draft Toast */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Draft choices saved securely in your browser.</span>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border border-slate-200 rounded-lg p-1 bg-slate-100 mb-4 text-xs font-semibold">
        <button
          onClick={() => setMobileTab('available')}
          className={`flex-1 py-2 rounded-md transition-all ${
            mobileTab === 'available' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Available NITs ({filteredPrograms.length})
        </button>
        <button
          onClick={() => setMobileTab('selected')}
          className={`flex-1 py-2 rounded-md transition-all relative ${
            mobileTab === 'selected' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          My Choices ({selectedChoices.length})
          {selectedChoices.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px]">
              {selectedChoices.length}
            </span>
          )}
        </button>
      </div>

      {/* Split-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: AVAILABLE NIT CHOICES (lg:col-span-6) */}
        <div
          className={`lg:col-span-6 bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-col h-[740px] ${
            mobileTab === 'available' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="font-sans font-bold text-slate-900 text-sm">
                Available NIT Programmes
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {filteredPrograms.length} Programmes Listed
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by NIT name, branch, or code (e.g. Warangal, CSE, 226)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Select NIT</label>
              <select
                value={selectedNitCode}
                onChange={(e) => setSelectedNitCode(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="ALL">All 31 NITs</option>
                {ALL_NITS.map(nit => (
                  <option key={nit.code} value={nit.code}>
                    {nit.shortName} ({nit.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="ALL">All States</option>
                {INDIAN_STATES_UTS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="ALL">All Branches</option>
                {distinctBranches.map(br => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Quota</label>
              <select
                value={selectedQuotaFilter}
                onChange={(e) => setSelectedQuotaFilter(e.target.value as any)}
                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="ALL">All Quotas</option>
                <option value="HS">Home State Only</option>
                <option value="OS">Other State Only</option>
              </select>
            </div>
          </div>

          {/* Programmes Scrollable List */}
          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No NIT programmes match your filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedNitCode('ALL');
                    setSelectedState('ALL');
                    setSelectedBranch('ALL');
                    setSelectedQuotaFilter('ALL');
                  }}
                  className="text-xs font-semibold text-indigo-600 underline"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.03 }
                  }
                }}
              >
                {filteredPrograms.map(prog => {
                  const isSelected = selectedChoices.some(c => c.programId === prog.id);
                  const quota = determineNitQuota(profile.stateOfEligibility, prog.instituteState);
                  const isHomeState = quota === 'Home State (HS)';

                  return (
                    <motion.div
                      key={prog.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      transition={{ duration: 0.18 }}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            [{prog.instituteCode}] {prog.instituteShortName}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {prog.programCode}
                          </span>
                          <span
                            className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isHomeState
                                ? 'text-purple-700 bg-purple-50 border-purple-200'
                                : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                          >
                            {quota}
                          </span>
                        </div>
                        <h4 className="font-sans font-bold text-xs text-slate-900 truncate">
                          {prog.programName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {prog.instituteState} • {prog.degree}
                        </p>
                      </div>

                      <MotionButton
                        variant={isSelected ? "secondary" : "indigo"}
                        size="icon"
                        disabled={isSelected}
                        onClick={() => addChoice(prog)}
                        className={`!p-2 !min-h-[34px] !min-w-[34px] !rounded-lg ${
                          isSelected ? '!bg-slate-100 !text-slate-400' : ''
                        }`}
                        title={isSelected ? 'Already in your choices' : 'Add to choice preferences'}
                      >
                        <Plus className="w-4 h-4" />
                      </MotionButton>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: MY SELECTED CHOICES (lg:col-span-6) */}
        <div
          className={`lg:col-span-6 bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-col h-[740px] ${
            mobileTab === 'selected' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-indigo-600" />
              <span className="font-sans font-bold text-slate-900 text-sm">
                My Preferred Choice Order
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {selectedChoices.length} Choices ({uniqueNitsInChoices} NITs)
              </span>
              {selectedChoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                  title="Clear all selected choices"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Selected Choices Scrollable List with Smooth Layout Reordering */}
          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {selectedChoices.length === 0 ? (
              <div className="text-center py-20 text-slate-400 space-y-3">
                <ListOrdered className="w-12 h-12 mx-auto text-slate-200" />
                <p className="text-sm font-medium text-slate-600">No NIT choices added yet.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Browse the available programmes on the left and click the <strong>+</strong> button to add choices in order of your preference.
                </p>
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded">
                    JoSAA Rule: Fill your dream choice as #1
                  </span>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {selectedChoices.map((choice, index) => {
                  const isBeingDragged = index === draggedIndex;
                  const isHomeState = choice.quotaApplied === 'Home State (HS)';

                  return (
                    <motion.div
                      key={choice.id}
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
                      className={`p-2.5 sm:p-3 bg-white border rounded-xl shadow-2xs hover:border-indigo-300 transition-colors flex items-center justify-between gap-2.5 relative ${
                        isBeingDragged ? 'opacity-40 border-dashed border-indigo-500 bg-slate-50' : 'border-slate-200'
                      }`}
                    >
                      {/* Drag Handle & Priority Number */}
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        <div
                          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing hidden sm:flex items-center justify-center h-8 w-5"
                          title="Drag to reorder preference"
                        >
                          <GripVertical className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="bg-indigo-600 text-white font-mono font-bold text-xs h-7 w-7 rounded-lg flex items-center justify-center shadow-xs">
                          {choice.priority}
                        </div>
                      </div>

                      {/* Choice Details */}
                      <div className="flex-grow space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-sans font-bold text-xs text-slate-900 truncate">
                            [{choice.instituteCode}] {choice.instituteShortName}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 border border-indigo-100 rounded">
                            {choice.programCode}
                          </span>
                          <span
                            className={`font-mono text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                              isHomeState
                                ? 'text-purple-700 bg-purple-50 border-purple-200'
                                : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                          >
                            {choice.quotaApplied}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 truncate font-medium">
                          {choice.programName}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {choice.instituteState} • {choice.degree}
                        </p>
                      </div>

                      {/* Reorder Buttons & Remove */}
                      <div className="flex items-center gap-1 shrink-0">
                        <MotionButton
                          variant="secondary"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                          className="!p-1.5 !min-h-[30px] !min-w-[30px] !rounded text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Move choice up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </MotionButton>
                        <MotionButton
                          variant="secondary"
                          size="icon"
                          disabled={index === selectedChoices.length - 1}
                          onClick={() => moveDown(index)}
                          className="!p-1.5 !min-h-[30px] !min-w-[30px] !rounded text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Move choice down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </MotionButton>
                        <MotionButton
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChoice(choice.id)}
                          className="!p-1.5 !min-h-[30px] !min-w-[30px] !rounded text-rose-500 hover:!text-rose-700 hover:!bg-rose-50"
                          title="Remove choice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </MotionButton>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Panel Footer Summary */}
          <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Preference <strong>#1</strong> has the highest allotment priority.
            </span>
            <button
              onClick={onNext}
              disabled={selectedChoices.length === 0}
              className={`font-bold hover:underline cursor-pointer ${
                selectedChoices.length > 0 ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              Continue to Review & Lock →
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-base">Clear All Practice Choices?</h3>
                <p className="text-xs text-slate-500">This will remove all {selectedChoices.length} selected NIT preferences.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear your current selection? You can fill new choices at any time during practice.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="mt-6 flex justify-between items-center border-t border-slate-200 pt-4">
        <MotionButton
          variant="secondary"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Eligibility Details
        </MotionButton>
        <MotionButton
          variant="indigo"
          size="lg"
          onClick={onNext}
          disabled={selectedChoices.length === 0}
          shimmer
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Review & Practice Lock Choices
        </MotionButton>
      </div>
    </div>
  );
}

