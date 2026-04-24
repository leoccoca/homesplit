import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Plus, Trash2, ShieldCheck } from 'lucide-react';

export default function AdminAccessControl() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  
  const ADMIN_EMAIL = 'leocco.ca@gmail.com';

  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) return;
    
    const unsubscribe = onSnapshot(collection(db, 'allowed_emails'), (snapshot) => {
      const fbEmails: string[] = [];
      snapshot.forEach((doc) => {
        fbEmails.push(doc.id);
      });
      setEmails(fbEmails);
    });
    
    return () => unsubscribe();
  }, [user]);

  if (user?.email !== ADMIN_EMAIL) {
    return null;
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await setDoc(doc(db, 'allowed_emails', newEmail.trim().toLowerCase()), {
        addedAt: new Date().toISOString()
      });
      setNewEmail('');
    } catch (error) {
      console.error("Failed to add email", error);
      alert("Failed to add email. See console.");
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'allowed_emails', email));
    } catch (error) {
       console.error("Failed to remove email", error);
    }
  };

  return (
    <div className="mt-12 bg-slate-50 border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-indigo-600" size={20} />
        <h3 className="text-lg font-bold text-slate-800">Admin Security Settings</h3>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        Since this project is public, security rules only allow your email ({ADMIN_EMAIL}) and the explicitly allowed emails below to access or edit data on this web app. Add your roommates' Google email addresses below.
      </p>

      <form onSubmit={handleAddEmail} className="flex gap-2 mb-6">
        <input 
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="roommate@gmail.com"
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-700 transition-colors">
          <Plus size={18} /> Add
        </button>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">{ADMIN_EMAIL} (You/Admin)</span>
          </div>
        </div>
        
        {emails.map(email => (
          <div key={email} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-sm text-slate-700">{email}</span>
            <button onClick={() => handleRemoveEmail(email)} className="text-slate-400 hover:text-rose-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
