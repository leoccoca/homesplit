import React, { useState } from 'react';
import { User, Expense } from '../types';
import { UserPlus, Trash2, Edit2, Check, X, Link, Copy } from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function PeopleTab({ users, setUsers, expenses, groupId, groupName }: { users: User[], setUsers: React.Dispatch<React.SetStateAction<User[]>>, expenses: Expense[], groupId: string, groupName?: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { user } = useAuth();

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('groupId', groupId);
    const inviteUrl = url.toString();
    
    const shareTitle = groupName ? `Join the ${groupName} group` : 'Join my SplitMate Group';
    const shareText = groupName 
      ? `Hey! I've set up a group for our place on SplitMate to track expenses. You can join the "${groupName}" group here: ${inviteUrl}`
      : `Hey! Join my expense-sharing group on SplitMate! Click here to share costs with me: ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: inviteUrl,
        });
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy message:', err);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(groupId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
        await setDoc(doc(db, `groups/${groupId}/users`, newUser.id), newUser);
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
        await deleteDoc(doc(db, `groups/${groupId}/users`, id));
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
           await updateDoc(doc(db, `groups/${groupId}/users`, id), {
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

      {/* Invite Section */}
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Invite Roommates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <Link size={18} />
              <span>Invite Link</span>
            </div>
            <p className="text-sm text-emerald-600/80">The easiest way! Send this link to your roommates and they'll join automatically.</p>
            <button 
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 bg-white border border-emerald-200 text-emerald-700 py-2.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors shadow-sm"
            >
              {copiedLink ? <Check size={18} className="text-emerald-500" /> : <Link size={18} />}
              {copiedLink ? 'Link Copied!' : 'Share Invite Link'}
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold">
              <Check size={18} />
              <span>Invite Code</span>
            </div>
            <p className="text-sm text-indigo-600/80">Already have the app open? Just tell them to enter this code in the "Groups" tab.</p>
            <div className="flex gap-2">
              <div className={`flex-1 bg-white border border-indigo-200 flex items-center justify-center font-mono font-bold text-indigo-700 rounded-lg py-2 px-2 whitespace-nowrap overflow-hidden ${
                groupId.length > 18 ? 'text-sm' : groupId.length > 12 ? 'text-base' : 'text-xl'
              }`}>
                {groupId}
              </div>
              <button 
                onClick={handleCopyCode}
                className="bg-indigo-600 text-white p-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                title="Copy Code"
              >
                {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
