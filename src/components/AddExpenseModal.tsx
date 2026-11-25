import React, { useState } from 'react';
import { Expense, User, Category, RecurringExpense } from '../types';
import { X, Repeat } from 'lucide-react';
import { IconMap } from './ExpensesList';
import { useAuth } from '../contexts/AuthContext';

export default function AddExpenseModal({ 
  users, 
  categories, 
  onClose, 
  onAdd, 
  onUpdate, 
  expenseToEdit,
  onAddRecurring,
}: { 
  users: User[], 
  categories: Category[], 
  onClose: () => void, 
  onAdd?: (e: Expense) => void, 
  onUpdate?: (e: Expense) => void, 
  expenseToEdit?: Expense,
  onAddRecurring?: (rec: RecurringExpense) => void,
}) {
  const { user } = useAuth();

  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [amount, setAmount] = useState(expenseToEdit?.amount ? expenseToEdit.amount.toString() : '');
  const [date, setDate] = useState(expenseToEdit?.date ? expenseToEdit.date.substring(0, 10) : new Date().toISOString().substring(0, 10)); // Default to today's date YYYY-MM-DD
  
  const [paidById, setPaidById] = useState(() => {
    if (expenseToEdit?.paidById) return expenseToEdit.paidById;
    if (user && users.some(u => u.id === user.uid)) return user.uid;
    return users[0]?.id || '';
  });
  
  const [categoryId, setCategoryId] = useState(expenseToEdit?.categoryId || categories[0]?.id || '');
  const [involvedUserIds, setInvolvedUserIds] = useState<string[]>(
    expenseToEdit?.involvedUserIds || users.map(u => u.id)
  );
  const [isRecurring, setIsRecurring] = useState(expenseToEdit?.isRecurring || false);
  const [recurringDay, setRecurringDay] = useState<number>(() => {
    try {
      const d = parseInt(date.substring(8, 10));
      return isNaN(d) ? 1 : d;
    } catch {
      return 1;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const toggleInvolvedUser = (id: string) => {
    setError(null);
    setInvolvedUserIds(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please check description and specify a valid amount.");
      return;
    }
    if (involvedUserIds.length === 0) {
      setError("At least one person must be involved in the expense.");
      return;
    }

    const recId = expenseToEdit?.recurringExpenseId || (isRecurring ? Math.random().toString(36).substring(2, 11) : undefined);

    const targetExpense: Expense = {
      id: expenseToEdit?.id || Math.random().toString(36).substr(2, 9),
      description: description.trim(),
      amount: parseFloat(amount),
      paidById,
      categoryId,
      date: new Date(date).toISOString(), // Generate full ISO string based on selected date
      splitMode: expenseToEdit?.splitMode || 'equal',
      involvedUserIds,
      isSettled: expenseToEdit?.isSettled || false,
      createdAt: expenseToEdit?.createdAt || undefined,
      isRecurring: isRecurring || !!expenseToEdit?.isRecurring,
      recurringExpenseId: recId,
      recurringFrequency: isRecurring ? 'monthly' : undefined,
    };

    if (isRecurring && onAddRecurring && (!expenseToEdit || !expenseToEdit.recurringExpenseId)) {
      onAddRecurring({
        id: recId!,
        description: description.trim(),
        amount: parseFloat(amount),
        paidById,
        categoryId,
        frequency: 'monthly',
        dayOfMonth: Math.min(31, Math.max(1, recurringDay)),
        involvedUserIds,
        splitMode: 'equal',
        startDate: date,
        isActive: true,
        autoPost: true,
        lastGeneratedPeriod: date.substring(0, 7),
      });
    }

    if (expenseToEdit && onUpdate) {
      onUpdate(targetExpense);
    } else if (onAdd) {
      onAdd(targetExpense);
    }
  };

  const isEditMode = !!expenseToEdit;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white rounded-2xl w-[95%] max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 h-[80dvh] sm:h-auto sm:max-h-[90vh] flex flex-col sm:translate-y-0 -translate-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Trader Joe's Groceries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
               <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-medium text-slate-700"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paid By</label>
                <select 
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors appearance-none font-medium text-slate-700"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                <select 
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors appearance-none font-medium text-slate-700"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Split Between</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleInvolvedUser(u.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      involvedUserIds.includes(u.id) 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }}></span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Regular / Recurring Monthly Expense Option */}
            <div className={`p-3.5 rounded-xl border transition-all ${isRecurring ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200/80'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isRecurring ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Repeat size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Regular / Recurring Expense
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Repeats every month with fixed time &amp; cost (e.g. Rent, WiFi)
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {isRecurring && (
                <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 text-xs">
                  <span className="text-slate-600 font-medium">Due day each month:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Day</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(parseInt(e.target.value) || 1)}
                      className="w-16 px-2.5 py-1 text-center font-bold text-slate-800 bg-white border border-indigo-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-indigo-700 font-bold">of every month</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6">
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              {isEditMode ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
