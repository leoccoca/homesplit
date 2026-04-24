import { User, Category, Expense } from './types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Leo', color: '#3b82f6' }, // blue-500
  { id: 'u2', name: 'Alex', color: '#10b981' }, // emerald-500
];

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Rent & Housing', color: '#6366f1', icon: 'Home' }, // indigo-500
  { id: 'c2', name: 'Groceries', color: '#22c55e', icon: 'ShoppingCart' }, // green-500
  { id: 'c3', name: 'Utilities', color: '#eab308', icon: 'Zap' }, // yellow-500
  { id: 'c4', name: 'Dining Out', color: '#f97316', icon: 'Utensils' }, // orange-500
  { id: 'c5', name: 'Household', color: '#a855f7', icon: 'Sofa' }, // purple-500
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    description: 'April Rent',
    amount: 1800,
    paidById: 'u1',
    categoryId: 'c1',
    date: '2026-04-01T10:00:00Z',
    splitMode: 'equal',
  },
  {
    id: 'e2',
    description: 'Trader Joes Groceries',
    amount: 145.50,
    paidById: 'u2',
    categoryId: 'c2',
    date: '2026-04-03T14:30:00Z',
    splitMode: 'equal',
  },
  {
    id: 'e3',
    description: 'Electricity Bill',
    amount: 85.20,
    paidById: 'u1',
    categoryId: 'c3',
    date: '2026-04-05T09:15:00Z',
    splitMode: 'equal',
  },
  {
    id: 'e4',
    description: 'Pizza Night',
    amount: 32.00,
    paidById: 'u2',
    categoryId: 'c4',
    date: '2026-04-10T19:00:00Z',
    splitMode: 'equal',
  },
  {
    id: 'e5',
    description: 'March Internet',
    amount: 60.00,
    paidById: 'u1',
    categoryId: 'c3',
    date: '2026-03-15T10:00:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
  {
    id: 'e6',
    description: 'Target Household Run',
    amount: 115.00,
    paidById: 'u2',
    categoryId: 'c5',
    date: '2026-03-22T14:30:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
  {
    id: 'e7',
    description: 'February Rent',
    amount: 1800.00,
    paidById: 'u1',
    categoryId: 'c1',
    date: '2026-02-01T09:15:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
  {
    id: 'e8',
    description: 'Whole Foods Groceries',
    amount: 155.50,
    paidById: 'u2',
    categoryId: 'c2',
    date: '2026-02-12T19:00:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
  {
    id: 'e9',
    description: 'January Rent',
    amount: 1800.00,
    paidById: 'u1',
    categoryId: 'c1',
    date: '2026-01-01T09:15:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
  {
    id: 'e10',
    description: 'New Year Dinner',
    amount: 85.00,
    paidById: 'u2',
    categoryId: 'c4',
    date: '2026-01-02T19:00:00Z',
    splitMode: 'equal',
    isSettled: true,
  },
];
