import React, { useState } from 'react';
import { Expense, User, Category } from '../types';
import { X } from 'lucide-react';
import { IconMap } from './ExpensesList';

export default function AddExpenseModal({ users, categories, onClose, onAdd }: { users: User[], categories: Category[], onClose: () => void, onAdd: (e: Expense) => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); // Default to today's date YYYY-MM-DD
  const [paidById, setPaidById] = useState(users[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [involvedUserIds, setInvolvedUserIds] = useState<string[]>(users.map(u => u.id));

  const toggleInvolvedUser = (id: string) => {
    setInvolvedUserIds(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) return;
    if (involvedUserIds.length === 0) {
      alert("At least one person must be involved in the expense.");
      return;
    }

    // We can use the date string directly or convert it to a full ISO string.
    // The current expense date format is full ISO string in `mockData.ts` and `Dashboard.ts`.
    // Adding T00:00:00.000Z to keep it consistent if needed, but YYYY-MM-DD is valid ISO too.
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      amount: parseFloat(amount),
      paidById,
      categoryId,
      date: new Date(date).toISOString(), // Generate full ISO string based on selected date
      splitMode: 'equal',
      involvedUserIds
    };

    onAdd(newExpense);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Add Expense</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
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

          <div className="pt-4 mt-auto">
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
