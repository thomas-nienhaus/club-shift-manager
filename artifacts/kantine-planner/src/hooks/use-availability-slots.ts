import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AvailabilitySlot } from '@/lib/types';

const KEY = ['availability-slots'] as const;

async function fetchSlots(): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .order('sort_order')
    .order('id');
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    key: s.key,
    label: s.label,
    sortOrder: s.sort_order,
    isActive: s.is_active,
    isHomeGameSlot: s.is_home_game_slot ?? false,
    startTime: s.start_time,
    endTime: s.end_time,
    homeStartTime: s.home_start_time ?? null,
    homeEndTime: s.home_end_time ?? null,
    createdAt: s.created_at,
  }));
}

export function useListAvailabilitySlots() {
  return useQuery({ queryKey: KEY, queryFn: fetchSlots });
}

export function useCreateAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { data: { key: string; label: string; isActive: boolean; startTime?: string | null; endTime?: string | null; homeStartTime?: string | null; homeEndTime?: string | null; sortOrder?: number } }) => {
      const d = payload.data;
      const { data, error } = await supabase
        .from('availability_slots')
        .insert({ key: d.key, label: d.label, is_active: d.isActive, start_time: d.startTime ?? null, end_time: d.endTime ?? null, home_start_time: d.homeStartTime ?? null, home_end_time: d.homeEndTime ?? null, sort_order: d.sortOrder ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; data: { label?: string; isActive?: boolean; startTime?: string | null; endTime?: string | null; homeStartTime?: string | null; homeEndTime?: string | null; sortOrder?: number } }) => {
      const d = payload.data;
      const update: Record<string, unknown> = {};
      if (d.label !== undefined) update.label = d.label;
      if (d.isActive !== undefined) update.is_active = d.isActive;
      if (d.startTime !== undefined) update.start_time = d.startTime;
      if (d.endTime !== undefined) update.end_time = d.endTime;
      if (d.homeStartTime !== undefined) update.home_start_time = d.homeStartTime;
      if (d.homeEndTime !== undefined) update.home_end_time = d.homeEndTime;
      if (d.sortOrder !== undefined) update.sort_order = d.sortOrder;
      const { data, error } = await supabase
        .from('availability_slots')
        .update(update)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const { error } = await supabase.from('availability_slots').delete().eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetHomeGameSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: number | null) => {
      // neq('id', 0) updates all rows — Supabase requires a filter clause
      const { error: resetError } = await supabase.from('availability_slots').update({ is_home_game_slot: false }).neq('id', 0);
      if (resetError) throw resetError;
      if (slotId !== null) {
        const { error } = await supabase.from('availability_slots').update({ is_home_game_slot: true }).eq('id', slotId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReorderAvailabilitySlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: number; sortOrder: number }[]) => {
      await Promise.all(
        items.map(({ id, sortOrder }) =>
          supabase.from('availability_slots').update({ sort_order: sortOrder }).eq('id', id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
