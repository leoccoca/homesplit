import React, { useState } from 'react';
import { Home, LogOut, LogIn, MessageSquareQuote } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from './FeedbackModal';
import { AnimatePresence } from 'motion/react';

export default function Header() {
  const { user, login, logout } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 pt-3 pb-4 sm:pt-4 sm:pb-4 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm hidden sm:block">
            <Home size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">SplitMate</h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">The Expense Tracker</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-all"
            title="Send Feedback"
          >
            <MessageSquareQuote size={18} />
            <span className="hidden sm:inline">Feedback</span>
          </button>

          <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

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

      <AnimatePresence>
        {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      </AnimatePresence>
    </>
  );
}
