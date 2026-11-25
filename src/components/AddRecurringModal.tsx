import React, { useState } from 'react';
import { RecurringExpense, User, Category } from '../types';
import { X, Calendar, DollarSign, Repeat, Check, Sparkles } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function AddRecurringModal({
  users,
  categories,
  onClose,
  onSave,
  recurringToEdit,
}: {
  users: User[];
  categories: Category[];
  onClose: () => void;
  onSave: (rec: RecurringExpense, postCurrentMonth?: boolean) => void;
  recurringToEdit?: RecurringExpense | null;
}) {
  const { user } = useAuth();

  const [description, setDescription] = useState(recurringToEdit?.description || '');
  const [amount, setAmount] = useState(recurringToEdit?.amount ? recurringToEdit.amount.toString() : '');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>(recurringToEdit?.frequency || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(recurringToEdit?.dayOfMonth || 1);
  const [paidById, setPaidById] = useState(() => {
    if (recurringToEdit?.paidById) return recurringToEdit.paidById;
    if (user && users.some(u => u.id === user.uid)) return user.uid;
    return users[0]?.id || '';
  });
  const [categoryId, setCategoryId] = useState(recurringToEdit?.categoryId || categories[0]?.id || '');
  const [involvedUserIds, setInvolvedUserIds] = useState<string[]>(
    recurringToEdit?.involvedUserIds || users.map(u => u.id)
  );
  const [postCurrentMonth, setPostCurrentMonth] = useState(!recurringToEdit);
  const [autoPost, setAutoPost] = useState(recurringToEdit?.autoPost ?? true);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!recurringToEdit;

  const toggleInvolvedUser = (id: string) => {
    setError(null);
    setInvolvedUserIds(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const selectAllUsers = () => {
    setInvolvedUserIds(users.map(u => u.id));
  };

  const parsedAmount = parseFloat(amount) || 0;
  const splitShare = involvedUserIds.length > 0 ? parsedAmount / involvedUserIds.length : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim() || parsedAmount <= 0) {
      setError('Please provide a description and a valid cost greater than $0.');
      return;
    }

    if (involvedUserIds.length === 0) {
      setError('At least one person must split this regular expense.');
      return;
    }

    const recData: RecurringExpense = {
      id: recurringToEdit?.id || Math.random().toString(36).substring(2, 11),
      description: description.trim(),
      amount: parsedAmount,
      paidById,
      categoryId,
      frequency,
      dayOfMonth: Math.min(31, Math.max(1, dayOfMonth)),
      involvedUserIds,
      splitMode: 'equal',
      startDate: recurringToEdit?.startDate || new Date().toISOString().substring(0, 10),
      isActive: recurringToEdit ? recurringToEdit.isActive : true,
      autoPost,
      lastGeneratedPeriod: recurringToEdit?.lastGeneratedPeriod,
      createdAt: recurringToEdit?.createdAt || undefined,
    };

    onSave(recData, !isEditMode && postCurrentMonth);
    onClose();
  };

  const quickPresets = [
    { label: 'Rent / Mortgage', category: 'Housing', amount: '1200', day: 1 },
    { label: 'WiFi / Internet', category: 'Utilities', amount: '60', day: 15 },
    { label: 'Electric & Gas', category: 'Utilities', amount: '120', day: 20 },
    { label: 'Netflix / Streaming', category: 'Entertainment', amount: '16', day: 1 },
  ];

  const handleApplyPreset = (preset: typeof quickPresets[0]) => {
    setDescription(preset.label);
    setAmount(preset.amount);
    setDayOfMonth(preset.day);
    const cat = categories.find(c => c.name.toLowerCase().includes(preset.category.toLowerCase()));
    if (cat) setCategoryId(cat.id);
  };

  // Helper for ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white rounded-2xl w-[95%] max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Repeat size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEditMode ? 'Edit Regular Expense' : 'Add Regular Fixed Expense'}
              </h2>
              <p className="text-xs text-slate-500">
                Scheduled bills with fixed time and cost (e.g. rent, internet)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
            {error && (
              <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            {!isEditMode && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-500" /> Quick Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bill Name / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Rent, High-Speed Internet"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fixed Cost ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Recurrence Schedule: Fixed Day and Frequency */}
            <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  Recurrence Schedule
                </label>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Repeats Every Month
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm font-medium text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="monthly">Monthly (Most common)</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Fixed Day of Month (1st - 31st)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold text-center text-slate-800 text-sm shadow-sm"
                    />
                    <span className="text-xs font-bold text-indigo-700">
                      Every {getOrdinal(dayOfMonth)} of the month
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Days:</span>
                {[1, 5, 15, 20, 28].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDayOfMonth(day)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
                      dayOfMonth === day
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {getOrdinal(day)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payer and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Default Payer (Who pays this bill)
                </label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm font-medium text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm font-medium text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split Members */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Split Between ({involvedUserIds.length} members)
                </label>
                <button
                  type="button"
                  onClick={selectAllUsers}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Select All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {users.map(u => {
                  const isSelected = involvedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleInvolvedUser(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }}></span>
                      {u.name}
                      {isSelected && <Check size={12} className="text-indigo-600 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {parsedAmount > 0 && involvedUserIds.length > 0 && (
                <div className="mt-2 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between text-slate-600">
                  <span>Each person's fixed monthly share:</span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(splitShare)}</span>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {!isEditMode && (
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={postCurrentMonth}
                    onChange={(e) => setPostCurrentMonth(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      Log this month's expense immediately
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Creates an active expense record in your ledger for the current month right now.
                    </p>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={autoPost}
                  onChange={(e) => setAutoPost(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Remind &amp; Prompt when due
                  </span>
                  <p className="text-[11px] text-slate-500">
                    SplitMate will flag this bill when due every month so housemates never forget to record it.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95"
            >
              {isEditMode ? 'Save Changes' : postCurrentMonth ? 'Save & Log First Bill' : 'Save Regular Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
