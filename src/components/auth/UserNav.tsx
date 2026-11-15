import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  LayoutDashboard, 
  ChevronDown, 
  Link as LinkIcon,
  Check, 
  Key
} from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserNav() {
  const { user, userProfile, isSuperAdmin, openAuthModal, logout, linkGoogleAccount } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal('login')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full shadow-xs hover:border-slate-300 transition-all cursor-pointer min-h-[36px]"
      >
        <LogIn className="w-3.5 h-3.5 text-emerald-600" />
        <span>Sign In</span>
      </button>
    );
  }

  const isOwnerAdmin = isSuperAdmin;
  const initial = (userProfile?.displayName || user.email || 'U').charAt(0).toUpperCase();
  const hasGoogleLinked = userProfile?.providerIds?.includes('google.com');

  const handleLinkGoogle = async () => {
    setLinkError('');
    try {
      await linkGoogleAccount();
      setLinkSuccess(true);
      setTimeout(() => setLinkSuccess(false), 3000);
    } catch (e: any) {
      console.error('Account linking failed:', e);
      setLinkError(e.message || 'Linking failed');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-xs transition-all cursor-pointer min-h-[36px]"
      >
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={userProfile?.displayName || 'User'} 
            className="w-6 h-6 rounded-full object-cover border border-slate-200" 
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
            {initial}
          </div>
        )}

        <div className="hidden sm:flex flex-col text-left leading-none">
          <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate">
            {userProfile?.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-slate-400 capitalize">
            {isOwnerAdmin ? 'Super Admin' : 'Student'}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">
              {userProfile?.displayName || 'Student User'}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {user.email || user.phoneNumber || 'Authenticated Student'}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isOwnerAdmin 
                  ? 'bg-purple-100 border-purple-200 text-purple-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {isOwnerAdmin ? 'Super Admin (Owner)' : 'Student'}
              </span>
            </div>
          </div>

          {/* Super Admin Management Shortcut */}
          {isOwnerAdmin && (
            <div className="px-2 py-1.5 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/admin');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          )}

          {/* Account Provider Linking */}
          {!hasGoogleLinked && (
            <div className="px-3 py-2 border-b border-slate-100">
              <button
                type="button"
                onClick={handleLinkGoogle}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Link Google Account</span>
                </span>
                {linkSuccess && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              {linkError && <p className="text-[10px] text-red-600 mt-1">{linkError}</p>}
            </div>
          )}

          {/* Sign Out */}
          <div className="px-2 pt-1.5">
            <button
              type="button"
              onClick={async () => {
                setDropdownOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
