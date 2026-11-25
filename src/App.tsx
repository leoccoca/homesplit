import React, { useState, useEffect } from 'react';
import { Expense, User, Category, Group, RecurringExpense } from './types';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import Header from './components/Header';
import PeopleTab from './components/PeopleTab';
import CategoriesTab from './components/CategoriesTab';
import GroupSelector from './components/GroupSelector';
import { Wallet, List, Users, Tags, LayoutGrid, BarChart3 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AnalysisTab from './components/AnalysisTab';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'expenses' | 'analysis' | 'people' | 'categories' | 'groups'>('summary');

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

    const unsubscribeRecurring = onSnapshot(query(collection(db, `groups/${groupId}/recurringExpenses`)), (snapshot) => {
      const fbRecurring: RecurringExpense[] = [];
      snapshot.forEach((doc) => {
        fbRecurring.push(doc.data() as RecurringExpense);
      });
      setRecurringExpenses(fbRecurring);
      try {
        localStorage.setItem(`recurringExpenses_${groupId}`, JSON.stringify(fbRecurring));
      } catch {}
    }, (error) => {
      console.warn("Firestore sync error for recurring expenses, using local state", error);
      const saved = localStorage.getItem(`recurringExpenses_${groupId}`);
      if (saved) {
        try {
          setRecurringExpenses(JSON.parse(saved));
        } catch {}
      }
    });

    return () => {
      unsubscribeGroup();
      unsubscribeExpenses();
      unsubscribeUsers();
      unsubscribeCategories();
      unsubscribeRecurring();
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

  const handleUpdateExpense = async (expense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    if (user && groupId) {
      try {
        const payload: any = { ...expense };
        if (!payload.createdAt) {
          payload.createdAt = serverTimestamp();
        }
        await setDoc(doc(db, `groups/${groupId}/expenses`, expense.id), payload);
      } catch (error) {
        console.error("Failed to sync updated expense to FB", error);
      }
    }
  };

  const handleAddRecurring = async (rec: RecurringExpense, postCurrentMonth?: boolean) => {
    setRecurringExpenses(prev => [...prev.filter(r => r.id !== rec.id), rec]);
    try {
      localStorage.setItem(`recurringExpenses_${groupId}`, JSON.stringify([...recurringExpenses.filter(r => r.id !== rec.id), rec]));
    } catch {}

    if (user && groupId) {
      try {
        await setDoc(doc(db, `groups/${groupId}/recurringExpenses`, rec.id), {
          ...rec,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to sync new recurring expense to FB", error);
      }
    }

    if (postCurrentMonth) {
      await handlePostRecurringExpense(rec);
    }
  };

  const handleUpdateRecurring = async (rec: RecurringExpense) => {
    setRecurringExpenses(prev => prev.map(r => r.id === rec.id ? rec : r));
    try {
      localStorage.setItem(`recurringExpenses_${groupId}`, JSON.stringify(recurringExpenses.map(r => r.id === rec.id ? rec : r)));
    } catch {}

    if (user && groupId) {
      try {
        await updateDoc(doc(db, `groups/${groupId}/recurringExpenses`, rec.id), {
          ...rec
        });
      } catch (error) {
        console.error("Failed to update recurring expense in FB", error);
      }
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    try {
      localStorage.setItem(`recurringExpenses_${groupId}`, JSON.stringify(recurringExpenses.filter(r => r.id !== id)));
    } catch {}

    if (user && groupId) {
      try {
        await deleteDoc(doc(db, `groups/${groupId}/recurringExpenses`, id));
      } catch (error) {
        console.error("Failed to delete recurring expense from FB", error);
      }
    }
  };

  const handleToggleRecurringActive = async (id: string) => {
    const target = recurringExpenses.find(r => r.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };
    handleUpdateRecurring(updated);
  };

  const handlePostRecurringExpense = async (rec: RecurringExpense, targetDate?: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(rec.dayOfMonth).padStart(2, '0');
    const dateStr = targetDate || `${year}-${month}-${day}`;

    // Prevent duplicate: check if already exists for this month
    const monthKey = `${year}-${month}`;
    const alreadyExists = expenses.some(e => 
      (e.recurringExpenseId === rec.id || e.description.toLowerCase().trim() === rec.description.toLowerCase().trim()) && 
      e.date.startsWith(monthKey)
    );
    if (alreadyExists) return;

    const newExpense: Expense = {
      id: Math.random().toString(36).substring(2, 11),
      description: rec.description,
      amount: rec.amount,
      paidById: rec.paidById,
      categoryId: rec.categoryId,
      date: new Date(dateStr).toISOString(),
      splitMode: rec.splitMode || 'equal',
      involvedUserIds: rec.involvedUserIds,
      isSettled: false,
      isRecurring: true,
      recurringExpenseId: rec.id,
      recurringFrequency: rec.frequency,
    };

    await handleAddExpense(newExpense);

    const updatedRec = { ...rec, lastGeneratedPeriod: monthKey };
    await handleUpdateRecurring(updatedRec);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} showNavigation={!!user && !!groupId} groupId={groupId} onSelectGroup={handleSelectGroup} />
      
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
            {activeTab === 'summary' && (
              <Dashboard 
                expenses={expenses} 
                users={users} 
                categories={categories} 
                recurringExpenses={recurringExpenses}
                onAdd={handleAddExpense}
                onNavigateToRegular={() => setActiveTab('expenses')}
                onPostRecurringExpense={handlePostRecurringExpense}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensesList 
                expenses={expenses} 
                users={users} 
                categories={categories} 
                recurringExpenses={recurringExpenses}
                onAdd={handleAddExpense} 
                onDelete={handleDeleteExpense} 
                onToggleSettled={handleToggleSettled} 
                onUpdate={handleUpdateExpense}
                onAddRecurring={handleAddRecurring}
                onUpdateRecurring={handleUpdateRecurring}
                onDeleteRecurring={handleDeleteRecurring}
                onToggleRecurringActive={handleToggleRecurringActive}
                onPostRecurringExpense={handlePostRecurringExpense}
              />
            )}
            {activeTab === 'analysis' && <AnalysisTab expenses={expenses} users={users} categories={categories} />}
            {activeTab === 'people' && <PeopleTab users={users} setUsers={setUsers} expenses={expenses} groupId={groupId} groupName={currentGroup?.name} />}
            {activeTab === 'categories' && <CategoriesTab categories={categories} setCategories={setCategories} expenses={expenses} groupId={groupId} />}
            {activeTab === 'groups' && <GroupSelector onSelectGroup={handleSelectGroup} initialInviteId={inviteId} />}
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="sm:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-between px-1 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-8px_16px_-1px_rgba(0,0,0,0.05)] text-[10px]">
            <NavItem icon={<Wallet />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
            <NavItem icon={<List />} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
            <NavItem icon={<BarChart3 />} label="Analysis" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
            <NavItem icon={<Users />} label="People" active={activeTab === 'people'} onClick={() => setActiveTab('people')} />
            <NavItem icon={<Tags />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
          </nav>
        </>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-0.5 min-w-0 py-1 ${active ? 'text-indigo-600 font-bold' : 'text-slate-500'} active:scale-95 transition-transform`}>
      <div className={`transition-colors ${active ? 'bg-indigo-50 p-1.5 rounded-full' : 'p-1.5'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className="text-[9px] truncate w-full text-center">{label}</span>
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
