'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface UseGameRealtimeProps {
  tableId: string;
  roundId?: string | null;
  onEvent?: () => void;
}

export function useGameRealtime({ tableId, roundId, onEvent }: UseGameRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const triggerRefresh = () => {
      if (onEvent) onEvent();
      router.refresh();
    };

    const channel = supabase
      .channel(`game-room-${tableId}-${roundId ?? 'lobby'}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'game_tables',
          filter: `id=eq.${tableId}`,
        },
        triggerRefresh
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `table_id=eq.${tableId}`,
        },
        triggerRefresh
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `table_id=eq.${tableId}`,
        },
        triggerRefresh
      );

    if (roundId) {
      channel
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'game_actions',
            filter: `round_id=eq.${roundId}`,
          },
          triggerRefresh
        )
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'game_player_cards',
            filter: `round_id=eq.${roundId}`,
          },
          triggerRefresh
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, roundId, router, onEvent]);
}

