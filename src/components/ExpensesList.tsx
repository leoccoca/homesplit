import React, { useState } from 'react';
import { Expense, User, Category, RecurringExpense } from '../types';
import { formatCurrency, parseLocalDate } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Receipt, Trash2, Home, ShoppingCart, Zap, Utensils, Sofa, Tag, Check, CheckCircle2, Pencil, Archive, Calendar, ChevronDown, ChevronUp, Repeat, Clock, AlertCircle, Sparkles, Power, ArrowRight as ArrowRightIcon } from 'lucide-react';
import AddExpenseModal from './AddExpenseModal';
import AddRecurringModal from './AddRecurringModal';

export const IconMap: Record<string, React.ElementType> = {
  Home, ShoppingCart, Zap, Utensils, Sofa, Tag
};

export default function ExpensesList({ 
  expenses, 
  users, 
  categories, 
  recurringExpenses = [],
  onAdd, 
  onDelete, 
  onToggleSettled, 
  onUpdate,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onToggleRecurringActive,
  onPostRecurringExpense,
}: { 
  expenses: Expense[];
  users: User[];
  categories: Category[];
  recurringExpenses?: RecurringExpense[];
  onAdd: (e: Expense) => void;
  onDelete: (id: string) => void;
  onToggleSettled: (id: string) => void;
  onUpdate: (e: Expense) => void;
  onAddRecurring?: (r: RecurringExpense, postNow?: boolean) => void;
  onUpdateRecurring?: (r: RecurringExpense) => void;
  onDeleteRecurring?: (id: string) => void;
  onToggleRecurringActive?: (id: string) => void;
  onPostRecurringExpense?: (r: RecurringExpense) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<RecurringExpense | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'regular' | 'archive'>('active');
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const handleEditClick = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsModalOpen(true);
  };

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter lists
  const activeExpenses = expenses.filter(e => !e.isSettled);
  const archivedExpenses = expenses.filter(e => e.isSettled);

  // Group active expenses by month
  const groupedActive = React.useMemo(() => {
    const groups: Record<string, { name: string; expenses: Expense[]; total: number }> = {};
    activeExpenses.forEach(expense => {
      const isRepay = expense.categoryId === 'repayment' || expense.isRepayment;
      try {
        const dateObj = parseLocalDate(expense.date);
        const groupKey = format(dateObj, 'yyyy-MM');
        const groupName = format(dateObj, 'MMMM yyyy');
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        if (!isRepay) {
          groups[groupKey].total += expense.amount;
        }
      } catch (err) {
        const groupKey = 'unknown';
        const groupName = 'Unsorted / Active';
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        if (!isRepay) {
          groups[groupKey].total += expense.amount;
        }
      }
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        key,
        name: groups[key].name,
        expenses: groups[key].expenses.sort((a, b) => b.date.localeCompare(a.date)),
        total: groups[key].total
      }));
  }, [activeExpenses]);

  // Group archived expenses by month
  const groupedArchived = React.useMemo(() => {
    const groups: Record<string, { name: string; expenses: Expense[]; total: number }> = {};
    archivedExpenses.forEach(expense => {
      const isRepay = expense.categoryId === 'repayment' || expense.isRepayment;
      try {
        const dateObj = parseLocalDate(expense.date);
        const groupKey = format(dateObj, 'yyyy-MM');
        const groupName = format(dateObj, 'MMMM yyyy');
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        if (!isRepay) {
          groups[groupKey].total += expense.amount;
        }
      } catch (err) {
        const groupKey = 'unknown';
        const groupName = 'Unsorted / Past';
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        if (!isRepay) {
          groups[groupKey].total += expense.amount;
        }
      }
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        key,
        name: groups[key].name,
        expenses: groups[key].expenses.sort((a, b) => b.date.localeCompare(a.date)),
        total: groups[key].total
      }));
  }, [archivedExpenses]);

  const renderExpenseRow = (expense: Expense) => {
    const isRepay = expense.categoryId === 'repayment' || expense.isRepayment;
    const category = isRepay 
      ? { name: 'Settle Up', color: '#10b981', icon: 'CheckCircle2' } 
      : categories.find(c => c.id === expense.categoryId);
    
    const paidBy = users.find(u => u.id === expense.paidById);
    const Icon = isRepay 
      ? CheckCircle2 
      : (category?.icon && IconMap[category.icon] ? IconMap[category.icon] : Tag);
    
    const involvedIds = expense.involvedUserIds || users.map(u => u.id);
    const splitAmount = expense.amount / involvedIds.length;
    const others = users.filter(u => u.id !== expense.paidById && involvedIds.includes(u.id));
    const recipient = isRepay && involvedIds.length > 0 ? users.find(u => u.id === involvedIds[0]) : null;

    return (
      <div key={expense.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors group ${expense.isSettled ? 'bg-slate-50/40' : 'hover:bg-slate-50'}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white ${expense.isSettled ? 'grayscale opacity-75' : ''}`}
            style={{ backgroundColor: category?.color || '#94a3b8' }}
          >
            <Icon size={24} strokeWidth={2} />
          </div>
          
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate mb-1 ${expense.isSettled ? 'text-slate-500 line-through font-normal' : 'text-slate-800'}`}>{expense.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] uppercase text-slate-600">{category?.name}</span>
                {(expense.isRecurring || expense.recurringExpenseId) && (
                  <span className="inline-flex items-center gap-1 font-bold bg-indigo-50 border border-indigo-200/60 text-indigo-700 px-2 py-0.5 rounded text-[10px]">
                    <Repeat size={10} className="stroke-[2.5]" /> Regular Bill
                  </span>
                )}
                <span>•</span>
                <span>{format(parseLocalDate(expense.date), 'MMM d, yyyy')}</span>
              </div>
            </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-3 sm:pt-0 border-t border-slate-100 sm:border-0 mt-3 sm:mt-0">
          {/* Settlement Info (Who owes who) */}
          <div className="flex flex-col text-xs text-slate-500">
            {expense.isSettled ? (
              <div className="flex items-center gap-1 text-emerald-600 font-medium">
                 <CheckCircle2 size={14} />
                 Settled
              </div>
            ) : isRepay ? (
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Recipient</span>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: recipient?.color }}></span>
                  <span className="font-semibold text-slate-600 text-xs">{recipient?.name || 'Group'}</span>
                </div>
              </div>
            ) : others.length === 0 ? (
              <div className="flex items-center gap-1 text-slate-400 italic">
                 Personal Expense
              </div>
            ) : (
              others.map(other => (
                <div key={other.id} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: other.color }}></span>
                  <span>{other.name} owes {formatCurrency(splitAmount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="text-right flex items-center justify-between sm:justify-end gap-4 min-w-[150px] w-full sm:w-auto">
            <div className="text-left sm:text-right">
              <p className={`font-bold text-base ${expense.isSettled ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>{formatCurrency(expense.amount)}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1">
                Paid by
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: paidBy?.color }}></span>
                <span className="font-medium text-slate-700">{paidBy?.name}</span>
              </p>
            </div>

            <div className="flex gap-1">
              <button 
                onClick={() => onToggleSettled(expense.id)}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${expense.isSettled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                title={expense.isSettled ? "Mark as unsettled" : "Mark as settled"}
              >
                <Check size={18} />
              </button>
              <button 
                onClick={() => handleEditClick(expense)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center"
                title="Edit expense"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => onDelete(expense.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center"
                title="Delete expense"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentMonthKey = React.useMemo(() => new Date().toISOString().substring(0, 7), []);
  const currentMonthName = React.useMemo(() => {
    try {
      return format(new Date(), 'MMMM yyyy');
    } catch {
      return 'this month';
    }
  }, []);

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const isBillPostedForMonth = (rec: RecurringExpense, monthKey: string) => {
    return expenses.some(e => 
      (e.recurringExpenseId === rec.id || e.description.toLowerCase().trim() === rec.description.toLowerCase().trim()) && 
      e.date.startsWith(monthKey)
    );
  };

  const unpostedDueBills = React.useMemo(() => {
    return recurringExpenses.filter(r => r.isActive && !isBillPostedForMonth(r, currentMonthKey));
  }, [recurringExpenses, expenses, currentMonthKey]);

  const totalMonthlyCommitment = React.useMemo(() => {
    return recurringExpenses.filter(r => r.isActive).reduce((sum, r) => sum + r.amount, 0);
  }, [recurringExpenses]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Expenses Log</h2>
          <p className="text-xs text-slate-400 mt-1">Manage active items, regular fixed monthly bills, and archive</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setRecurringToEdit(null);
              setIsRecurringModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Repeat size={15} className="stroke-[2.5]" />
            <span>+ Regular Bill</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Sub tabs: Active vs Regular Bills vs Settled Archive */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 max-w-xl w-full border border-slate-200/50">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'active'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt size={14} className="stroke-[2.5]" />
          <span>Active</span>
          {activeExpenses.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
              activeSubTab === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeExpenses.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('regular')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'regular'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Repeat size={14} className="stroke-[2.5]" />
          <span>Regular / Monthly</span>
          {recurringExpenses.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
              unpostedDueBills.length > 0
                ? 'bg-amber-100 text-amber-800'
                : activeSubTab === 'regular' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {recurringExpenses.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('archive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'archive'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive size={14} className="stroke-[2.5]" />
          <span>Archive</span>
          {archivedExpenses.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
              activeSubTab === 'archive' ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-200 text-slate-600'
            }`}>
              {archivedExpenses.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'regular' ? (
        <div className="space-y-6">
          {/* Monthly Commitment Summary Header */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full -translate-y-1/2 translate-x-1/3 opacity-20 pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-200 block mb-1">
                  Fixed Household Commitments
                </span>
                <h3 className="text-3xl font-extrabold tracking-tight">
                  {formatCurrency(totalMonthlyCommitment)} <span className="text-base font-medium text-indigo-200">/ month</span>
                </h3>
                <p className="text-xs text-indigo-200 mt-1.5">
                  {recurringExpenses.filter(r => r.isActive).length} active recurring bill{recurringExpenses.filter(r => r.isActive).length !== 1 ? 's' : ''} • {recurringExpenses.length - unpostedDueBills.length} recorded for {currentMonthName}
                </p>
              </div>
              <button
                onClick={() => {
                  setRecurringToEdit(null);
                  setIsRecurringModalOpen(true);
                }}
                className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Add Regular Bill</span>
              </button>
            </div>
          </div>

          {recurringExpenses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm max-w-xl mx-auto">
              <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 mb-3">
                <Repeat size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">No Regular Expenses Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                Add expenses that repeat every month with a fixed time and cost, like Apartment Rent, Wi-Fi, Netflix, or Utilities. SplitMate will track schedules and make posting them seamless!
              </p>
              <button
                onClick={() => {
                  setRecurringToEdit(null);
                  setIsRecurringModalOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Set Up First Regular Bill</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringExpenses.map(rec => {
                const category = categories.find(c => c.id === rec.categoryId);
                const payer = users.find(u => u.id === rec.paidById);
                const involvedIds = rec.involvedUserIds || users.map(u => u.id);
                const splitShare = involvedIds.length > 0 ? rec.amount / involvedIds.length : 0;
                const isPostedThisMonth = isBillPostedForMonth(rec, currentMonthKey);
                const Icon = category?.icon && IconMap[category.icon] ? IconMap[category.icon] : Tag;

                return (
                  <div
                    key={rec.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                      rec.isActive ? 'border-slate-200 hover:border-indigo-200' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Icon & Details */}
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                          style={{ backgroundColor: category?.color || '#6366f1' }}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-bold text-slate-800 text-base truncate">{rec.description}</h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {category?.name || 'General'}
                            </span>
                            {!rec.isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                Paused
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <Calendar size={13} className="text-indigo-600" />
                              Every month on the {getOrdinal(rec.dayOfMonth)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Paid by <span className="font-semibold text-slate-700">{payer?.name || 'Someone'}</span>
                            </span>
                            <span>•</span>
                            <span>
                              Split {involvedIds.length} ways ({formatCurrency(splitShare)} each)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Cost, Current Month Status, Controls */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-slate-100 sm:border-0">
                        <div className="text-left sm:text-right">
                          <div className="font-extrabold text-lg text-slate-900">
                            {formatCurrency(rec.amount)}
                            <span className="text-xs font-normal text-slate-400"> / mo</span>
                          </div>
                          
                          <div className="mt-1">
                            {isPostedThisMonth ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 size={12} />
                                Recorded for {currentMonthName}
                              </span>
                            ) : rec.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock size={12} />
                                Pending for {currentMonthName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Schedule paused</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {!isPostedThisMonth && rec.isActive && onPostRecurringExpense && (
                            <button
                              onClick={() => onPostRecurringExpense(rec)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              title={`Log this expense for ${currentMonthName}`}
                            >
                              <Plus size={14} />
                              <span>Post for {currentMonthName.split(' ')[0]}</span>
                            </button>
                          )}

                          {onToggleRecurringActive && (
                            <button
                              onClick={() => onToggleRecurringActive(rec.id)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                rec.isActive
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50 bg-slate-100'
                              }`}
                              title={rec.isActive ? "Pause regular bill schedule" : "Activate bill schedule"}
                            >
                              <Power size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setRecurringToEdit(rec);
                              setIsRecurringModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit regular bill rule"
                          >
                            <Pencil size={16} />
                          </button>

                          {onDeleteRecurring && (
                            <button
                              onClick={() => onDeleteRecurring(rec.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete regular bill schedule"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeSubTab === 'active' ? (
        <div>
          {/* Due Bill Alert Banner */}
          {unpostedDueBills.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{unpostedDueBills.length} Regular bill{unpostedDueBills.length > 1 ? 's' : ''} due for {currentMonthName}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Action Needed</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {unpostedDueBills.map(b => `${b.description} (${formatCurrency(b.amount)})`).join(' • ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setActiveSubTab('regular')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  View Bills
                </button>
                {onPostRecurringExpense && (
                  <button
                    onClick={() => {
                      unpostedDueBills.forEach(b => onPostRecurringExpense(b));
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    Post All Due ({formatCurrency(unpostedDueBills.reduce((s, b) => s + b.amount, 0))})
                  </button>
                )}
              </div>
            </div>
          )}

          {activeExpenses.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
              <div className="bg-emerald-100/80 p-3.5 rounded-full mb-3 text-emerald-600">
                <CheckCircle2 size={24} className="stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">All Clear! No Active Dues</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Everyone is fully settled up. Any new items you add will appear here, and you can view past monthly payouts in the <strong>Archive</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedActive.map(group => {
                const isOpen = collapsedMonths['active-' + group.key] !== true; // Open by default
                return (
                  <div key={group.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                    {/* Monthly Section Header */}
                    <button
                      onClick={() => toggleMonth('active-' + group.key)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{group.name}</h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{group.expenses.length} active item{group.expenses.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Active</span>
                          <span className="text-sm font-extrabold text-indigo-600">{formatCurrency(group.total)}</span>
                        </div>
                        <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </button>

                    {/* List of active expenses for this month */}
                    {isOpen && (
                      <div className="divide-y divide-slate-100 bg-white">
                        {group.expenses.map(renderExpenseRow)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        archivedExpenses.length === 0 ? (
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
            <div className="bg-slate-100 p-3.5 rounded-full mb-3 text-slate-400">
              <Archive size={24} />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Monthly Archive is Empty</h3>
            <p className="text-xs text-slate-500 max-w-md">Once expenses or repayments are completed and marked as settled (using the green checkmark button), they are instantly archived here and kept tidy by calendar month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedArchived.map(group => {
              const isOpen = collapsedMonths['archive-' + group.key] === true; // Default closed in Archive
              return (
                <div key={group.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                  {/* Monthly Section Header */}
                  <button
                    onClick={() => toggleMonth('archive-' + group.key)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{group.name}</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{group.expenses.length} settled item{group.expenses.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Settled</span>
                        <span className="text-sm font-extrabold text-emerald-600">{formatCurrency(group.total)}</span>
                      </div>
                      <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </button>

                  {/* List of settled expenses for this month */}
                  {isOpen && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {group.expenses.map(renderExpenseRow)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-[0_8px_16px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-90 transition-all flex items-center justify-center transform hover:-translate-y-1 cursor-pointer"
        aria-label="Add Expense"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <AddExpenseModal 
          users={users} 
          categories={categories} 
          onClose={() => {
            setIsModalOpen(false);
            setExpenseToEdit(null);
          }} 
          onAdd={(e) => { onAdd(e); setIsModalOpen(false); }} 
          onUpdate={(e) => { onUpdate(e); setIsModalOpen(false); setExpenseToEdit(null); }}
          expenseToEdit={expenseToEdit || undefined}
          onAddRecurring={onAddRecurring}
        />
      )}

      {/* Add / Edit Recurring Regular Expense Modal */}
      {isRecurringModalOpen && (
        <AddRecurringModal
          users={users}
          categories={categories}
          onClose={() => {
            setIsRecurringModalOpen(false);
            setRecurringToEdit(null);
          }}
          onSave={(rec, postNow) => {
            if (recurringToEdit && onUpdateRecurring) {
              onUpdateRecurring(rec);
            } else if (onAddRecurring) {
              onAddRecurring(rec, postNow);
            }
            setIsRecurringModalOpen(false);
            setRecurringToEdit(null);
          }}
          recurringToEdit={recurringToEdit}
        />
      )}
    </div>
  );
}

// Arrow right icon inline for empty state link
function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  )
}
