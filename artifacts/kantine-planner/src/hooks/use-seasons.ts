import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Season } from '@/lib/types';

const KEY = ['seasons'] as const;

async function fetchSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, start_date, end_date, is_published, created_at')
    .order('start_date');
  if (error) throw error;

  const ids = data.map(s => s.id);
  if (ids.length === 0) return [];

  const { data: counts, error: cErr } = await supabase
    .from('shifts')
    .select('season_id')
    .in('season_id', ids);
  if (cErr) throw cErr;

  const countMap = new Map<number, number>();
  counts.forEach(r => countMap.set(r.season_id, (countMap.get(r.season_id) ?? 0) + 1));

  return data.map(s => ({
    id: s.id,
    name: s.name,
    startDate: s.start_date,
    endDate: s.end_date,
    isPublished: s.is_published,
    createdAt: s.created_at,
    shiftCount: countMap.get(s.id) ?? 0,
  }));
}

export function useListSeasons() {
  return useQuery({ queryKey: KEY, queryFn: fetchSeasons });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { data: { name: string; startDate: string; endDate: string } }): Promise<Season> => {
      const d = payload.data;
      const { data, error } = await supabase
        .from('seasons')
        .insert({ name: d.name, start_date: d.startDate, end_date: d.endDate })
        .select()
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, startDate: data.start_date, endDate: data.end_date, isPublished: data.is_published, createdAt: data.created_at, shiftCount: 0 };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function usePublishSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      const { error } = await supabase
        .from('seasons')
        .update({ is_published: isPublished })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const { error } = await supabase.from('seasons').delete().eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
