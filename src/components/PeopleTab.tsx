import React, { useState } from 'react';
import { User, Expense } from '../types';
import { UserPlus, Trash2, Edit2, Check, X } from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import AdminAccessControl from './AdminAccessControl';

const GROUP_ID = "default-group";

export default function PeopleTab({ users, setUsers, expenses }: { users: User[], setUsers: React.Dispatch<React.SetStateAction<User[]>>, expenses: Expense[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { user } = useAuth();

  const handleAdd = async () => {
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
    const existingColors = users.map(u => u.color);
    const color = colors.find(c => !existingColors.includes(c)) || colors[Math.floor(Math.random() * colors.length)];
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Roommate ${users.length + 1}`,
      color
    };
    
    // optimistic UI
    setUsers([...users, newUser]);

    if (user) {
      try {
        await setDoc(doc(db, `groups/${GROUP_ID}/users`, newUser.id), newUser);
      } catch (error) {
        console.error("Failed to add user to FB", error);
      }
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (expenses.some(e => e.paidById === id)) {
       alert(`Cannot remove ${name} because they have paid for an expense. Please delete their expenses first.`);
       return;
    }
    setUsers(users.filter(u => u.id !== id));
    
    if (user) {
      try {
        await deleteDoc(doc(db, `groups/${GROUP_ID}/users`, id));
      } catch (error) {
        console.error("Failed to delete user from FB", error);
      }
    }
  };

  const saveEdit = async (id: string) => {
    if (editName.trim()) {
       const newName = editName.trim();
       setUsers(users.map(u => u.id === id ? { ...u, name: newName } : u));
       
       if (user) {
         try {
           await updateDoc(doc(db, `groups/${GROUP_ID}/users`, id), {
             name: newName
           });
         } catch (error) {
           console.error("Failed to update user in FB", error);
         }
       }
    }
    setEditingId(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">People</h2>
          <p className="text-sm text-slate-500 mt-1">Add your roommates and customize their names.</p>
        </div>
        <button
          onClick={handleAdd}
          className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700`}
        >
          <UserPlus size={18} />
          Add Person
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-lg shadow-sm" style={{ backgroundColor: u.color }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              {editingId === u.id ? (
                <div className="flex items-center gap-1">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(u.id)}
                    className="px-3 py-1.5 rounded-md border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-32 sm:w-full"
                  />
                  <button onClick={() => saveEdit(u.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"><Check size={18}/></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={18}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{u.name}</h3>
                  <button onClick={() => { setEditingId(u.id); setEditName(u.name); }} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>
            
            {users.length > 2 && (
              <button onClick={() => handleRemove(u.id, u.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      <AdminAccessControl />
    </div>
  );
}
