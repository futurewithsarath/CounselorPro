import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  GraduationCap, 
  Layers, 
  Check, 
  X 
} from 'lucide-react';

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  stream: 'MPC' | 'BiPC' | 'JoSAA' | 'NEET';
  durationYears: number;
  degree: string;
  description?: string;
  collegeCount?: number;
}

const DEFAULT_BRANCHES: BranchRecord[] = [
  { id: 'cse', code: 'CSE', name: 'Computer Science and Engineering', stream: 'MPC', durationYears: 4, degree: 'B.Tech / B.E.', collegeCount: 342 },
  { id: 'csm', code: 'CSM', name: 'CSE (Artificial Intelligence & Machine Learning)', stream: 'MPC', durationYears: 4, degree: 'B.Tech', collegeCount: 280 },
  { id: 'csd', code: 'CSD', name: 'CSE (Data Science)', stream: 'MPC', durationYears: 4, degree: 'B.Tech', collegeCount: 210 },
  { id: 'ece', code: 'ECE', name: 'Electronics and Communication Engineering', stream: 'MPC', durationYears: 4, degree: 'B.Tech / B.E.', collegeCount: 310 },
  { id: 'eee', code: 'EEE', name: 'Electrical and Electronics Engineering', stream: 'MPC', durationYears: 4, degree: 'B.Tech / B.E.', collegeCount: 260 },
  { id: 'inf', code: 'INF', name: 'Information Technology', stream: 'MPC', durationYears: 4, degree: 'B.Tech', collegeCount: 190 },
  { id: 'mec', code: 'MEC', name: 'Mechanical Engineering', stream: 'MPC', durationYears: 4, degree: 'B.Tech / B.E.', collegeCount: 290 },
  { id: 'civ', code: 'CIV', name: 'Civil Engineering', stream: 'MPC', durationYears: 4, degree: 'B.Tech / B.E.', collegeCount: 275 },
  { id: 'cai', code: 'CAI', name: 'Artificial Intelligence & Data Science', stream: 'MPC', durationYears: 4, degree: 'B.Tech', collegeCount: 185 },
  { id: 'phm', code: 'PHM', name: 'Bachelor of Pharmacy (B.Pharmacy)', stream: 'BiPC', durationYears: 4, degree: 'B.Pharm', collegeCount: 145 },
  { id: 'pbd', code: 'PBD', name: 'Pharm.D (Doctor of Pharmacy)', stream: 'BiPC', durationYears: 6, degree: 'Pharm.D', collegeCount: 88 },
  { id: 'agr', code: 'AGR', name: 'B.Sc (Hons) Agriculture', stream: 'BiPC', durationYears: 4, degree: 'B.Sc (Hons)', collegeCount: 42 },
  { id: 'bio', code: 'BIO', name: 'Biotechnology Engineering', stream: 'BiPC', durationYears: 4, degree: 'B.Tech', collegeCount: 52 },
  { id: 'mbbs', code: 'MBBS', name: 'Bachelor of Medicine and Bachelor of Surgery', stream: 'NEET', durationYears: 5.5, degree: 'MBBS', collegeCount: 710 },
  { id: 'bds', code: 'BDS', name: 'Bachelor of Dental Surgery', stream: 'NEET', durationYears: 5, degree: 'BDS', collegeCount: 320 },
  { id: 'bams', code: 'BAMS', name: 'Bachelor of Ayurvedic Medicine & Surgery', stream: 'NEET', durationYears: 5.5, degree: 'BAMS', collegeCount: 180 },
  { id: 'nit_cse', code: 'NIT_CSE', name: 'Computer Science & Engineering (4 Years, B. Tech)', stream: 'JoSAA', durationYears: 4, degree: 'B.Tech', collegeCount: 31 },
  { id: 'nit_ece', code: 'NIT_ECE', name: 'Electronics & Communication Engineering', stream: 'JoSAA', durationYears: 4, degree: 'B.Tech', collegeCount: 31 }
];

