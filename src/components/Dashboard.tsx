import React, { useMemo, useState } from 'react';
import { Expense, User, Category } from '../types';
import { calculateBalances, calculateSettlements } from '../lib/splitLogic';
import { formatCurrency } from '../lib/utils';
import { ArrowRight, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function Dashboard({ expenses, users, categories }: { expenses: Expense[], users: User[], categories: Category[] }) {
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

  // Category breakdown in this month
  const categoryData = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      value: currentMonthExpenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0),
      color: cat.color
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, categories]);

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
      return format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy');
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
          {/* Category Breakdown */}
          {currentMonthExpenses.length > 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold mb-6 flex items-center gap-2 text-slate-700">
                <TrendingUp size={16} className="text-slate-400" />
                Spending by Category
              </h2>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                {categoryData.map(cat => (
                  <div key={cat.name} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span className="font-semibold text-slate-800">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.value / totalSpent) * 100}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 border-dashed text-center text-slate-500 py-12 flex flex-col items-center justify-center gap-3">
               <TrendingUp size={32} className="text-slate-300" />
               <p className="font-medium">No expenses in this month</p>
            </div>
          )}

          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="bg-indigo-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full -translate-y-1/2 translate-x-1/3 opacity-20 pointer-events-none" />
              <h3 className="text-sm font-semibold mb-4 text-white">Settlement Suggestion (All time)</h3>
              <div className="space-y-3 relative z-10">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-indigo-800/50 last:border-0 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-200 text-sm">
                        <span className="font-bold text-white">{s.fromUser.name}</span> pays <span className="font-bold text-white">{s.toUser.name}</span>
                      </span>
                    </div>
                    <div className="font-bold text-white shrink-0">
                      {formatCurrency(s.amount)}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
