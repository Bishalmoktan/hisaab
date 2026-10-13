'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles } from 'lucide-react';

const HAND_RANKINGS = [
  {
    rank: '1. Trail / Set (Three of a Kind)',
    example: 'A♠ A♥ A♦',
    desc: 'Three cards of the same rank. Three Aces (A-A-A) is the highest, Three 2s (2-2-2) is the lowest.',
    badge: 'Highest',
  },
  {
    rank: '2. Pure Sequence (Straight Flush)',
    example: 'A♥ 2♥ 3♥',
    desc: 'Three consecutive cards of the same suit. A-2-3 is the highest pure sequence, followed by A-K-Q.',
    badge: 'Very Rare',
  },
  {
    rank: '3. Sequence (Straight / Run)',
    example: '10♠ J♦ Q♣',
    desc: 'Three consecutive cards of different suits. A-2-3 is highest, then A-K-Q, K-Q-J, down to 4-3-2.',
    badge: 'Strong',
  },
  {
    rank: '4. Color (Flush)',
    example: 'K♠ 9♠ 4♠',
    desc: 'Three cards of the same suit, not in sequence. Highest card wins tiebreakers.',
    badge: 'Good',
  },
  {
    rank: '5. Pair (Two of a Kind)',
    example: 'Q♥ Q♣ 7♠',
    desc: 'Two cards of the same rank. Between two pairs, the higher pair wins (or kicker if tied).',
    badge: 'Common',
  },
  {
    rank: '6. High Card',
    example: 'A♦ 10♣ 5♥',
    desc: 'When no hand above is formed, the highest individual card wins.',
    badge: 'Base',
  },
];

export function HandRankingGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          TeenPatti Rules & Rankings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-500" />
            TeenPatti Hand Rankings & Expense Rules
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>How Hisaab TeenPatti Works:</strong> When you sit at a table, a linked Hisaab group tracks the board. Every round creates an official expense where the <strong>round winner</strong> is owed the pot by all other players based on their exact bets in that round!
          </div>

          <div className="space-y-2">
            {HAND_RANKINGS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {item.rank}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.desc}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="px-2 py-1 rounded bg-white border border-slate-200 font-mono text-xs font-bold text-slate-900 shadow-sm">
                    {item.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

