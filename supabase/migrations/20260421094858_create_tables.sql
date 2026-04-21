/*
  # Create all tables (without cross-table RLS policies)
  Tables must exist before cross-referencing policies can be added.
*/

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now()
);

-- GROUP MEMBERS
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- GROUP INVITES
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE(group_id, email)
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- EXPENSE SPLITS
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_owed numeric(12, 2) NOT NULL CHECK (amount_owed >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'approved')),
  paid_at timestamptz,
  approved_at timestamptz,
  UNIQUE(expense_id, user_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_status ON public.expense_splits(status);
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON public.group_invites(token);
CREATE INDEX IF NOT EXISTS idx_group_invites_email ON public.group_invites(email);
