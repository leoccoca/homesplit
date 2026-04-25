import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';
import { Home, Plus, KeyRound, Loader2, ArrowRight, Trash2, AlertCircle } from 'lucide-react';

export default function GroupSelector({ onSelectGroup, initialInviteId }: { onSelectGroup: (groupId: string) => void, initialInviteId: string | null }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(!!initialInviteId);
  const [joinCode, setJoinCode] = useState(initialInviteId || '');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchGroups = async () => {
      try {
        const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
        const snapshot = await getDocs(q);
        const fetchedGroups: Group[] = [];
        snapshot.forEach(doc => {
          fetchedGroups.push({ id: doc.id, ...doc.data() } as Group);
        });
        
        // If they visited via invite link, and they are already a member, select it immediately
        if (initialInviteId && fetchedGroups.some(g => g.id === initialInviteId)) {
          onSelectGroup(initialInviteId);
          return;
        }
        
        setGroups(fetchedGroups);
      } catch (e) {
        console.error("Failed to fetch groups", e);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [user, initialInviteId, onSelectGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    setError('');
    
    // Create a human-friendly slug
    const slug = newGroupName.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .substring(0, 20);
    
    // Append 4 random chars to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    const newGroupId = `${slug}-${suffix}`;
    
    const groupRef = doc(db, `groups/${newGroupId}`);
    
    try {
      await setDoc(groupRef, {
        name: newGroupName.trim(),
        members: [user.uid],
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      
      const userRef = doc(db, `groups/${newGroupId}/users`, user.uid);
      await setDoc(userRef, {
        id: user.uid,
        name: user.displayName || 'You',
        color: '#4f46e5',
        avatarUrl: user.photoURL || ''
      });
      
      onSelectGroup(newGroupId);
    } catch (e) {
      console.error(e);
      setError("Failed to create group.");
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code || !user) return;
    setError('');
    
    const groupRef = doc(db, `groups/${code}`);
    try {
      // Add ourselves via arrayUnion (this diff passes our affectedKeys check)
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      
      const userRef = doc(db, `groups/${code}/users`, user.uid);
      await setDoc(userRef, {
        id: user.uid,
        name: user.displayName || 'You',
        color: '#0ea5e9',
        avatarUrl: user.photoURL || ''
      });
      
      onSelectGroup(code);
    } catch (e) {
      console.error(e);
      setError("Failed to join group. Check the ID and try again.");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `groups/${groupId}`));
      setGroups(groups.filter(g => g.id !== groupId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error(e);
      setError("Failed to delete group. You might not have permission.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={24} />
        <span className="text-lg font-medium">Loading your groups...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mt-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Welcome to SplitMate</h2>
        <p className="text-slate-500">Share expenses easily with your mates.</p>
      </div>

      {groups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">Your Groups</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map(group => (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow hover:border-indigo-200 transition-all text-left relative overflow-hidden group"
              >
                <div 
                  onClick={() => onSelectGroup(group.id)}
                  className="p-5 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Home size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-lg">{group.name}</h4>
                      <p className="text-sm text-slate-500">{group.members.length} members</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>

                {(group.ownerId === user?.uid || (!group.ownerId && group.members.includes(user?.uid || ''))) && (
                  <div className="px-5 pb-3 flex justify-end">
                    {deleteConfirm === group.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Are you sure?</span>
                        <button 
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={isDeleting}
                          className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50"
                          title="Confirm Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 bg-slate-100 text-slate-500 rounded-md hover:bg-slate-200 transition-colors"
                          title="Cancel"
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(group.id);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Group"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
        
        {/* Create Group */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600">
            <Plus size={100} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-2 relative z-10">Create a New Group</h3>
          <p className="text-sm text-slate-500 mb-6 relative z-10">Start a new shared living space and invite your housemates.</p>
          
          {isCreating ? (
            <form onSubmit={handleCreateGroup} className="space-y-3 relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g. 123 Baker Street"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={!newGroupName.trim()} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50">
                  Create
                </button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => { setIsCreating(true); setIsJoining(false); }} className="w-full relative z-10 flex border-2 border-dashed border-indigo-200 items-center justify-center gap-2 text-indigo-600 font-medium py-3 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
              <Plus size={20} />
              Start New Group
            </button>
          )}
        </div>

        {/* Join Group */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-600">
            <KeyRound size={100} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-2 relative z-10">Join Existing Group</h3>
          <p className="text-sm text-slate-500 mb-6 relative z-10">Have an invite code? Enter it below to join your housemates.</p>
          
          {isJoining ? (
            <form onSubmit={handleJoinGroup} className="space-y-3 relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <input
                autoFocus
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="e.g. x1y2z3a4"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={!joinCode.trim()} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-medium hover:bg-emerald-700 disabled:opacity-50">
                  Join
                </button>
                <button type="button" onClick={() => setIsJoining(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => { setIsJoining(true); setIsCreating(false); }} className="w-full relative z-10 flex border-2 border-dashed border-emerald-200 items-center justify-center gap-2 text-emerald-600 font-medium py-3 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
              <KeyRound size={20} />
              Enter Invite Code
            </button>
          )}
        </div>

      </div>
      
      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm text-center animate-in fade-in">{error}</div>}
    </div>
  );
}