export default function CoursesTab() {
  const [branches, setBranches] = useState<BranchRecord[]>(() => {
    try {
      const saved = localStorage.getItem('counselor_branches');
      return saved ? JSON.parse(saved) : DEFAULT_BRANCHES;
    } catch {
      return DEFAULT_BRANCHES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);

  const [formState, setFormState] = useState<Partial<BranchRecord>>({
    code: '',
    name: '',
    stream: 'MPC',
    durationYears: 4,
    degree: 'B.Tech',
    description: ''
  });

  const saveBranches = (newBranches: BranchRecord[]) => {
    setBranches(newBranches);
    localStorage.setItem('counselor_branches', JSON.stringify(newBranches));
  };

  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      if (selectedStream !== 'ALL' && b.stream !== selectedStream) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.degree.toLowerCase().includes(q);
      }
      return true;
    });
  }, [branches, selectedStream, searchQuery]);

  const handleOpenAdd = () => {
    setFormState({
      code: '',
      name: '',
      stream: 'MPC',
      durationYears: 4,
      degree: 'B.Tech',
      description: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: BranchRecord) => {
    setEditingBranch(branch);
    setFormState({ ...branch });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.code || !formState.name) return;

    const newBranch: BranchRecord = {
      id: formState.code.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      code: formState.code.toUpperCase(),
      name: formState.name,
      stream: (formState.stream || 'MPC') as any,
      durationYears: Number(formState.durationYears) || 4,
      degree: formState.degree || 'B.Tech',
      description: formState.description || '',
      collegeCount: 0
    };

    saveBranches([...branches, newBranch]);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !formState.code || !formState.name) return;

    const updated = branches.map(b => {
      if (b.id === editingBranch.id) {
        return {
          ...b,
          code: (formState.code || b.code).toUpperCase(),
          name: formState.name || b.name,
          stream: (formState.stream || b.stream) as any,
          durationYears: Number(formState.durationYears) || b.durationYears,
          degree: formState.degree || b.degree,
          description: formState.description ?? b.description
        };
      }
      return b;
    });

    saveBranches(updated);
    setEditingBranch(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      saveBranches(branches.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by code or name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Streams</option>
            <option value="MPC">MPC (Engineering)</option>
            <option value="BiPC">BiPC (Pharmacy/Agri)</option>
            <option value="JoSAA">JoSAA (NITs)</option>
            <option value="NEET">NEET UG (Medical)</option>
          </select>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Branch Code</th>
                <th className="py-3 px-4">Program / Branch Name</th>
                <th className="py-3 px-3">Stream</th>
                <th className="py-3 px-3">Degree Awarded</th>
                <th className="py-3 px-3 text-center">Duration</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No branches match the filter criteria</p>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                        {branch.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900">{branch.name}</div>
                      {branch.description && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{branch.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        branch.stream === 'MPC' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        branch.stream === 'BiPC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        branch.stream === 'NEET' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {branch.stream}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {branch.degree}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {branch.durationYears} Years
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(branch)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(branch.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {/* ADD / EDIT MODAL */}
      {(isAddModalOpen || editingBranch) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingBranch ? 'Edit Course / Branch' : 'Register New Course / Branch'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingBranch(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingBranch ? handleSaveEdit : handleSaveAdd} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Branch Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.code || ''}
                    onChange={(e) => setFormState(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. CSE, MBBS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Counselling Stream
                  </label>
                  <select
                    value={formState.stream || 'MPC'}
                    onChange={(e) => setFormState(s => ({ ...s, stream: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="MPC">MPC (Engineering)</option>
                    <option value="BiPC">BiPC (Pharmacy & Agri)</option>
                    <option value="JoSAA">JoSAA (NITs)</option>
                    <option value="NEET">NEET UG (Medical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.name || ''}
                  onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Degree Awarded
                  </label>
                  <input
                    type="text"
                    value={formState.degree || ''}
                    onChange={(e) => setFormState(s => ({ ...s, degree: e.target.value }))}
                    placeholder="e.g. B.Tech, MBBS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formState.durationYears || 4}
                    onChange={(e) => setFormState(s => ({ ...s, durationYears: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingBranch(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingBranch ? 'Save Branch' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
