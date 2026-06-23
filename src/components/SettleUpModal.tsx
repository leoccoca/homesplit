import React, { useState } from 'react';
import { X, DollarSign, Calendar, Check, ArrowRight } from 'lucide-react';
import { User, Expense } from '../types';
import { motion } from 'motion/react';

interface SettleUpModalProps {
  users: User[];
  defaultFromUser: User;
  defaultToUser: User;
  suggestedAmount: number;
  onClose: () => void;
  onAdd: (e: Expense) => void;
}

export default function SettleUpModal({
  users,
  defaultFromUser,
  defaultToUser,
  suggestedAmount,
  onClose,
  onAdd
}: SettleUpModalProps) {
  const [fromUserId, setFromUserId] = useState(defaultFromUser.id);
  const [toUserId, setToUserId] = useState(defaultToUser.id);
  const [amount, setAmount] = useState(suggestedAmount.toFixed(2));
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fromUser = users.find(u => u.id === fromUserId) || defaultFromUser;
  const toUser = users.find(u => u.id === toUserId) || defaultToUser;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError("Please specify a valid payment amount greater than zero.");
      return;
    }

    if (fromUserId === toUserId) {
      setError("Payer and recipient cannot be the same person.");
      return;
    }

    const finalDescription = description.trim() || `Repayment: ${fromUser.name} to ${toUser.name}`;

    const paymentExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: finalDescription,
      amount: val,
      paidById: fromUserId, // C is paying
      categoryId: 'repayment', // Special category
      date: date,
      splitMode: 'equal',
      involvedUserIds: [toUserId], // A is the only consumer/recipient
      isSettled: false,
      isRepayment: true
    };

    onAdd(paymentExpense);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Record a Repayment</h2>
            <p className="text-xs text-slate-400 mt-0.5">Settle balances directly between members</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg animate-in fade-in">
              {error}
            </div>
          )}

          {/* Quick Flow Visual */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm" style={{ backgroundColor: fromUser.color }}>
                {fromUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1 truncate max-w-[80px]">{fromUser.name}</span>
            </div>
            <ArrowRight className="text-slate-300 animate-pulse" size={20} />
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm" style={{ backgroundColor: toUser.color }}>
                {toUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1 truncate max-w-[80px]">{toUser.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Who Paid?</label>
              <select 
                value={fromUserId}
                onChange={e => setFromUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all appearance-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Who Received?</label>
              <select 
                value={toUserId}
                onChange={e => setToUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all appearance-none cursor-pointer"
              >
                {users.filter(u => u.id !== fromUserId).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Paid</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign size={16} className="stroke-[2.5]" />
              </div>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-9 pr-4 py-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Suggested starting amount: ${suggestedAmount.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={15} />
                </div>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Custom Memo (Optional)</label>
              <input 
                type="text"
                placeholder={`Repayment: ${fromUser.name} to ${toUser.name}`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-1.5"
            >
              <Check size={16} className="stroke-[2.5]" />
              Confirm Payment
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
