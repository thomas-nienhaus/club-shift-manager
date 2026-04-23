import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ShiftWithAssignments } from '@/lib/types';

const KEY = ['shifts'] as const;

export async function fetchShifts(params: { startDate?: string; endDate?: string } = {}): Promise<ShiftWithAssignments[]> {
  let query = supabase
    .from('shifts')
    .select(`
      *,
      assignments(
        id, volunteer_id, created_at,
        volunteers(id, name, email, phone, created_at)
      )
    `)
    .order('date')
    .order('slot');

  if (params.startDate) query = query.gte('date', params.startDate);
  if (params.endDate) query = query.lte('date', params.endDate);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((shift: any) => ({
    id: shift.id,
    seasonId: shift.season_id,
    date: shift.date,
    slot: shift.slot,
    startTime: shift.start_time,
    endTime: shift.end_time,
    capacity: shift.capacity,
    notes: shift.notes,
    createdAt: shift.created_at,
    assignments: (shift.assignments ?? []).map((a: any) => ({
      id: a.id,
      shiftId: shift.id,
      volunteerId: a.volunteer_id,
      volunteer: {
        id: a.volunteers.id,
        name: a.volunteers.name,
        email: a.volunteers.email,
        phone: a.volunteers.phone,
        createdAt: a.volunteers.created_at,
      },
      createdAt: a.created_at,
    })),
  }));
}

export function useListShifts(params: { startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => fetchShifts(params),
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      data: { date: string; slot: string; capacity?: number; notes?: string | null; startTime?: string | null; endTime?: string | null; seasonId?: number | null }
    }) => {
      const d = payload.data;
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          date: d.date, slot: d.slot, capacity: d.capacity ?? 99,
          notes: d.notes ?? null, start_time: d.startTime ?? null,
          end_time: d.endTime ?? null, season_id: d.seasonId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      data: { date?: string; slot?: string; capacity?: number; notes?: string | null; startTime?: string | null; endTime?: string | null }
    }) => {
      const d = payload.data;
      const update: Record<string, unknown> = {};
      if (d.date !== undefined) update.date = d.date;
      if (d.slot !== undefined) update.slot = d.slot;
      if (d.capacity !== undefined) update.capacity = d.capacity;
      if (d.notes !== undefined) update.notes = d.notes;
      if (d.startTime !== undefined) update.start_time = d.startTime;
      if (d.endTime !== undefined) update.end_time = d.endTime;
      const { error } = await supabase.from('shifts').update(update).eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const { error } = await supabase.from('shifts').delete().eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAssignVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; data: { volunteerId: number } }) => {
      const { error } = await supabase
        .from('assignments')
        .insert({ shift_id: payload.id, volunteer_id: payload.data.volunteerId });
      if (error) throw new Error(error.code === '23505' ? 'Vrijwilliger al ingedeeld voor deze dienst.' : error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUnassignVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; volunteerId: number }) => {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('shift_id', payload.id)
        .eq('volunteer_id', payload.volunteerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
