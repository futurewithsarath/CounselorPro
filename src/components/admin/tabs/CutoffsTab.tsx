import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Search, 
  Filter, 
  Save, 
  Check, 
  AlertCircle, 
  ArrowUpDown,
  Building2,
  Sparkles
} from 'lucide-react';
import { College } from '../../../types';

interface CutoffsTabProps {
  colleges: College[];
  onUpdateCutoff: (id: string, cutoffs: { cutoffOC?: number | null; cutoffBC?: number | null; cutoffSCST?: number | null }) => Promise<void>;
}

export default function CutoffsTab({ colleges, onUpdateCutoff }: CutoffsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('AP_EAPCET');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ cutoffOC: string; cutoffBC: string; cutoffSCST: string }>({
    cutoffOC: '',
    cutoffBC: '',
    cutoffSCST: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredColleges = useMemo(() => {
    return colleges.filter(c => {
      if (selectedExam !== 'ALL' && c.exam !== selectedExam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) || 
          c.name.toLowerCase().includes(q) || 
          c.branch.toLowerCase().includes(q) ||
          (c.district || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [colleges, selectedExam, searchQuery]);

  const totalPages = Math.ceil(filteredColleges.length / pageSize) || 1;
  const paginatedColleges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredColleges.slice(start, start + pageSize);
  }, [filteredColleges, currentPage, pageSize]);

  const startEdit = (college: College) => {
    setEditingId(college.id);
    setEditValues({
      cutoffOC: college.cutoffOC ? String(college.cutoffOC) : '',
      cutoffBC: college.cutoffBC ? String(college.cutoffBC) : '',
      cutoffSCST: college.cutoffSCST ? String(college.cutoffSCST) : ''
    });
  };

  const handleSaveCutoffs = async (id: string) => {
    setIsSaving(true);
    try {
      const ocNum = editValues.cutoffOC ? Number(editValues.cutoffOC) : null;
      const bcNum = editValues.cutoffBC ? Number(editValues.cutoffBC) : null;
      const scstNum = editValues.cutoffSCST ? Number(editValues.cutoffSCST) : null;

      await onUpdateCutoff(id, {
        cutoffOC: ocNum,
        cutoffBC: bcNum,
        cutoffSCST: scstNum
      });

      setEditingId(null);
      setSaveSuccessId(id);
      setTimeout(() => setSaveSuccessId(null), 2500);
    } catch (e) {
      console.error('Failed to update cutoffs:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top filter banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search college, code, or branch..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedExam}
            onChange={(e) => { setSelectedExam(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Entrance Exams</option>
            <option value="AP_EAPCET">AP EAPCET</option>
            <option value="TS_EAMCET">TG EAPCET</option>
            <option value="JEE_MAIN">JEE Main JoSAA</option>
            <option value="NEET_UG">NEET UG</option>
          </select>
        </div>
      </div>

      {/* Cutoff Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">College</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Region</th>
                <th className="py-3 px-3 text-center">OC Cutoff Rank</th>
                <th className="py-3 px-3 text-center">BC Cutoff Rank</th>
                <th className="py-3 px-3 text-center">SC/ST Cutoff Rank</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedColleges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Target className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No cutoff records found</p>
                  </td>
                </tr>
              ) : (
                paginatedColleges.map((college) => {
                  const isEditing = editingId === college.id;
                  const isJustSaved = saveSuccessId === college.id;

                  return (
                    <tr key={college.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px]">
                            {college.code}
                          </span>
                          <span className="font-semibold text-slate-900 truncate" title={college.name}>
                            {college.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-emerald-800 px-2 py-0.5 bg-emerald-50 rounded">
                          {college.branch}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {college.region || '—'}
                      </td>

                      {/* OC Cutoff */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.cutoffOC}
                            onChange={(e) => setEditValues(v => ({ ...v, cutoffOC: e.target.value }))}
                            className="w-24 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-center font-bold text-xs"
                            placeholder="OC Rank"
                          />
                        ) : (
                          <span className="font-bold text-slate-800">
                            {college.cutoffOC ? college.cutoffOC.toLocaleString() : '—'}
                          </span>
                        )}
                      </td>

                      {/* BC Cutoff */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.cutoffBC}
                            onChange={(e) => setEditValues(v => ({ ...v, cutoffBC: e.target.value }))}
                            className="w-24 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-center font-bold text-xs"
                            placeholder="BC Rank"
                          />
                        ) : (
                          <span className="font-bold text-slate-700">
                            {college.cutoffBC ? college.cutoffBC.toLocaleString() : '—'}
                          </span>
                        )}
                      </td>

                      {/* SC/ST Cutoff */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.cutoffSCST}
                            onChange={(e) => setEditValues(v => ({ ...v, cutoffSCST: e.target.value }))}
                            className="w-24 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-center font-bold text-xs"
                            placeholder="SC/ST Rank"
                          />
                        ) : (
                          <span className="font-bold text-slate-700">
                            {college.cutoffSCST ? college.cutoffSCST.toLocaleString() : '—'}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveCutoffs(college.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(college)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            {isJustSaved ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Saved
                              </span>
                            ) : (
                              'Edit'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page <strong className="text-slate-700">{currentPage}</strong> of{' '}
            <strong className="text-slate-700">{totalPages}</strong> ({filteredColleges.length.toLocaleString()} total cutoffs)
          </span>

          <div className="flex gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
