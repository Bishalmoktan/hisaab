'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Card, GamePlayer } from '@/lib/game/types';
import type { User } from '@/lib/types';
import { Card3D } from './card-3d';
import { ChipStack } from './chip-stack';
import { Eye, EyeOff, Crown, UserPlus } from 'lucide-react';

interface PlayerSeatProps {
  seatNumber: number;
  totalSeats: number;
  player?: (GamePlayer & { user: User }) | null;
  isCurrentUser: boolean;
  isTurn: boolean;
  isWinner: boolean;
  roundInProgress: boolean;
  myCards: Card[] | null;
  canSitHere: boolean;
  onSitHere?: (seatNumber: number) => void;
  onSeeCards?: () => void;
}

/**
 * Computes seat position and inward-facing angle around the oval table.
 * Seat 1 (or current user's seat) is positioned near the front-bottom.
 */
export function getSeatTransform(seatIndex: number, totalSeats: number) {
  // Distribute seats evenly from bottom (+Z) clockwise around the oval
  // Angle 0 = bottom center (0, 0, +Z)
  const angleOffset = Math.PI / 2; // Start at bottom (+Z)
  const angle = angleOffset + (seatIndex / totalSeats) * Math.PI * 2;

  const radiusX = 4.55;
  const radiusZ = 3.35;

  const x = Math.cos(angle) * radiusX;
  const z = Math.sin(angle) * radiusZ;

  // Inward-facing rotation toward center (0,0,0)
  const lookAngle = Math.atan2(-x, -z);

  return {
    seatPos: [x, 0.12, z] as [number, number, number],
    cardCenterPos: [x * 0.66, 0.03, z * 0.66] as [number, number, number],
    chipPos: [x * 0.52 + 0.48, 0.01, z * 0.52] as [number, number, number],
    lookAngle,
  };
}

