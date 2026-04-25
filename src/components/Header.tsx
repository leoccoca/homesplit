import React from 'react';
import { Home, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 sm:pt-4 sm:pb-12 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm hidden sm:block">
            <Home size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">SplitMate</h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Roommate Expense Tracker</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">
                {user.displayName}
              </span>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Log out"
              >
                <LogOut size={20} />
              </button>
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
  );
}
