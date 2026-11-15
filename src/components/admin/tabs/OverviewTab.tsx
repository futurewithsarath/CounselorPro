import React from 'react';
import { 
  Building2, 
  BookOpen, 
  Target, 
  Users, 
  Database, 
  ArrowUpRight, 
  CheckCircle2, 
  UploadCloud, 
  FileSpreadsheet, 
  ShieldCheck,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface OverviewTabProps {
  stats: {
    totalColleges: number;
    totalCourses: number;
    totalCutoffs: number;
    totalUsers: number;
    datasetCount: number;
  };
  onNavigateTab: (tab: string) => void;
}

export default function OverviewTab({ stats, onNavigateTab }: OverviewTabProps) {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <Database className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-200 mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>CounselorPro Central Console · Role: {userProfile?.role?.replace('_', ' ').toUpperCase()}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Institutional Data & Allotment Management
          </h2>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Manage official colleges, branches, seat matrices, and cutoffs across AP EAPCET, TG EAPCET, JEE Main JoSAA, and NEET UG. Updates synchronize directly with student-facing choice-filling modules.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('colleges')}
              className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Manage Colleges</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 border border-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-200" />
              <span>Import Dataset (CSV/Excel/PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Institutions</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {stats.totalColleges.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified across 4 entrance exams</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Courses & Branches</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {stats.totalCourses.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Engineering, Medical & Allied</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Historical Cutoff Records</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {stats.totalCutoffs.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-purple-600 font-medium">
              <Sparkles className="w-3 h-3" />
              <span>OC, BC, SC, ST, EWS & Quotas</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Registered Students & Staff</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {stats.totalUsers.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Firebase RBAC Secured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Live Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Card */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>Fast Administration Actions</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('colleges')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Add New College</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                Register a new government or private college with codes, region, and district.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('courses')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Add Branch / Course</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                Define specializations like CSE-AI, ECE, MBBS, or JoSAA NIT engineering streams.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('cutoffs')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Update Cutoff Matrix</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                Adjust historical cutoff ranks to refine student mock allotment accuracy.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Bulk Data Upload</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                Upload CSV, Excel, or PDF official counseling lists with duplicate detection.
              </p>
            </button>
          </div>
        </div>

        {/* Database Health & Architecture */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>System & Sync Health</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-600">Firebase Firestore</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active & Synced
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-600">Student Option Entry</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Live Mirroring
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-600">Offline Fallback Datasets</span>
                <span className="font-semibold text-slate-800">
                  {stats.datasetCount} JSON Bundles
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              When updates are committed, all active students practicing web options receive updated college data instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
