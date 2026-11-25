export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  categoryId: string;
  date: string;
  splitMode: 'equal' | 'exact' | 'percentage';
  isSettled?: boolean;
  involvedUserIds?: string[]; // If undefined, assume all users
  createdAt?: any;
  isRepayment?: boolean;
  isRecurring?: boolean;
  recurringExpenseId?: string;
  recurringFrequency?: 'monthly' | 'weekly' | 'yearly';
};

export type RecurringExpense = {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  categoryId: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  dayOfMonth: number; // 1 to 31 (fixed day of month, e.g. 1st for rent)
  involvedUserIds: string[];
  splitMode: 'equal' | 'exact' | 'percentage';
  startDate: string; // YYYY-MM-DD
  isActive: boolean;
  autoPost?: boolean;
  lastGeneratedPeriod?: string; // e.g., '2026-10'
  createdAt?: any;
};

export type Group = {
  id: string;
  name: string;
  members: string[];
  ownerId: string;
  createdAt: any;
};

export type Settlement = {
  fromUser: User;
  toUser: User;
  amount: number;
};
