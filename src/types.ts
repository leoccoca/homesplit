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
