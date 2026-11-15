import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle, 
  Trash2, 
  HardDrive, 
  FileCode,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { firebaseConfig } from '../../../utils/firebase';

interface SettingsTabProps {
  onClearCache: () => void;
}

export default function SettingsTab({ onClearCache }: SettingsTabProps) {
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    onClearCache();
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Firebase Database Configuration Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Active Firebase & Cloud Firestore Infrastructure</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          CounselorPro uses Google Cloud Firestore for real-time college dataset updates and role-based access control.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block font-medium">Project ID</span>
            <span className="font-mono font-bold text-slate-800">{firebaseConfig.projectId}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block font-medium">Auth Domain</span>
            <span className="font-mono font-bold text-slate-800">{firebaseConfig.authDomain}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block font-medium">Storage Bucket</span>
            <span className="font-mono font-bold text-slate-800">{firebaseConfig.storageBucket}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block font-medium">App ID</span>
            <span className="font-mono font-bold text-slate-800 truncate block">{firebaseConfig.appId}</span>
          </div>
        </div>
      </div>

      {/* Cache & Live Synchronization Controls */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          <span>Student Synchronization & Client Cache Purge</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          If you have uploaded or modified cutoffs and need all student clients to instantly refresh their cached college database, trigger a cache purge.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Purge Client Cache & Force Resync</span>
          </button>

          {cleared && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Local cache cleared and synced!</span>
            </span>
          )}
        </div>
      </div>

      {/* Security & Access Policy Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Security & Access Policy</span>
        </h3>
        <div className="text-xs text-slate-600 space-y-2 mt-2 leading-relaxed">
          <p>
            • <strong>Student Role:</strong> Can run unlimited mock allotments, search colleges, create and download PDF preference lists.
          </p>
          <p>
            • <strong>Data Manager:</strong> Can review college catalogs, edit branch names, and preview import datasets.
          </p>
          <p>
            • <strong>Admin & Super Admin:</strong> Have full rights to publish verified datasets to live Firestore collections, modify cutoff ranks, and adjust user privilege tiers.
          </p>
        </div>
      </div>
    </div>
  );
}
