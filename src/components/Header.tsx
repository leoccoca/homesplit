import React, { useState, useEffect, useRef } from 'react';
import { Home, LogOut, LogIn, Wallet, List, Users, Tags, BarChart3, ChevronDown, Check, Settings, Users2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Group } from '../types';

interface HeaderProps {
  activeTab?: 'summary' | 'expenses' | 'analysis' | 'people' | 'categories' | 'groups';
  setActiveTab?: (tab: 'summary' | 'expenses' | 'analysis' | 'people' | 'categories' | 'groups') => void;
  showNavigation?: boolean;
  groupId?: string | null;
  onSelectGroup?: (id: string) => void;
}

export default function Header({ activeTab, setActiveTab, showNavigation, groupId, onSelectGroup }: HeaderProps) {
  const { user, login, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch groups reactive list
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gList: Group[] = [];
      snapshot.forEach(doc => {
        gList.push({ id: doc.id, ...doc.data() } as Group);
      });
      setGroups(gList);
    });
    return unsubscribe;
  }, [user]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeGroupName = groups.find(g => g.id === groupId)?.name || '';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 pt-3 pb-4 sm:pt-4 sm:pb-4 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm hidden sm:block">
              <Home size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">SplitMate</h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">The Expense Tracker</p>
            </div>
          </div>

          {/* Header Navigation Tabs: Exactly Summary, Expenses, Analysis, People, Categories */}
          {showNavigation && activeTab && setActiveTab && (
            <div className="hidden sm:flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 items-center justify-center gap-0.5 max-w-full overflow-x-auto">
              <HeaderTabButton icon={<Wallet size={14} />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
              <HeaderTabButton icon={<List size={14} />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
              <HeaderTabButton icon={<BarChart3 size={14} />} label="Analysis" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
              <HeaderTabButton icon={<Users size={14} />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
              <HeaderTabButton icon={<Tags size={14} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
            </div>
          )}

          {/* Account and Group section */}
          <div className="flex items-center gap-3" ref={dropdownRef}>
            {user ? (
              <div className="relative">
                <button
                  id="header-user-menu-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs uppercase overflow-hidden flex-shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (user.displayName ? user.displayName.charAt(0) : 'U')
                    )}
                  </div>
                  <div className="text-left hidden sm:block min-w-0 max-w-[120px]">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                      {activeGroupName ? 'Group Workspace' : 'Account'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                      {activeGroupName || user.displayName || 'Me'}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                </button>

                {/* Dropdown Card */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Profile Info header */}
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{user.displayName || 'SplitMate User'}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>

                    {/* Groups workspace selection sub-menu */}
                    {showNavigation && (
                      <>
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                            <Users2 size={10} />
                            My Groups
                          </span>
                          {groups.length > 0 && (
                            <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              {groups.length} total
                            </span>
                          )}
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                          {groups.length === 0 ? (
                            <div className="px-4 py-2 text-center text-xs text-slate-400 italic">No groups found</div>
                          ) : (
                            groups.map((group) => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  if (onSelectGroup) {
                                    onSelectGroup(group.id);
                                  }
                                  setDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className={`font-bold truncate ${group.id === groupId ? 'text-indigo-600' : 'text-slate-700'}`}>
                                    {group.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 truncate mt-0.5">ID: {group.id}</p>
                                </div>
                                {group.id === groupId && (
                                  <Check size={14} className="text-indigo-600 flex-shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="border-t border-slate-100 py-1">
                          <button
                            onClick={() => {
                              if (setActiveTab) {
                                setActiveTab('groups');
                              }
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50/70 font-bold flex items-center gap-2 transition-all"
                          >
                            <Settings size={14} />
                            Switch / Manage Groups
                          </button>
                        </div>
                      </>
                    )}

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </div>

        </div>
      </header>
    </>
  );
}

function HeaderTabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
        active 
          ? 'bg-indigo-600 text-white shadow-sm' 
          : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
