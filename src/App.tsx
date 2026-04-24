import React, { useState, useEffect } from 'react';
import { mockCategories, mockExpenses } from './mockData';
import { Expense, User, Category } from './types';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import Header from './components/Header';
import PeopleTab from './components/PeopleTab';
import CategoriesTab from './components/CategoriesTab';
import { Wallet, List, Users, Tags } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

const initialUsers: User[] = [
  { id: 'u1', name: 'You', color: '#4f46e5' }, // indigo-600
  { id: 'u2', name: 'Roommate', color: '#0ea5e9' }, // sky-500
];

const GROUP_ID = "default-group"; // we just use a default group for now

export default function App() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses.filter(e => e.paidById === 'u1' || e.paidById === 'u2'));
  const [activeTab, setActiveTab] = useState<'summary' | 'expenses' | 'people' | 'categories'>('summary');
  
  useEffect(() => {
    if (!user) return;
    
    const initGroup = async () => {
      try {
        const groupRef = doc(db, `groups/${GROUP_ID}`);
        const userRef = doc(db, `groups/${GROUP_ID}/users`, user.uid);
        
        // Update user's profile in the group
        await setDoc(userRef, {
          id: user.uid,
          name: user.displayName || 'Anonymous',
          color: '#4f46e5',
          avatarUrl: user.photoURL || ''
        }, { merge: true });

        // We use a firestore merge block here because of our rules requiring "createdAt" strictly on create.
        await setDoc(groupRef, {
          name: 'Home Split',
          members: [user.uid],
          createdAt: new Date().toISOString()
        }, { merge: true }); // Warning: The merge won't bypass the rule if the document does not exist, so it's a bit tricky.
      } catch (e) {
        console.error("Failed to init group", e);
      }
    };
    
    initGroup();

    const unsubscribeExpenses = onSnapshot(query(collection(db, `groups/${GROUP_ID}/expenses`)), (snapshot) => {
      const fbExpenses: Expense[] = [];
      snapshot.forEach((doc) => {
        fbExpenses.push(doc.data() as Expense);
      });
      if (fbExpenses.length > 0) {
        setExpenses(fbExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    }, (error) => {
      // It will throw permission denied early on because the group is not created, catching silently for mock data
      console.warn("Firestore sync error for expenses, using local state", error);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, `groups/${GROUP_ID}/users`)), (snapshot) => {
      const fbUsers: User[] = [];
      snapshot.forEach((doc) => {
        fbUsers.push(doc.data() as User);
      });
      if (fbUsers.length > 0) {
        setUsers(fbUsers);
      }
    }, (error) => {
      console.warn("Firestore sync error for users, using local state", error);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeUsers();
    };
  }, [user]);

  const handleAddExpense = async (expense: Expense) => {
    setExpenses([expense, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    if (user) {
      try {
        await setDoc(doc(db, `groups/${GROUP_ID}/expenses`, expense.id), {
          ...expense,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        // Just log, local state updated
        console.error("Failed to sync new expense to FB", error);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    
    if (user) {
      try {
         await deleteDoc(doc(db, `groups/${GROUP_ID}/expenses`, id));
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
    
    if (user) {
      try {
        await updateDoc(doc(db, `groups/${GROUP_ID}/expenses`, id), {
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
      
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
        {activeTab === 'summary' && <Dashboard expenses={expenses} users={users} categories={categories} />}
        {activeTab === 'expenses' && <ExpensesList expenses={expenses} users={users} categories={categories} onAdd={handleAddExpense} onDelete={handleDeleteExpense} onToggleSettled={handleToggleSettled} />}
        {activeTab === 'people' && <PeopleTab users={users} setUsers={setUsers} expenses={expenses} />}
        {activeTab === 'categories' && <CategoriesTab categories={categories} setCategories={setCategories} expenses={expenses} />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-8px_16px_-1px_rgba(0,0,0,0.05)]">
        <NavItem icon={<Wallet />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        <NavItem icon={<List />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
        <NavItem icon={<Users />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
        <NavItem icon={<Tags />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
      </nav>

      {/* Desktop Top Tabs */}
      <div className="hidden sm:flex justify-center -mt-8 mb-6 z-10 relative">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex">
          <TabButton icon={<Wallet size={18} />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <TabButton icon={<List size={18} />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
          <TabButton icon={<Users size={18} />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
          <TabButton icon={<Tags size={18} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
        </div>
      </div>
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
