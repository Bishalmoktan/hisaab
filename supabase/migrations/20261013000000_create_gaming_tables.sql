-- Migration: Create gaming tables for TeenPatti multiplayer feature
-- These tables support the in-app TeenPatti card game that integrates
-- with existing expense tracking (game losses become group expenses).

-- Game Tables: represents a virtual table where players gather
CREATE TABLE IF NOT EXISTS public.game_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  min_bet numeric(12, 2) NOT NULL DEFAULT 10 CHECK (min_bet > 0),
  max_players int NOT NULL DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 7),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_at timestamptz DEFAULT now()
);

-- Game Players: tracks who is seated at a table and their chip balance
CREATE TABLE IF NOT EXISTS public.game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seat_number int NOT NULL CHECK (seat_number >= 1 AND seat_number <= 7),
  chip_balance numeric(12, 2) NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(table_id, user_id),
  UNIQUE(table_id, seat_number)
);

-- Game Rounds: each hand played at a table
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  round_number int NOT NULL DEFAULT 1,
  pot_amount numeric(12, 2) NOT NULL DEFAULT 0,
  boot_amount numeric(12, 2) NOT NULL DEFAULT 10,
  winner_id uuid REFERENCES public.users(id),
  current_turn_user_id uuid REFERENCES public.users(id),
  current_bet numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'dealing' CHECK (status IN ('dealing', 'betting', 'showdown', 'completed')),
  cards_deck jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  expense_id uuid REFERENCES public.expenses(id),
  UNIQUE(table_id, round_number)
);

-- Game Actions: individual player actions within a round (bet, fold, etc.)
CREATE TABLE IF NOT EXISTS public.game_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('bet', 'raise', 'call', 'fold', 'show', 'sideshow', 'pack', 'boot')),
  amount numeric(12, 2) DEFAULT 0,
  sequence int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Game Player Cards: the cards dealt to each player in a round
CREATE TABLE IF NOT EXISTS public.game_player_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cards jsonb NOT NULL DEFAULT '[]',
  is_seen boolean NOT NULL DEFAULT false,
  UNIQUE(round_id, user_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_game_tables_group_id ON public.game_tables(group_id);
CREATE INDEX IF NOT EXISTS idx_game_tables_status ON public.game_tables(status);
CREATE INDEX IF NOT EXISTS idx_game_players_table_id ON public.game_players(table_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_table_id ON public.game_rounds(table_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON public.game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_game_actions_round_id ON public.game_actions(round_id);
CREATE INDEX IF NOT EXISTS idx_game_player_cards_round_id ON public.game_player_cards(round_id);

-- Enable Row Level Security (with authenticated access policies)
ALTER TABLE public.game_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_player_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to game_tables" ON public.game_tables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to game_players" ON public.game_players
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to game_rounds" ON public.game_rounds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to game_actions" ON public.game_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to game_player_cards" ON public.game_player_cards
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for live multiplayer updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_player_cards;

