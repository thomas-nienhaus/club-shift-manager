import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AvailabilitySlot, HomeGameDate } from '@/lib/types';

const key = (seasonId: number) => ['home-game-dates', seasonId] as const;

export function useListHomeGameDates(seasonId: number) {
  return useQuery({
    queryKey: key(seasonId),
    queryFn: async (): Promise<HomeGameDate[]> => {
      const { data, error } = await supabase
        .from('home_game_dates')
        .select('*')
        .eq('season_id', seasonId)
        .order('date');
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        seasonId: r.season_id,
        date: r.date,
        extraSlot: r.extra_slot,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useCreateHomeGameDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId, date, extraSlot }: { seasonId: number; date: string; extraSlot: string }) => {
      const { error } = await supabase
        .from('home_game_dates')
        .insert({ season_id: seasonId, date, extra_slot: extraSlot });
      if (error) throw error;

      // Voeg de shift direct toe (upsert zodat dubbele insert geen fout geeft)
      await supabase
        .from('shifts')
        .upsert({ season_id: seasonId, date, slot: extraSlot }, { onConflict: 'season_id,date,slot' });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key(vars.seasonId) });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useCreateHomeGameDates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId, dates, extraSlot, allSlots }: { seasonId: number; dates: string[]; extraSlot: string; allSlots: AvailabilitySlot[] }) => {
      const rows = dates.map(date => ({ season_id: seasonId, date, extra_slot: extraSlot }));
      const { error } = await supabase.from('home_game_dates').insert(rows);
      if (error) throw error;

      // Build shift rows: extra slot + regular slots with home times applied
      const regularSlots = allSlots.filter(s => !s.isHomeGameSlot && s.isActive && s.homeStartTime && s.homeEndTime);
      const shiftRows = dates.flatMap(date => [
        { season_id: seasonId, date, slot: extraSlot },
        ...regularSlots.map(s => ({
          season_id: seasonId,
          date,
          slot: s.key,
          start_time: s.homeStartTime,
          end_time: s.homeEndTime,
        })),
      ]);
      await supabase.from('shifts').upsert(shiftRows, { onConflict: 'season_id,date,slot' });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key(vars.seasonId) });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteHomeGameDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, seasonId, date, extraSlot }: { id: number; seasonId: number; date: string; extraSlot: string }) => {
      await supabase.from('home_game_dates').delete().eq('id', id);
      await supabase
        .from('shifts')
        .delete()
        .eq('season_id', seasonId)
        .eq('date', date)
        .eq('slot', extraSlot);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key(vars.seasonId) });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
