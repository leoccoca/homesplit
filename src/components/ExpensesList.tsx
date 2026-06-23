import React, { useState } from 'react';
import { Expense, User, Category } from '../types';
import { formatCurrency, parseLocalDate } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Receipt, Trash2, Home, ShoppingCart, Zap, Utensils, Sofa, Tag, Check, CheckCircle2, Pencil, Archive, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import AddExpenseModal from './AddExpenseModal';

export const IconMap: Record<string, React.ElementType> = {
  Home, ShoppingCart, Zap, Utensils, Sofa, Tag
};

export default function ExpensesList({ expenses, users, categories, onAdd, onDelete, onToggleSettled, onUpdate }: { expenses: Expense[], users: User[], categories: Category[], onAdd: (e: Expense) => void, onDelete: (id: string) => void, onToggleSettled: (id: string) => void, onUpdate: (e: Expense) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'archive'>('active');
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
      try {
        const dateObj = parseLocalDate(expense.date);
        const groupKey = format(dateObj, 'yyyy-MM');
        const groupName = format(dateObj, 'MMMM yyyy');
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        groups[groupKey].total += expense.amount;
      } catch (err) {
        const groupKey = 'unknown';
        const groupName = 'Unsorted / Active';
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        groups[groupKey].total += expense.amount;
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
      try {
        const dateObj = parseLocalDate(expense.date);
        const groupKey = format(dateObj, 'yyyy-MM');
        const groupName = format(dateObj, 'MMMM yyyy');
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        groups[groupKey].total += expense.amount;
      } catch (err) {
        const groupKey = 'unknown';
        const groupName = 'Unsorted / Past';
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupName, expenses: [], total: 0 };
        }
        groups[groupKey].expenses.push(expense);
        groups[groupKey].total += expense.amount;
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Expenses Log</h2>
          <p className="text-xs text-slate-400 mt-1">Manage, filter, and archive your shared ledger</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden sm:flex px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm items-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Sub tabs: Active vs Settled Archive */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 max-w-md w-full border border-slate-200/50">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'active'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt size={14} className="stroke-[2.5]" />
          <span>Active Accounts</span>
          {activeExpenses.length > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
              activeSubTab === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeExpenses.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('archive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'archive'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive size={14} className="stroke-[2.5]" />
          <span>Settled Archive</span>
          {archivedExpenses.length > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
              activeSubTab === 'archive' ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-200 text-slate-600'
            }`}>
              {archivedExpenses.length}
            </span>
          )}
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Receipt size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">No expenses yet</h3>
          <p className="text-slate-500 max-w-sm mb-6">Add your first shared expense to start tracking room balances automatically.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 font-medium hover:underline flex items-center gap-1"
          >
            Add an expense <ArrowRight size={16} />
          </button>
        </div>
      ) : activeSubTab === 'active' ? (
        activeExpenses.length === 0 ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
            <div className="bg-emerald-100/80 p-3.5 rounded-full mb-3 text-emerald-600">
              <CheckCircle2 size={24} className="stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">All Clear! No Active Dues</h3>
            <p className="text-xs text-slate-500 max-w-md">Everyone is fully settled up. Any new items you add will appear here, and you can view past monthly payouts in the <strong>Settled Archive</strong>.</p>
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
                    className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/60 transition-colors text-left"
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
        )
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
                    className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/60 transition-colors text-left"
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
        className="sm:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-[0_8px_16px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-90 transition-all flex items-center justify-center transform hover:-translate-y-1"
        aria-label="Add Expense"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

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
