import React, { useMemo, useState } from 'react';
import { Expense, User, Category } from '../types';
import { calculateBalances, calculateSettlements } from '../lib/splitLogic';
import { formatCurrency, parseLocalDate } from '../lib/utils';
import { ArrowRight, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import SettleUpModal from './SettleUpModal';
import { AnimatePresence } from 'motion/react';

export default function Dashboard({ expenses, users, categories, onAdd }: { expenses: Expense[], users: User[], categories: Category[], onAdd?: (e: Expense) => void }) {
  const [activeSettle, setActiveSettle] = useState<{ fromUser: User; toUser: User; amount: number } | null>(null);
  const [expandedSettlement, setExpandedSettlement] = useState<number | null>(null);

  const handleSettleClick = (s: { fromUser: User; toUser: User; amount: number }) => {
    setActiveSettle(s);
  };

  // Extract available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(e => {
      months.add(e.date.substring(0, 7)); // 'YYYY-MM'
    });
    const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
    // If empty, put current month
    if (sorted.length === 0) sorted.push(new Date().toISOString().substring(0, 7));
    return sorted;
  }, [expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]);

  // Filter expenses by selected month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Outstanding balances (only unsettled expenses) overall, across all time?
  // Usually settlements are overall. Wait, user wants month by month. Let's do balances over ALL time for settlements,
  // but show spending for the month.
  // Actually, balances are always a running total, so they should be ALL UNSETTLED.
  const balances = useMemo(() => calculateBalances(expenses, users, true), [expenses, users]);
  const settlements = useMemo(() => calculateSettlements(balances, users), [balances, users]);

  // Total spent in this month
  const totalSpent = useMemo(() => currentMonthExpenses.reduce((acc, e) => acc + e.amount, 0), [currentMonthExpenses]);

  // Spending per member in this month (split amount)
  const memberSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    users.forEach(u => spending[u.id] = 0);
    currentMonthExpenses.forEach(e => {
      const involvedIds = e.involvedUserIds || users.map(u => u.id);
      const splitAmount = e.amount / involvedIds.length;
      involvedIds.forEach(id => {
        if (spending[id] !== undefined) {
           spending[id] += splitAmount;
        }
      });
    });
    return spending;
  }, [currentMonthExpenses, users]);

  const onesOwed = useMemo(() => users.filter(u => (balances[u.id] || 0) > 0.01).sort((a, b) => balances[b.id] - balances[a.id]), [users, balances]);
  const onesOwing = useMemo(() => users.filter(u => (balances[u.id] || 0) < -0.01).sort((a, b) => balances[a.id] - balances[b.id]), [users, balances]);

  const changeMonth = (offset: number) => {
    const idx = availableMonths.indexOf(selectedMonth);
    const newIdx = idx - offset; // -1 moves forward in time because sorted descending
    if (newIdx >= 0 && newIdx < availableMonths.length) {
      setSelectedMonth(availableMonths[newIdx]);
    }
  };

  const formattedMonth = useMemo(() => {
    if (!selectedMonth) return '';
    try {
      return format(parseLocalDate(`${selectedMonth}-01`), 'MMMM yyyy');
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mx-auto max-w-sm mb-6">
        <button 
          onClick={() => changeMonth(-1)} 
          disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
          className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-slate-800 tabular-nums">
          {formattedMonth}
        </span>
        <button 
          onClick={() => changeMonth(1)} 
          disabled={availableMonths.indexOf(selectedMonth) <= 0}
          className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Spent ({formattedMonth})</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-800">{formatCurrency(totalSpent)}</h2>
              <div className="flex -space-x-2 mt-5">
                {users.map(user => (
                  <div key={user.id} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-white shadow-sm text-xs" style={{ backgroundColor: user.color }} title={user.name}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Individual Usage ({formattedMonth})</p>
              <div className="space-y-3 mt-1">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between">
                     <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: user.color }}></span>
                        {user.name}
                     </span>
                     <span className="font-semibold text-slate-800">{formatCurrency(memberSpending[user.id] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-slate-700 flex items-center gap-2">Outstanding Balances (All time)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-500">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ArrowDownRight size={18} className="text-indigo-600"/> Gets Back
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-6">Paid more than their fair share</p>
              </div>
              {onesOwed.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No one is owed money.</p>
              ) : (
                <div className="space-y-3">
                  {onesOwed.map(user => (
                     <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-xs shadow-sm" style={{ backgroundColor: user.color }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{user.name}</span>
                        </div>
                        <span className="font-bold text-indigo-600">{formatCurrency(balances[user.id])}</span>
                     </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-amber-500"/> Owes
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-6">Paid less than their fair share</p>
              </div>
              {onesOwing.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No one owes money.</p>
              ) : (
                <div className="space-y-3">
                  {onesOwing.map(user => (
                     <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-xs shadow-sm" style={{ backgroundColor: user.color }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{user.name}</span>
                        </div>
                        <span className="font-bold text-amber-500">{formatCurrency(Math.abs(balances[user.id]))}</span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="bg-indigo-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full -translate-y-1/2 translate-x-1/3 opacity-20 pointer-events-none" />
              <h3 className="text-sm font-semibold mb-4 text-white flex items-center justify-between">
                <span>Settlement Suggestions</span>
                <span className="text-xs font-normal text-indigo-300">Direct Repayments</span>
              </h3>
              <div className="space-y-4 relative z-10">
                {settlements.map((s, i) => {
                  const relevantExpenses = expenses.filter(e => {
                    if (e.isSettled) return false;
                    const involved = e.involvedUserIds || users.map(u => u.id);
                    const isFromInvolved = involved.includes(s.fromUser.id);
                    const isToInvolved = involved.includes(s.toUser.id);
                    
                    return (e.paidById === s.toUser.id && isFromInvolved) || 
                           (e.paidById === s.fromUser.id && isToInvolved);
                  });
                  const isExpanded = expandedSettlement === i;

                  return (
                    <div key={i} className="border-b border-indigo-805/30 last:border-0 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          onClick={() => setExpandedSettlement(isExpanded ? null : i)}
                          className="flex items-center gap-2 text-left hover:opacity-90 active:scale-[0.99] transition-all flex-1 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-[10px] shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: s.fromUser.color }}>
                            {s.fromUser.name.charAt(0).toUpperCase()}
                          </div>
                          <ArrowRight size={14} className="text-indigo-300 flex-shrink-0" />
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-[10px] shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: s.toUser.color }}>
                            {s.toUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-indigo-100 text-sm font-medium leading-tight">
                              <span className="font-bold text-white">{s.fromUser.name}</span> pays <span className="font-bold text-white">{s.toUser.name}</span>
                            </span>
                            <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1 mt-0.5">
                              {relevantExpenses.length > 0 ? (
                                <>View {relevantExpenses.length} related calculation{relevantExpenses.length > 1 ? 's' : ''}</>
                              ) : (
                                <>Indirect balancing suggestion</>
                              )}
                              <span className="inline-block transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                            </span>
                          </div>
                        </button>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div className="font-bold text-white text-base">
                            {formatCurrency(s.amount)}
                          </div>
                          {onAdd && (
                            <button 
                              onClick={() => handleSettleClick(s)}
                              className="px-3 py-1.5 bg-indigo-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              Settle Up
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section showing relevant records */}
                      {isExpanded && (
                        <div className="mt-3 bg-indigo-950/60 rounded-xl p-3 border border-indigo-800/40 text-xs text-indigo-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="font-bold text-indigo-300 border-b border-indigo-900/50 pb-1.5 mb-1.5 flex items-center justify-between">
                            <span>How the calculation works:</span>
                            <span className="text-[10px] bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-100">
                              Simplifying peer checks
                            </span>
                          </p>
                          {relevantExpenses.length === 0 ? (
                            <p className="text-[11px] text-indigo-300 italic leading-relaxed">
                              This suggestion optimizes multiple indirect debts. There are no direct unsettled expenses between {s.fromUser.name} and {s.toUser.name}, but this payment balances the group's net fair shares.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              {relevantExpenses.map((re, reIdx) => {
                                const involved = re.involvedUserIds || users.map(u => u.id);
                                const splitAmount = re.amount / involved.length;
                                const isCreditorExpense = re.paidById === s.toUser.id;
                                
                                return (
                                  <div key={reIdx} className="bg-indigo-900/20 p-2 rounded-lg border border-indigo-800/20 flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-white truncate">{re.description}</p>
                                      <p className="text-[10px] text-indigo-300 mt-0.5">
                                        Total: <span className="text-white font-semibold">{formatCurrency(re.amount)}</span> • Paid by <span className="text-white font-semibold">{users.find(u => u.id === re.paidById)?.name || 'Someone'}</span> split by {involved.length} group members
                                      </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {isCreditorExpense ? (
                                        <>
                                          <span className="text-rose-300 font-extrabold font-mono flex items-center gap-0.5 justify-end">
                                            +{formatCurrency(splitAmount)}
                                          </span>
                                          <p className="text-[9px] text-indigo-400 font-medium">Owed to {s.toUser.name}</p>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-emerald-400 font-extrabold font-mono flex items-center gap-0.5 justify-end">
                                            -{formatCurrency(splitAmount)}
                                          </span>
                                          <p className="text-[9px] text-emerald-400/80 font-medium">Reduces debt</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="text-[10px] text-indigo-400/90 pt-1 flex justify-between leading-tight">
                            <span>Net Balance: <b>{formatCurrency(Math.abs(balances[s.fromUser.id]))}</b> total debt</span>
                            <span>Direct suggestions prioritized</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {settlements.length === 0 && expenses.some(e => !e.isSettled) === false && (
            <div className="bg-emerald-50 text-emerald-600 p-8 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center font-medium shadow-sm gap-3 text-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
              <div>
                ✨ You're all settled up!
                <p className="text-sm text-emerald-600/80 font-normal mt-1">No outstanding balances across any months.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeSettle && onAdd && (
          <SettleUpModal
            users={users}
            defaultFromUser={activeSettle.fromUser}
            defaultToUser={activeSettle.toUser}
            suggestedAmount={activeSettle.amount}
            onClose={() => setActiveSettle(null)}
            onAdd={onAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
