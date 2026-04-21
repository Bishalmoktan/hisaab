export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'created_at'>;
        Update: Partial<Omit<Group, 'id' | 'created_at'>>;
      };
      group_members: {
        Row: GroupMember;
        Insert: Omit<GroupMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<GroupMember, 'id'>>;
      };
      group_invites: {
        Row: GroupInvite;
        Insert: Omit<GroupInvite, 'id' | 'token' | 'created_at' | 'expires_at'>;
        Update: Partial<Omit<GroupInvite, 'id'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
      expense_splits: {
        Row: ExpenseSplit;
        Insert: Omit<ExpenseSplit, 'id'>;
        Update: Partial<Omit<ExpenseSplit, 'id'>>;
      };
    };
  };
}

export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
};

export type GroupInvite = {
  id: string;
  group_id: string;
  email: string;
  invited_by: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  paid_by: string;
  title: string;
  total_amount: number;
  date: string;
  notes: string;
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  status: 'pending' | 'paid' | 'approved';
  paid_at: string | null;
  approved_at: string | null;
};

// Enriched types with joined data
export type GroupWithMembers = Group & {
  members: (GroupMember & { user: User })[];
};

export type ExpenseWithDetails = Expense & {
  payer: User;
  splits: (ExpenseSplit & { user: User })[];
};

export type SplitInput = {
  userId: string;
  amountOwed: number;
};

// Balance types
export type UserNetBalance = {
  userId: string;
  user: User;
  totalOwed: number;
  totalToReceive: number;
  netBalance: number;
};

export type PairwiseDebt = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};
