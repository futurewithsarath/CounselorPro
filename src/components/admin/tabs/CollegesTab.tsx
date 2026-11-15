import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Check, 
  X, 
  AlertCircle,
  MapPin,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { College } from '../../../types';

interface CollegesTabProps {
  colleges: College[];
  onAddCollege: (college: Partial<College>) => Promise<void>;
  onUpdateCollege: (id: string, updates: Partial<College>) => Promise<void>;
  onDeleteCollege: (id: string) => Promise<void>;
}

export default function CollegesTab({ 
  colleges, 
  onAddCollege, 
  onUpdateCollege, 
  onDeleteCollege 
}: CollegesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for Add/Edit
  const [formState, setFormState] = useState<Partial<College>>({
    code: '',
    name: '',
    district: '',
    region: 'OU',
    type: 'Private-Autonomous',
    exam: 'AP_EAPCET',
    stream: 'MPC',
    fee: 45000,
    affiliatingUniversity: '',
    place: ''
  });

  // Unique institutions (group by code to avoid showing 20 branches of the same college if viewed as institutional list)
  const filteredColleges = useMemo(() => {
    return colleges.filter(c => {
      if (selectedExam !== 'ALL' && c.exam !== selectedExam) return false;
      if (selectedRegion !== 'ALL' && c.region !== selectedRegion) return false;
      if (selectedType !== 'ALL') {
        const typeStr = (c.type || '').toLowerCase();
        if (selectedType === 'Govt' && !typeStr.includes('govt') && !typeStr.includes('government')) return false;
        if (selectedType === 'Private' && !typeStr.includes('priv') && !typeStr.includes('pvt')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = c.code.toLowerCase().includes(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchDist = (c.district || '').toLowerCase().includes(q);
        const matchPlace = (c.place || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDist && !matchPlace) return false;
      }
      return true;
    });
  }, [colleges, selectedExam, selectedRegion, selectedType, searchQuery]);

  const totalPages = Math.ceil(filteredColleges.length / pageSize) || 1;
  const paginatedColleges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredColleges.slice(start, start + pageSize);
  }, [filteredColleges, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setFormState({
      code: '',
      name: '',
      district: '',
      region: 'AU',
      type: 'Private-Autonomous',
      exam: 'AP_EAPCET',
      stream: 'MPC',
      fee: 50000,
      affiliatingUniversity: '',
      place: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (college: College) => {
    setEditingCollege(college);
    setFormState({ ...college });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.code || !formState.name) return;
    await onAddCollege(formState);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege || !formState.code || !formState.name) return;
    await onUpdateCollege(editingCollege.id, formState);
    setEditingCollege(null);
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Exam', 'Stream', 'Branch', 'District', 'Region', 'Type', 'Fee', 'Cutoff OC'];
    const rows = filteredColleges.map(c => [
      `"${c.code}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.exam}"`,
      `"${c.stream || ''}"`,
      `"${c.branch}"`,
      `"${c.district || ''}"`,
      `"${c.region || ''}"`,
      `"${c.type || ''}"`,
      c.fee || '',
      c.cutoffOC || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `counselorpro_colleges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by code, college name, district..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        {/* Filter Dropdowns & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exam Filter */}
          <select
            value={selectedExam}
            onChange={(e) => { setSelectedExam(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Exams</option>
            <option value="AP_EAPCET">AP EAPCET</option>
            <option value="TS_EAMCET">TG EAPCET</option>
            <option value="JEE_MAIN">JEE Main (JoSAA)</option>
            <option value="NEET_UG">NEET UG</option>
          </select>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Regions</option>
            <option value="AU">AU (Andhra)</option>
            <option value="SVU">SVU (Rayalaseema)</option>
            <option value="OU">OU (Osmania)</option>
            <option value="SW">SW (State-Wide)</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add College Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add College</span>
          </button>
        </div>
      </div>

      {/* College Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">College Name</th>
                <th className="py-3 px-3">Exam / Stream</th>
                <th className="py-3 px-3">District / Region</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Est. Fee</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedColleges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No colleges match your search criteria</p>
                    <p className="text-[11px] mt-0.5">Try adjusting filters or adding a new college.</p>
                  </td>
                </tr>
              ) : (
                paginatedColleges.map((college) => (
                  <tr key={college.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                        {college.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-900 truncate" title={college.name}>
                        {college.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        {college.affiliatingUniversity && (
                          <span>Univ: {college.affiliatingUniversity}</span>
                        )}
                        {college.place && <span>• {college.place}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700">
                        {college.exam?.replace('_', ' ')}
                      </span>
                      {college.stream && (
                        <span className="ml-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">
                          {college.stream}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{college.district || '—'}</div>
                      <span className="text-[10px] text-slate-400">Region: {college.region || '—'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        college.type?.toLowerCase().includes('govt')
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {college.type || 'Private'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      {college.fee ? `₹${college.fee.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(college)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit College"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(college.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete College"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredColleges.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-slate-700">{Math.min(currentPage * pageSize, filteredColleges.length)}</strong> of{' '}
            <strong className="text-slate-700">{filteredColleges.length.toLocaleString()}</strong> colleges
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {(isAddModalOpen || editingCollege) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingCollege ? 'Edit College Information' : 'Register New College'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingCollege(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingCollege ? handleSaveEdit : handleSaveAdd} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    College Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.code || ''}
                    onChange={(e) => setFormState(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AUCE, JNTUK"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Entrance Exam
                  </label>
                  <select
                    value={formState.exam || 'AP_EAPCET'}
                    onChange={(e) => setFormState(s => ({ ...s, exam: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="AP_EAPCET">AP EAPCET</option>
                    <option value="TS_EAMCET">TG EAPCET</option>
                    <option value="JEE_MAIN">JEE Main JoSAA</option>
                    <option value="NEET_UG">NEET UG</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.name || ''}
                  onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Andhra University College of Engineering"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formState.district || ''}
                    onChange={(e) => setFormState(s => ({ ...s, district: e.target.value }))}
                    placeholder="e.g. Visakhapatnam, Hyderabad"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Region
                  </label>
                  <select
                    value={formState.region || 'OU'}
                    onChange={(e) => setFormState(s => ({ ...s, region: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="AU">AU (Andhra University area)</option>
                    <option value="SVU">SVU (Sri Venkateswara area)</option>
                    <option value="OU">OU (Osmania University area)</option>
                    <option value="SW">SW (State-Wide / All India)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Institution Type
                  </label>
                  <select
                    value={formState.type || 'Private-Autonomous'}
                    onChange={(e) => setFormState(s => ({ ...s, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Govt">Government</option>
                    <option value="University">University Campus</option>
                    <option value="Private-Autonomous">Private Autonomous</option>
                    <option value="Private">Private</option>
                    <option value="Deemed">Deemed University</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Est. Annual Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={formState.fee || ''}
                    onChange={(e) => setFormState(s => ({ ...s, fee: Number(e.target.value) || null }))}
                    placeholder="e.g. 70000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Affiliating University (Optional)
                </label>
                <input
                  type="text"
                  value={formState.affiliatingUniversity || ''}
                  onChange={(e) => setFormState(s => ({ ...s, affiliatingUniversity: e.target.value }))}
                  placeholder="e.g. JNTU Kakinada, JNTU Hyderabad, Dr. YSRUHS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingCollege(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCollege ? 'Save Changes' : 'Create College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this college from the database? This change will be reflected in live student counseling lists.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteCollege(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Delete College
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
