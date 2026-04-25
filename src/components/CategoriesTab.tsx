import React, { useState } from 'react';
import { Category, Expense } from '../types';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { IconMap } from './ExpensesList';

import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function CategoriesTab({ categories, setCategories, expenses, groupId }: { categories: Category[], setCategories: React.Dispatch<React.SetStateAction<Category[]>>, expenses: Expense[], groupId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const presetColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const newCategory: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      color: newColor,
      icon: 'Tag'
    };
    
    // optimistic UI
    setCategories([...categories, newCategory]);
    setIsAdding(false);
    setNewName('');

    if (user) {
      try {
        await setDoc(doc(db, `groups/${groupId}/categories`, newCategory.id), newCategory);
      } catch (error) {
        console.error("Failed to add category to FB", error);
      }
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (expenses.some(e => e.categoryId === id)) {
       alert(`Cannot remove ${name} because it is used in some expenses. Please change the category of those expenses first.`);
       return;
    }
    setCategories(categories.filter(c => c.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, `groups/${groupId}/categories`, id));
      } catch (error) {
        console.error("Failed to remove category from FB", error);
      }
    }
  };

  const saveEdit = async (id: string) => {
    if (editName.trim()) {
       const newNameValue = editName.trim();
       setCategories(categories.map(c => c.id === id ? { ...c, name: newNameValue } : c));

       if (user) {
         try {
           await updateDoc(doc(db, `groups/${groupId}/categories`, id), {
             name: newNameValue
           });
         } catch (error) {
           console.error("Failed to update category in FB", error);
         }
       }
    }
    setEditingId(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Categories</h2>
          <p className="text-sm text-slate-500 mt-1">Manage the categories for your expenses.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm flex flex-col gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center text-white" style={{ backgroundColor: newColor }}>
               <Tag size={20} />
             </div>
             <input 
                autoFocus
                placeholder="Category Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
          </div>
          <div>
             <p className="text-xs font-semibold text-slate-500 mb-2">Select Color</p>
             <div className="flex flex-wrap gap-2">
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${newColor === color ? 'border-zinc-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
             </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleAdd} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Save</button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(category => {
          const Icon = IconMap[category.icon] || Tag;
          return (
            <div key={category.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: category.color }}>
                  <Icon size={20} />
                </div>
                {editingId === category.id ? (
                  <div className="flex items-center gap-1">
                    <input 
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(category.id)}
                      className="px-3 py-1.5 rounded-md border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-32 sm:w-full"
                    />
                    <button onClick={() => saveEdit(category.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"><Check size={18}/></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={18}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{category.name}</h3>
                    <button onClick={() => { setEditingId(category.id); setEditName(category.name); }} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              {categories.length > 1 && (
                <button onClick={() => handleRemove(category.id, category.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
