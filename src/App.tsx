import React, { useState, useEffect } from 'react';
import { Expense, User, Category, Group } from './types';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import Header from './components/Header';
import PeopleTab from './components/PeopleTab';
import CategoriesTab from './components/CategoriesTab';
import GroupSelector from './components/GroupSelector';
import { Wallet, List, Users, Tags, LayoutGrid } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'expenses' | 'people' | 'categories' | 'groups'>('summary');

  const [inviteId, setInviteId] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a stored groupId we want to default to, or a query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('groupId');
    const stored = localStorage.getItem('activeGroupId');
    
    if (invite) {
      setInviteId(invite);
    } else if (stored) {
      setGroupId(stored);
    }
  }, []);

  const handleSelectGroup = (id: string) => {
    setGroupId(id);
    localStorage.setItem('activeGroupId', id);
    setActiveTab('summary');
    // Remove the URL param if it exists so it doesn't stick around
    const url = new URL(window.location.href);
    if (url.searchParams.has('groupId')) {
      url.searchParams.delete('groupId');
      window.history.replaceState({}, '', url);
    }
  };

  useEffect(() => {
    if (!user || !groupId) return;

    const unsubscribeGroup = onSnapshot(doc(db, `groups/${groupId}`), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentGroup({ id: snapshot.id, ...snapshot.data() } as Group);
      }
    }, (error) => {
      console.warn("Firestore sync error for group metadata", error);
    });
    
    const unsubscribeExpenses = onSnapshot(query(collection(db, `groups/${groupId}/expenses`)), (snapshot) => {
      const fbExpenses: Expense[] = [];
      snapshot.forEach((doc) => {
        fbExpenses.push(doc.data() as Expense);
      });
      setExpenses(fbExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => {
      console.warn("Firestore sync error for expenses, using local state", error);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, `groups/${groupId}/users`)), (snapshot) => {
      const fbUsers: User[] = [];
      snapshot.forEach((doc) => {
        fbUsers.push(doc.data() as User);
      });
      setUsers(fbUsers);
    }, (error) => {
      console.warn("Firestore sync error for users, using local state", error);
    });

    const unsubscribeCategories = onSnapshot(query(collection(db, `groups/${groupId}/categories`)), (snapshot) => {
      const fbCategories: Category[] = [];
      snapshot.forEach((doc) => {
        fbCategories.push(doc.data() as Category);
      });
      setCategories(fbCategories);
    }, (error) => {
      console.warn("Firestore sync error for categories, using local state", error);
    });

    return () => {
      unsubscribeGroup();
      unsubscribeExpenses();
      unsubscribeUsers();
      unsubscribeCategories();
    };
  }, [user, groupId]);

  const handleAddExpense = async (expense: Expense) => {
    setExpenses([expense, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    if (user && groupId) {
      try {
        await setDoc(doc(db, `groups/${groupId}/expenses`, expense.id), {
          ...expense,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to sync new expense to FB", error);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    
    if (user && groupId) {
      try {
         await deleteDoc(doc(db, `groups/${groupId}/expenses`, id));
      } catch (error) {
         console.error("Failed to delete expense from FB", error);
      }
    }
  };

  const handleToggleSettled = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
    const newState = !expense.isSettled;
    setExpenses(expenses.map(e => e.id === id ? { ...e, isSettled: newState } : e));
    
    if (user && groupId) {
      try {
        await updateDoc(doc(db, `groups/${groupId}/expenses`, id), {
          isSettled: newState
        });
      } catch(error) {
        console.error("Failed to update settlement state in FB", error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      {!user ? (
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 flex items-center justify-center text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Welcome to SplitMate</h2>
            <p className="text-slate-500">Sign in to start managing shared expenses with your housemates easily.</p>
          </div>
        </main>
      ) : !groupId ? (
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24">
          <GroupSelector onSelectGroup={handleSelectGroup} initialInviteId={inviteId} />
        </main>
      ) : (
        <>
          <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
            {activeTab === 'summary' && <Dashboard expenses={expenses} users={users} categories={categories} />}
            {activeTab === 'expenses' && <ExpensesList expenses={expenses} users={users} categories={categories} onAdd={handleAddExpense} onDelete={handleDeleteExpense} onToggleSettled={handleToggleSettled} />}
            {activeTab === 'people' && <PeopleTab users={users} setUsers={setUsers} expenses={expenses} groupId={groupId} groupName={currentGroup?.name} />}
            {activeTab === 'categories' && <CategoriesTab categories={categories} setCategories={setCategories} expenses={expenses} groupId={groupId} />}
            {activeTab === 'groups' && <GroupSelector onSelectGroup={handleSelectGroup} initialInviteId={inviteId} />}
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="sm:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-8px_16px_-1px_rgba(0,0,0,0.05)]">
            <NavItem icon={<Wallet />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
            <NavItem icon={<List />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
            <NavItem icon={<Users />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
            <NavItem icon={<Tags />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
            <NavItem icon={<LayoutGrid />} label="Groups" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          </nav>

          {/* Desktop Top Tabs */}
          <div className="hidden sm:flex justify-center -mt-8 mb-6 z-10 relative">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex">
              <TabButton icon={<Wallet size={18} />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
              <TabButton icon={<List size={18} />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
              <TabButton icon={<Users size={18} />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
              <TabButton icon={<Tags size={18} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
              <TabButton icon={<LayoutGrid size={18} />} label="Groups" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 py-1 ${active ? 'text-indigo-600' : 'text-slate-500'} active:scale-95 transition-transform`}>
      <div className={`transition-colors ${active ? 'bg-indigo-50 p-1.5 rounded-full' : 'p-1.5'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
