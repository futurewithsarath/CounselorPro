import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  RefreshCw,
  User,
  CheckCircle,
  Clock,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth, UserProfile } from '../../../context/AuthContext';
import { db, collection, getDocs } from '../../../utils/firebase';

export default function UsersTab() {
  const { userProfile: currentProfile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (db) {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty) {
          const list: UserProfile[] = [];
          usersSnap.forEach(d => {
            list.push(d.data() as UserProfile);
          });
          setUsers(list);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read users collection directly:', e);
    }

    setUsers(currentProfile ? [currentProfile] : []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentProfile]);

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phoneNumber || '').includes(q) ||
      (u.uid || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Info */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search registered students by name, email, or UID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student / User</th>
                <th className="py-3 px-3">Email Address</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Sign-In Providers</th>
                <th className="py-3 px-4 text-center">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuper = u.role === 'super_admin';
                  const initial = (u.displayName || u.email || 'U').charAt(0).toUpperCase();
                  const isCurrent = currentProfile?.uid === u.uid;

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSuper ? 'bg-purple-700' : 'bg-emerald-600'
                          }`}>
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.displayName || 'Anonymous Student'}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono truncate block max-w-[140px]">
                              {u.uid}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-700">
                        {u.email || '—'}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {u.phoneNumber || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(u.providerIds || ['password']).map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                              {p.replace('.com', '')}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isSuper 
                            ? 'bg-purple-100 border-purple-200 text-purple-700' 
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {isSuper ? 'Super Admin (Owner)' : 'Student'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