export function PlayerSeat({
  seatNumber,
  totalSeats,
  player,
  isCurrentUser,
  isTurn,
  isWinner,
  roundInProgress,
  myCards,
  canSitHere,
  onSitHere,
  onSeeCards,
}: PlayerSeatProps) {
  const turnRingRef = useRef<THREE.Mesh>(null);
  const { seatPos, cardCenterPos, chipPos, lookAngle } = getSeatTransform(
    seatNumber - 1,
    totalSeats
  );

  useFrame(({ clock }) => {
    if (turnRingRef.current && (isTurn || isWinner)) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.08;
      turnRingRef.current.scale.set(pulse, pulse, 1);
    }
  });

  // Determine cards to display for this player
  const displayCards: (Card | null)[] = React.useMemo(() => {
    if (!player || !roundInProgress) return [];
    if (isCurrentUser && myCards && myCards.length === 3) {
      return myCards;
    }
    if (player.revealed_cards && player.revealed_cards.length === 3) {
      return player.revealed_cards;
    }
    // 3 face-down cards
    return [null, null, null];
  }, [player, roundInProgress, isCurrentUser, myCards]);

  const showFaceUp = Boolean(
    (isCurrentUser && player?.is_seen && myCards?.length === 3) ||
      (player?.revealed_cards && player.revealed_cards.length === 3)
  );

  const initials = player?.user?.name
    ? player.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <group>
      {/* Glowing Seat Spot / Turn Ring on Table Felt */}
      <mesh
        ref={turnRingRef}
        position={[cardCenterPos[0], 0.015, cardCenterPos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.58, 0.68, 32]} />
        <meshBasicMaterial
          color={
            isWinner
              ? '#fbbf24'
              : isTurn
              ? '#22c55e'
              : player
              ? '#38bdf8'
              : '#475569'
          }
          transparent
          opacity={isWinner || isTurn ? 0.9 : 0.25}
        />
      </mesh>

      {/* Player's 3-Card Hand on the Felt */}
      {player &&
        displayCards.map((cardItem, idx) => {
          const fanOffset = (idx - 1) * 0.34;
          const fanAngle = (idx - 1) * -0.14;
          // Offset perpendicular to look direction
          const perpX = Math.cos(lookAngle) * fanOffset;
          const perpZ = -Math.sin(lookAngle) * fanOffset;

          return (
            <Card3D
              key={idx}
              card={cardItem}
              faceUp={showFaceUp}
              position={[
                cardCenterPos[0] + perpX,
                cardCenterPos[1] + idx * 0.008,
                cardCenterPos[2] + perpZ,
              ]}
              rotation={[0, lookAngle + fanAngle, 0]}
              scale={isCurrentUser ? 1.08 : 0.88}
              isFolded={!player.is_active}
              isHighlighted={isTurn || isWinner}
              onClick={
                isCurrentUser && !player.is_seen && onSeeCards
                  ? onSeeCards
                  : undefined
              }
            />
          );
        })}

      {/* Player's 3D Chip Stack */}
      {player && Number(player.chip_balance) > 0 && (
        <ChipStack
          amount={Math.min(1500, Math.max(50, Number(player.chip_balance)))}
          position={chipPos}
          scale={0.75}
        />
      )}

      {/* Floating 3D HTML Player Badge / Empty Seat Button */}
      <Html
        position={[seatPos[0], seatPos[1] + 0.55, seatPos[2]]}
        center
        distanceFactor={9.5}
        zIndexRange={[10, 0]}
      >
        {player ? (
          <div
            className={`relative flex flex-col items-center px-3 py-2 rounded-2xl border backdrop-blur-md shadow-xl transition-all select-none min-w-[132px] ${
              isWinner
                ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/60 scale-105'
                : isTurn
                ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400/60 scale-105'
                : !player.is_active && roundInProgress
                ? 'bg-slate-900/75 border-slate-700 opacity-60'
                : isCurrentUser
                ? 'bg-slate-900/90 border-blue-400/80'
                : 'bg-slate-900/85 border-slate-700/80'
            }`}
          >
            {/* Winner Crown or Turn Pill */}
            {isWinner && (
              <div className="absolute -top-3.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow">
                <Crown className="w-3 h-3" /> WINNER
              </div>
            )}
            {!isWinner && isTurn && (
              <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-bold text-[10px] animate-pulse shadow">
                PLAYING TURN
              </div>
            )}

            <div className="flex items-center gap-2 w-full">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden border border-white/20">
                {player.user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.user.avatar_url}
                    alt={player.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  {isCurrentUser ? 'You' : player.user?.name?.split(' ')[0] || 'Player'}
                  <span className="text-[10px] text-slate-400 font-normal">
                    #{seatNumber}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-amber-400">
                  ₹{Number(player.chip_balance).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Status Row (Blind / Seen / Packed) */}
            {roundInProgress && (
              <div className="mt-1.5 w-full flex items-center justify-between gap-1 pt-1 border-t border-white/10 text-[10px]">
                {!player.is_active ? (
                  <span className="text-rose-400 font-semibold uppercase tracking-wider">
                    Packed / Folded
                  </span>
                ) : player.is_seen ? (
                  <span className="text-amber-300 font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Seen (Chaal)
                  </span>
                ) : (
                  <span className="text-sky-300 font-medium flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Blind
                  </span>
                )}

                {isCurrentUser &&
                  player.is_active &&
                  !player.is_seen &&
                  onSeeCards && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeeCards();
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition"
                    >
                      See
                    </button>
                  )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center select-none">
            {canSitHere && onSitHere ? (
              <button
                onClick={() => onSitHere(seatNumber)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-emerald-600/90 text-slate-200 hover:text-white border border-slate-600 hover:border-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all backdrop-blur-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sit #{seatNumber}
              </button>
            ) : (
              <div className="px-2.5 py-1 rounded-lg bg-slate-900/45 border border-slate-700/50 text-slate-500 text-[10px] font-medium">
                Seat #{seatNumber}
              </div>
            )}
          </div>
        )}
      </Html>
    </group>
  );
}

