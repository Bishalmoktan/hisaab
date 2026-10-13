// ============================================================
// TeenPatti Gaming Types
// ============================================================

// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type Card = {
  suit: Suit;
  rank: Rank;
};

// Hand ranking types (TeenPatti hand hierarchy)
export type HandRank = 'trail' | 'pure_sequence' | 'sequence' | 'color' | 'pair' | 'high_card';

export type HandEvaluation = {
  rank: HandRank;
  rankValue: number; // 6=trail, 5=pure_sequence, 4=sequence, 3=color, 2=pair, 1=high_card
  highCards: number[]; // For tiebreaking
  description: string; // Human-readable (e.g., "Trail of Aces")
};

// ============================================================
// DB Row Types (matching the SQL schema)
// ============================================================

export type GameTable = {
  id: string;
  name: string;
  group_id: string;
  created_by: string;
  min_bet: number;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
};

export type GamePlayer = {
  id: string;
  table_id: string;
  user_id: string;
  seat_number: number;
  chip_balance: number;
  is_active: boolean;
  joined_at: string;
  is_seen?: boolean;
  revealed_cards?: Card[] | null;
};

export type GameRound = {
  id: string;
  table_id: string;
  round_number: number;
  pot_amount: number;
  boot_amount: number;
  winner_id: string | null;
  current_turn_user_id: string | null;
  current_bet: number;
  status: 'dealing' | 'betting' | 'showdown' | 'completed';
  cards_deck: any; // jsonb
  started_at: string;
  ended_at: string | null;
  expense_id: string | null;
};

export type GameAction = {
  id: string;
  round_id: string;
  user_id: string;
  action_type: 'bet' | 'raise' | 'call' | 'fold' | 'show' | 'sideshow' | 'pack' | 'boot';
  amount: number;
  sequence: number;
  created_at: string;
};

export type GamePlayerCards = {
  id: string;
  round_id: string;
  user_id: string;
  cards: Card[];
  is_seen: boolean;
};

// ============================================================
// Enriched Types (with joined data)
// ============================================================

export type GameTableWithPlayers = GameTable & {
  players: (GamePlayer & { user: import('@/lib/types').User })[];
  group: import('@/lib/types').Group;
  creator: import('@/lib/types').User;
};

export type GameRoundWithDetails = GameRound & {
  actions: (GameAction & { user: import('@/lib/types').User })[];
};

export type PlayerGameState = {
  table: GameTableWithPlayers;
  currentRound: GameRound | null;
  myCards: Card[] | null;
  isMySeen: boolean;
  actions: (GameAction & { user: import('@/lib/types').User })[];
  myPlayer: GamePlayer | null;
  isMyTurn: boolean;
  canShow: boolean;
  canSideshow: boolean;
  activePlayers: (GamePlayer & { user: import('@/lib/types').User })[];
};
