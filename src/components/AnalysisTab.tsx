import React, { useMemo, useState } from 'react';
import { Expense, User, Category } from '../types';
import { formatCurrency, parseLocalDate } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Calendar, Pizza, Tag, DollarSign, PieChart, BarChart3, ArrowUpRight, 
  Compass, Percent, Flame, ShoppingBag 
} from 'lucide-react';
import { IconMap } from './ExpensesList';

interface AnalysisTabProps {
  expenses: Expense[];
  users: User[];
  categories: Category[];
}

export default function AnalysisTab({ expenses, users, categories }: { expenses: Expense[], users: User[], categories: Category[] }) {
  const [timeView, setTimeView] = useState<'month' | 'all-time'>('month');
  
  // Extract available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(e => {
      if (e.date) {
        months.add(e.date.substring(0, 7)); // 'YYYY-MM'
      }
    });
    const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
    if (sorted.length === 0) sorted.push(new Date().toISOString().substring(0, 7));
    return sorted;
  }, [expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || new Date().toISOString().substring(0, 7));

  // Exclude repayments from pure category spending analysis so they don't skew stats
  const spendingExpenses = useMemo(() => {
    return expenses.filter(e => e.categoryId !== 'repayment' && !e.isRepayment);
  }, [expenses]);

  // Total spending over time by month
  const monthlyTrendsData = useMemo(() => {
    const trendMap: Record<string, number> = {};
    
    // Fill all available months (sorted chronologically)
    const chronoMonths = [...availableMonths].reverse();
    chronoMonths.forEach(m => trendMap[m] = 0);

    spendingExpenses.forEach(e => {
      const m = e.date.substring(0, 7);
      if (trendMap[m] !== undefined) {
        trendMap[m] += e.amount;
      } else {
        trendMap[m] = e.amount;
      }
    });

    return Object.keys(trendMap).map(key => {
      let displayName = key;
      try {
        displayName = format(parseLocalDate(`${key}-01`), 'MMM yy');
      } catch {}
      return {
        monthKey: key,
        display: displayName,
        amount: parseFloat(trendMap[key].toFixed(2))
      };
    });
  }, [spendingExpenses, availableMonths]);

  // Filter list of expenses base on selected range
  const filteredSpending = useMemo(() => {
    if (timeView === 'month') {
      return spendingExpenses.filter(e => e.date.startsWith(selectedMonth));
    }
    return spendingExpenses;
  }, [spendingExpenses, timeView, selectedMonth]);

  // Total filtered spend
  const totalSpend = useMemo(() => {
    return filteredSpending.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredSpending]);

  // Category breakdown for filtered list
  const categoryBreakdown = useMemo(() => {
    const breakdown = categories.map(cat => {
      const amt = filteredSpending
        .filter(e => e.categoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        id: cat.id,
        name: cat.name,
        amount: amt,
        color: cat.color,
        icon: cat.icon,
        percentage: totalSpend > 0 ? (amt / totalSpend) * 100 : 0
      };
    });
    
    return breakdown
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredSpending, categories, totalSpend]);

  // Top Spender in filtered range
  const spenderBreakdown = useMemo(() => {
    const usage: Record<string, number> = {};
    users.forEach(u => usage[u.id] = 0);
    
    filteredSpending.forEach(e => {
      if (usage[e.paidById] !== undefined) {
        usage[e.paidById] += e.amount;
      }
    });

    return Object.keys(usage).map(id => {
      const usr = users.find(u => u.id === id);
      return {
        name: usr?.name || 'Unknown',
        color: usr?.color || '#cbd5e1',
        amount: usage[id],
        percentage: totalSpend > 0 ? (usage[id] / totalSpend) * 100 : 0
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredSpending, users, totalSpend]);

  const maxCategory = useMemo(() => {
    if (categoryBreakdown.length === 0) return null;
    return categoryBreakdown[0];
  }, [categoryBreakdown]);

  const averageMonthlySpend = useMemo(() => {
    if (monthlyTrendsData.length === 0) return 0;
    const total = monthlyTrendsData.reduce((acc, curr) => acc + curr.amount, 0);
    return total / monthlyTrendsData.length;
  }, [monthlyTrendsData]);

  const maxSpender = useMemo(() => {
    if (spenderBreakdown.length === 0 || spenderBreakdown[0].amount === 0) return null;
    return spenderBreakdown[0];
  }, [spenderBreakdown]);

  const formattedMonth = useMemo(() => {
    try {
      return format(parseLocalDate(`${selectedMonth}-01`), 'MMMM yyyy');
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={24} />
            Spending Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">Advanced visual insights into your group's collective expenditure</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setTimeView('month')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                timeView === 'month'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setTimeView('all-time')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                timeView === 'all-time'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Time
            </button>
          </div>

          {timeView === 'month' && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {availableMonths.map(m => {
                let label = m;
                try {
                  label = format(parseLocalDate(`${m}-01`), 'MMMM yyyy');
                } catch {}
                return (
                  <option key={m} value={m}>{label}</option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend Stat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <DollarSign size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Spent</span>
            <span className="text-xl font-extrabold text-slate-800">{formatCurrency(totalSpend)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {timeView === 'month' ? `During ${formattedMonth}` : 'Cumulative total'}
            </span>
          </div>
        </div>

        {/* Highest Category Stat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Flame size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Top Category</span>
            <span className="text-base font-extrabold text-slate-800 truncate block">
              {maxCategory ? maxCategory.name : 'None'}
            </span>
            <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
              {maxCategory ? `${formatCurrency(maxCategory.amount)} (${maxCategory.percentage.toFixed(0)}%)` : 'No purchase records'}
            </span>
          </div>
        </div>

        {/* Average Monthly Spend Stat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Average Mo. Spend</span>
            <span className="text-xl font-extrabold text-slate-800">{formatCurrency(averageMonthlySpend)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Across checkout months</span>
          </div>
        </div>

        {/* Highest Spender Stat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ShoppingBag size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Top Spender</span>
            <span className="text-base font-extrabold text-slate-800 truncate block">
              {maxSpender ? maxSpender.name : 'None'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {maxSpender ? `Loaded ${formatCurrency(maxSpender.amount)}` : 'No purchases'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Graph & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Long term trend */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <BarChart3 size={16} className="text-indigo-600" />
              Monthly Purchase Trajectory
            </h3>
            <p className="text-[11px] text-slate-400 mb-6">Historical aggregation of active group bills</p>
          </div>
          
          <div className="h-64 sm:h-72 w-full">
            {monthlyTrendsData.length <= 1 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 p-8">
                <Calendar size={32} className="stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Limited billing history available</p>
                <p className="text-[10px] text-slate-400 mt-1">Trajectory graphs will plot automatically as you add ledger items across separate months.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="display" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px rgab(0,0,0,0.05)' }} 
                    formatter={(val) => [`$${parseFloat(val as string).toFixed(2)}`, 'Spend']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <PieChart size={16} className="text-indigo-600" />
              Category Breakdown
            </h3>
            <p className="text-[11px] text-slate-400 mb-6">
              {timeView === 'month' ? `Percentage for ${formattedMonth}` : 'Percentage overall list'}
            </p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            {categoryBreakdown.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                <PieChart size={32} className="stroke-1 text-slate-300 mb-1" />
                <p className="text-xs font-semibold">No category metrics</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="amount"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(val) => [`$${parseFloat(val as string).toFixed(2)}`, 'Item Count']}
                    />
                  </RePieChart>
                </ResponsiveContainer>

                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share Total</span>
                  <span className="text-lg font-extrabold text-slate-800 leading-none mt-0.5">{formatCurrency(totalSpend)}</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Mini category list */}
          <div className="space-y-2 mt-4 max-h-[140px] overflow-y-auto pr-1">
            {categoryBreakdown.slice(0, 4).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                  <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                </div>
                <div className="font-bold text-slate-800">
                  {entry.percentage.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Structured Category Table list + Spender split insight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Specific Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Category Specific Spending</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Custom visual loading bars per domain</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4 max-h-[300px] overflow-y-auto divide-y divide-slate-50">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No purchase records registered for current filter.</p>
            ) : (
              categoryBreakdown.map((item, index) => {
                const Icon = item.icon && IconMap[item.icon] ? IconMap[item.icon] : Tag;
                return (
                  <div key={item.id} className={`pt-3 first:pt-0 flex flex-col gap-1.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: item.color }}>
                          <Icon size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                        <span className="text-[10px] text-slate-400 font-semibold ml-2">({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ backgroundColor: item.color, width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Spender split insight */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Purchasing Outlays</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Who initially handles the checkouts</p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              {spenderBreakdown.filter(s => s.amount > 0).length} Spenders
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4 max-h-[300px] overflow-y-auto divide-y divide-slate-50">
            {spenderBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No billing outlays registered.</p>
            ) : (
              spenderBreakdown.map((spender, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs border border-white shadow-sm" style={{ backgroundColor: spender.color }}>
                        {spender.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{spender.name}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800">{formatCurrency(spender.amount)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold ml-2">({spender.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  
                  {/* Spender load visual bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ backgroundColor: spender.color, width: `${spender.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
