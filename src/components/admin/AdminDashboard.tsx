import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  BookOpen,
  Target,
  UploadCloud,
  Users,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Compass,
  ArrowLeft,
  Lock,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { College } from '../../types';
import {
  COLLEGES_DB,
  loadRealCollegesForExam,
  COLLEGES_SOURCE,
  getDefaultDatasetYear,
  clearCollegesClientCache
} from '../../data/colleges';

import OverviewTab from './tabs/OverviewTab';
import CollegesTab from './tabs/CollegesTab';
import CoursesTab from './tabs/CoursesTab';
import CutoffsTab from './tabs/CutoffsTab';
import UploadTab from './tabs/UploadTab';
import UsersTab from './tabs/UsersTab';
import SettingsTab from './tabs/SettingsTab';
import { AdminLoadingScreen, AdminAccessDeniedScreen } from './AdminRouteGuard';

interface AdminDashboardProps {
  onClose?: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    isAdmin,
    isSuperAdmin,
    isLoading: authLoading,
    openAuthModal,
    logout
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live colleges repository state
  const [collegesList, setCollegesList] = useState<College[]>(() => {
    return [...COLLEGES_DB];
  });

  const [isLoadingColleges, setIsLoadingColleges] = useState(false);

  // Initial load of default verified dataset if empty (strictly guarded for Super Admin)
  // Deferred until Colleges or Cutoffs tab is actively opened to ensure 0ms instant overview mount
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (activeTab !== 'colleges' && activeTab !== 'cutoffs') return;
    if (collegesList.length === 0) {
      setIsLoadingColleges(true);
      loadRealCollegesForExam('AP_EAPCET', 'MPC', 2025).then(() => {
        setCollegesList([...COLLEGES_DB]);
        setIsLoadingColleges(false);
      });
    }
  }, [isSuperAdmin, activeTab]);

  const stats = useMemo(() => {
    const uniqueColleges = new Set(collegesList.map(c => c.code)).size;
    const uniqueBranches = new Set(collegesList.map(c => c.branch)).size;
    const totalCutoffs = collegesList.filter(c => c.cutoffOC !== null || c.cutoffBC !== null).length;

    return {
      totalColleges: uniqueColleges || 342,
      totalCourses: uniqueBranches || 38,
      totalCutoffs: totalCutoffs || collegesList.length || 1468,
      totalUsers: 5,
      datasetCount: 7
    };
  }, [collegesList]);

  // CRUD Handlers that synchronize with backend APIs, Firestore, & live collections
  const handleAddCollege = async (newCol: Partial<College>) => {
    try {
      const token = user ? await user.getIdToken(true) : null;
      if (!token) {
        throw new Error('Authentication required. Please sign in as Super Admin.');
      }

      const res = await fetch('/api/admin/colleges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCol)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add college record.');
      }

      const college: College = data.college;

      // Update in-memory collections and local state
      COLLEGES_DB.unshift(college);
      setCollegesList(prev => [college, ...prev.filter(c => c.id !== college.id)]);

      // Purge client cache so student modules get fresh data immediately
      clearCollegesClientCache();
      return college;
    } catch (e: any) {
      console.error('[ADMIN ADD COLLEGE ERROR]', e);
      throw e;
    }
  };

  const handleUpdateCollege = async (id: string, updates: Partial<College>) => {
    try {
      const token = user ? await user.getIdToken(true) : null;
      if (!token) {
        throw new Error('Authentication required. Please sign in as Super Admin.');
      }

      const res = await fetch(`/api/admin/colleges/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update college record.');
      }

      const updated = collegesList.map(c => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      });

      setCollegesList(updated);

      // Update COLLEGES_DB in-memory
      const dbIndex = COLLEGES_DB.findIndex(c => c.id === id);
      if (dbIndex >= 0) {
        COLLEGES_DB[dbIndex] = { ...COLLEGES_DB[dbIndex], ...updates };
      }

      clearCollegesClientCache();
    } catch (e: any) {
      console.error('[ADMIN UPDATE COLLEGE ERROR]', e);
      throw e;
    }
  };

  const handleDeleteCollege = async (id: string) => {
    try {
      const token = user ? await user.getIdToken(true) : null;
      if (!token) {
        throw new Error('Authentication required. Please sign in as Super Admin.');
      }

      const collegeToDelete = collegesList.find(c => c.id === id);
      const datasetId = collegeToDelete?.exam
        ? `${collegeToDelete.exam}_${collegeToDelete.stream || 'MPC'}_${collegeToDelete.year || 2025}`
        : undefined;

      const deleteUrl = `/api/admin/colleges/${encodeURIComponent(id)}${datasetId ? `?datasetId=${encodeURIComponent(datasetId)}` : ''}`;

      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete college record from database.');
      }

      // Update local state and in-memory collections
      setCollegesList(prev => prev.filter(c => c.id !== id));
      const dbIndex = COLLEGES_DB.findIndex(c => c.id === id);
      if (dbIndex >= 0) {
        COLLEGES_DB.splice(dbIndex, 1);
      }

      // Invalidate client cache so public search immediately excludes this college
      clearCollegesClientCache();
    } catch (e: any) {
      console.error('[ADMIN DELETE COLLEGE ERROR]', e);
      throw e;
    }
  };

  const handleUpdateCutoff = async (
    id: string,
    cutoffs: { cutoffOC?: number | null; cutoffBC?: number | null; cutoffSCST?: number | null }
  ) => {
    await handleUpdateCollege(id, cutoffs);
  };

  const handlePublishDataset = async (datasetId: string, records: any[], metadata: any) => {
    try {
      const token = user ? await user.getIdToken(true) : null;
      if (!token) {
        throw new Error('Authentication required. Please sign in as Super Admin.');
      }

      const res = await fetch('/api/admin/upload-colleges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ metadata, colleges: records })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish dataset to server.');
      }

      // Synchronize to COLLEGES_DB
      COLLEGES_DB.length = 0;
      records.forEach(r => COLLEGES_DB.push(r));
      setCollegesList([...records]);

      // Clear client cache so student modules get fresh data
      clearCollegesClientCache();
    } catch (e: any) {
      console.error('[ADMIN PUBLISH DATASET ERROR]', e);
      throw e;
    }
  };

  const handleClearCache = () => {
    clearCollegesClientCache();
    // Re-fetch default
    loadRealCollegesForExam('AP_EAPCET', 'MPC', 2025).then(() => {
      setCollegesList([...COLLEGES_DB]);
    });
  };

  const handleExit = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  // Instant Redirection Fallback Guard:
  // If a student or non-admin account somehow mounts AdminDashboard,
  // immediately bounce back to Student Portal without fetching any data or rendering console.
  useEffect(() => {
    if (!authLoading && (user && !isSuperAdmin || userProfile?.role !== 'super_admin')) {
      handleExit();
    }
  }, [authLoading, user, isSuperAdmin, userProfile?.role]);

  // 1. Loading State: Never render dashboard while authenticating
  if (authLoading) {
    return <AdminLoadingScreen />;
  }

  // 2. Unauthenticated: Administrator portal login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Administrator Portal Access
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            You must be signed in with the authorized Super Admin account to access the CounselorPro Central Management Console.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => openAuthModal('login', 'Please sign in with your Super Admin credentials.')}
              className="w-full min-h-[42px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In as Super Admin</span>
            </button>

            <button
              type="button"
              onClick={handleExit}
              className="w-full min-h-[40px] py-2 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Counseling Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated as Student: Fail-closed Access Restricted barrier
  if (user && !isSuperAdmin) {
    return (
      <AdminAccessDeniedScreen
        email={user.email}
        displayName={userProfile?.displayName}
        onReturnHome={handleExit}
        onSignOut={async () => {
          await logout();
          handleExit();
        }}
      />
    );
  }

  // 4. Missing or non-super_admin role claim
  if (userProfile?.role !== 'super_admin') {
    return (
      <AdminAccessDeniedScreen
        email={user.email}
        displayName={userProfile?.displayName}
        onReturnHome={handleExit}
        onSignOut={async () => {
          await logout();
          handleExit();
        }}
      />
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview & Stats', icon: LayoutDashboard },
    { id: 'colleges', label: 'College Master', icon: Building2 },
    { id: 'courses', label: 'Courses & Branches', icon: BookOpen },
    { id: 'cutoffs', label: 'Seat Matrix & Cutoffs', icon: Target },
    { id: 'upload', label: 'Data Upload & Sync', icon: UploadCloud },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'settings', label: 'Settings & Cache', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 cursor-pointer" onClick={handleExit}>
              <img
                src="/logo.png"
                alt="CounselorPro"
                className="w-8 h-8 object-contain rounded-lg drop-shadow-xs"
              />
              <span className="font-bold text-lg tracking-tight text-slate-900 hidden sm:inline">
                Counselor<span className="text-emerald-600">Pro</span>
              </span>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin Management Console</span>
            </span>
          </div>

          {/* Right Action: Exit to Student Portal & Profile */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exit to Student Portal</span>
              <span className="sm:hidden">Exit</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {(userProfile?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {userProfile?.displayName || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">
                  {userProfile?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administration Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-100 px-2">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt="CounselorPro"
                      className="w-6 h-6 object-contain rounded-md"
                    />
                    <span className="font-bold text-slate-900 text-sm">
                      Counselor<span className="text-emerald-600">Pro</span> Admin
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Tab Content Body */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'colleges' && (
            <CollegesTab
              colleges={collegesList}
              onAddCollege={handleAddCollege}
              onUpdateCollege={handleUpdateCollege}
              onDeleteCollege={handleDeleteCollege}
            />
          )}

          {activeTab === 'courses' && (
            <CoursesTab />
          )}

          {activeTab === 'cutoffs' && (
            <CutoffsTab
              colleges={collegesList}
              onUpdateCutoff={handleUpdateCutoff}
            />
          )}

          {activeTab === 'upload' && (
            <UploadTab onPublishDataset={handlePublishDataset} />
          )}

          {activeTab === 'users' && (
            <UsersTab />
          )}

          {activeTab === 'settings' && (
            <SettingsTab onClearCache={handleClearCache} />
          )}
        </main>
      </div>
    </div>
  );
}
