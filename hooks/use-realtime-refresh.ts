'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TableName =
  | 'expenses'
  | 'expense_splits'
  | 'group_members'
  | 'game_tables'
  | 'game_players'
  | 'game_rounds'
  | 'game_actions'
  | 'game_player_cards';

interface Options {
  table: TableName;
  filter?: string;
}

export function useRealtimeRefresh(options: Options[]) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels = options.map(({ table, filter }) => {
      const channel = supabase
        .channel(`realtime-${table}-${filter ?? 'all'}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter ? { filter } : {}),
          },
          () => {
            router.refresh();
          }
        )
        .subscribe();
      return channel;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [router]);
}
