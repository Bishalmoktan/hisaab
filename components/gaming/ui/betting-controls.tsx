'use client';

import React from 'react';
import type { Card as CardType, PlayerGameState } from '@/lib/game/types';
import { evaluateHand } from '@/lib/game/hand-evaluator';
import { suitToSymbol } from '@/lib/game/deck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Coins,
  ArrowUpCircle,
  XOctagon,
  Sparkles,
  Swords,
  Loader2,
  Play,
} from 'lucide-react';

interface BettingControlsProps {
  gameState: PlayerGameState;
  loadingAction: string | null;
  onStartRound: () => void;
  onSeeCards: () => void;
  onBet: (amount: number, isRaise: boolean) => void;
  onFold: () => void;
  onShow: () => void;
  onSideshow: () => void;
}

function MiniCardBadge({ card }: { card: CardType }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-sm bg-white border shadow-sm ${
        isRed ? 'text-red-600 border-red-200' : 'text-slate-900 border-slate-200'
      }`}
    >
      {card.rank}
      {suitToSymbol(card.suit)}
    </span>
  );
}

export function BettingControls({
  gameState,
  loadingAction,
  onStartRound,
  onSeeCards,
  onBet,
  onFold,
  onShow,
  onSideshow,
}: BettingControlsProps) {
  const {
    table,
    currentRound,
    myCards,
    isMySeen,
    myPlayer,
    isMyTurn,
    canShow,
    canSideshow,
  } = gameState;

  const isRoundBetting = currentRound?.status === 'betting';
  const canStartNewRound =
    !isRoundBetting &&
    currentRound?.status !== 'dealing' &&
    currentRound?.status !== 'showdown' &&
    table.status !== 'finished' &&
    table.players.length >= 2;

  const baseBet = Number(currentRound?.current_bet ?? table.min_bet ?? 10);
  const callAmount = isMySeen ? baseBet * 2 : baseBet;
  const raiseAmount = callAmount * 2;

  const handEvaluation =
    isMySeen && myCards && myCards.length === 3 ? evaluateHand(myCards) : null;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl text-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: My Hand & Turn Status */}
        <div className="flex flex-wrap items-center gap-3">
          {myPlayer ? (
            <>
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400">Your Cards:</span>
                {isMySeen && myCards && myCards.length === 3 ? (
                  <div className="flex items-center gap-1.5">
                    {myCards.map((c, idx) => (
                      <MiniCardBadge key={idx} card={c} />
                    ))}
                  </div>
                ) : isRoundBetting ? (
                  <Badge
                    variant="outline"
                    className="bg-sky-950/60 text-sky-300 border-sky-700"
                  >
                    Playing Blind 🂠🂠🂠
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">Waiting for deal</span>
                )}
              </div>

              {handEvaluation && (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  {handEvaluation.description}
                </Badge>
              )}

              {isRoundBetting && (
                <div>
                  {isMyTurn ? (
                    <Badge className="bg-emerald-500 text-slate-950 font-bold animate-pulse px-3 py-1">
                      ⚡ YOUR TURN TO ACT
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Waiting for{' '}
                      <strong className="text-slate-200">
                        {table.players.find(
                          (p) => p.user_id === currentRound?.current_turn_user_id
                        )?.user?.name ?? 'next player'}
                      </strong>
                      ...
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-amber-300 font-medium">
              Click any open <strong>&ldquo;Sit #&rdquo;</strong> seat on the 3D table above to join the game!
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start / Deal Round Button */}
          {canStartNewRound && myPlayer && (
            <Button
              onClick={onStartRound}
              disabled={Boolean(loadingAction)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg"
            >
              {loadingAction === 'start' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {currentRound ? 'Deal Next Round' : 'Deal Cards & Start Round'}
            </Button>
          )}

          {!canStartNewRound && !isRoundBetting && table.players.length < 2 && (
            <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
              Need at least <strong>2 players</strong> seated on the table to deal cards.
            </div>
          )}

          {/* In-Round Actions */}
          {isRoundBetting && myPlayer && myPlayer.is_active && (
            <>
              {/* See Cards button (available anytime during round if still blind) */}
              {!isMySeen && (
                <Button
                  variant="outline"
                  onClick={onSeeCards}
                  disabled={Boolean(loadingAction)}
                  className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40"
                >
                  {loadingAction === 'see' ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-1.5" />
                  )}
                  See Cards
                </Button>
              )}

              {/* Bet / Chaal / Blind */}
              <Button
                onClick={() => onBet(callAmount, false)}
                disabled={!isMyTurn || Boolean(loadingAction)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {loadingAction === 'bet' ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Coins className="w-4 h-4 mr-1.5" />
                )}
                {isMySeen ? 'Chaal' : 'Blind'} ₹{callAmount}
              </Button>

              {/* Raise 2x */}
              <Button
                onClick={() => onBet(raiseAmount, true)}
                disabled={!isMyTurn || Boolean(loadingAction)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {loadingAction === 'raise' ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4 mr-1.5" />
                )}
                Raise 2x (₹{raiseAmount})
              </Button>

              {/* Sideshow (when > 2 active players and player is seen) */}
              {canSideshow && (
                <Button
                  variant="secondary"
                  onClick={onSideshow}
                  disabled={!isMyTurn || Boolean(loadingAction)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  {loadingAction === 'sideshow' ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Swords className="w-4 h-4 mr-1.5" />
                  )}
                  Sideshow (₹{callAmount})
                </Button>
              )}

              {/* Showdown (when exactly 2 active players left) */}
              {canShow && (
                <Button
                  onClick={onShow}
                  disabled={!isMyTurn || Boolean(loadingAction)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg"
                >
                  {loadingAction === 'show' ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1.5" />
                  )}
                  Show Hand (₹{callAmount})
                </Button>
              )}

              {/* Pack / Fold */}
              <Button
                variant="destructive"
                onClick={onFold}
                disabled={!isMyTurn || Boolean(loadingAction)}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {loadingAction === 'fold' ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <XOctagon className="w-4 h-4 mr-1.5" />
                )}
                Pack
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

