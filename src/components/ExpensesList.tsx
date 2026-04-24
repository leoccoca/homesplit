import React, { useState } from 'react';
import { Expense, User, Category } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Receipt, Trash2, Home, ShoppingCart, Zap, Utensils, Sofa, Tag, Check, CheckCircle2 } from 'lucide-react';
import AddExpenseModal from './AddExpenseModal';

export const IconMap: Record<string, React.ElementType> = {
  Home, ShoppingCart, Zap, Utensils, Sofa, Tag
};

export default function ExpensesList({ expenses, users, categories, onAdd, onDelete, onToggleSettled }: { expenses: Expense[], users: User[], categories: Category[], onAdd: (e: Expense) => void, onDelete: (id: string) => void, onToggleSettled: (id: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">Recent Expenses</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden sm:flex px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 items-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const category = categories.find(c => c.id === expense.categoryId);
              const paidBy = users.find(u => u.id === expense.paidById);
              const Icon = category?.icon && IconMap[category.icon] ? IconMap[category.icon] : Tag;
              const involvedIds = expense.involvedUserIds || users.map(u => u.id);
              const splitAmount = expense.amount / involvedIds.length;
              const others = users.filter(u => u.id !== expense.paidById && involvedIds.includes(u.id));

              return (
                <div key={expense.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors group ${expense.isSettled ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white ${expense.isSettled ? 'grayscale opacity-75' : ''}`}
                      style={{ backgroundColor: category?.color || '#94a3b8' }}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate mb-1 ${expense.isSettled ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{expense.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] uppercase text-slate-600">{category?.name}</span>
                        <span>•</span>
                        <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
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

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`font-bold text-base sm:text-lg ${expense.isSettled ? 'text-slate-400' : 'text-slate-800'}`}>{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1">
                          Paid by
                          <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: paidBy?.color }}></span>
                          <span className="font-medium text-slate-700">{paidBy?.name}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => onToggleSettled(expense.id)}
                          className={`p-2 rounded-lg transition-colors md:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center ${expense.isSettled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          title={expense.isSettled ? "Mark as unsettled" : "Mark as settled"}
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => onDelete(expense.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors md:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center"
                          title="Delete expense"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          onClose={() => setIsModalOpen(false)} 
          onAdd={(e) => { onAdd(e); setIsModalOpen(false); }} 
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
