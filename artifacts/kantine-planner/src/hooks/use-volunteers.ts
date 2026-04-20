import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Volunteer } from '@/lib/types';

const KEY = ['volunteers'] as const;

export async function fetchVolunteers(): Promise<Volunteer[]> {
  const [volRes, availRes, groupMemRes] = await Promise.all([
    supabase.from('volunteers').select('*').order('name'),
    supabase.from('volunteer_availability').select('*'),
    supabase.from('volunteer_group_members').select('id, group_id, volunteer_id'),
  ]);
  if (volRes.error) throw volRes.error;
  if (availRes.error) throw availRes.error;
  if (groupMemRes.error) throw groupMemRes.error;

  const volMap = new Map(volRes.data.map(v => [v.id, v.name]));

  return volRes.data.map(v => {
    const myMem = groupMemRes.data.find(m => m.volunteer_id === v.id);
    const groupId = myMem?.group_id ?? null;
    const groupMembers = groupId
      ? groupMemRes.data
          .filter(m => m.group_id === groupId && m.volunteer_id !== v.id)
          .map(m => ({ id: m.volunteer_id, name: volMap.get(m.volunteer_id) ?? '' }))
      : [];

    return {
      id: v.id,
      name: v.name,
      email: v.email,
      phone: v.phone,
      isAdmin: v.is_admin,
      hasPassword: v.auth_id !== null,
      createdAt: v.created_at,
      availability: availRes.data.filter(a => a.volunteer_id === v.id).map(a => a.slot),
      groupId,
      groupMembers,
    };
  });
}

export function useListVolunteers() {
  return useQuery({ queryKey: KEY, queryFn: fetchVolunteers });
}

export function useGetVolunteer(id: number, options?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async (): Promise<Volunteer> => {
      const all = await fetchVolunteers();
      const vol = all.find(v => v.id === id);
      if (!vol) throw new Error('Vrijwilliger niet gevonden');
      return vol;
    },
    enabled: options?.query?.enabled ?? true,
  });
}

async function setGroupMembers(qc: ReturnType<typeof useQueryClient>, volunteerId: number, memberIds: number[]) {
  const allIds = Array.from(new Set([volunteerId, ...memberIds]));
  if (allIds.length > 5) throw new Error('Een groep mag maximaal 5 vrijwilligers bevatten.');

  // Remove existing group memberships for all involved volunteers
  const existingGroups = await supabase
    .from('volunteer_group_members')
    .select('group_id')
    .in('volunteer_id', allIds);
  if (existingGroups.error) throw existingGroups.error;

  const groupIds = [...new Set(existingGroups.data.map(m => m.group_id))];
  if (groupIds.length > 0) {
    const { error } = await supabase.from('volunteer_group_members').delete().in('group_id', groupIds);
    if (error) throw error;
    await supabase.from('volunteer_groups').delete().in('id', groupIds);
  }

  if (allIds.length <= 1) return; // solo volunteer, no group needed

  // Create new group
  const { data: group, error: groupErr } = await supabase
    .from('volunteer_groups')
    .insert({})
    .select()
    .single();
  if (groupErr) throw groupErr;

  const members = allIds.map(vid => ({ group_id: group.id, volunteer_id: vid }));
  const { error: memErr } = await supabase.from('volunteer_group_members').insert(members);
  if (memErr) throw memErr;
}

export function useCreateVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      data: {
        name: string; email?: string | null; phone?: string | null;
        isAdmin?: boolean; availability?: string[]; groupMemberIds?: number[];
      }
    }) => {
      const d = payload.data;
      const { data: vol, error } = await supabase
        .from('volunteers')
        .insert({ name: d.name, email: d.email ?? null, phone: d.phone ?? null, is_admin: d.isAdmin ?? false })
        .select()
        .single();
      if (error) throw error;

      if (d.availability && d.availability.length > 0) {
        const rows = d.availability.map(slot => ({ volunteer_id: vol.id, slot }));
        await supabase.from('volunteer_availability').insert(rows);
      }

      if (d.groupMemberIds && d.groupMemberIds.length > 0) {
        await setGroupMembers(qc, vol.id, d.groupMemberIds);
      }

      return vol;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      data: {
        name?: string; email?: string | null; phone?: string | null;
        isAdmin?: boolean; availability?: string[]; groupMemberIds?: number[];
      }
    }) => {
      const d = payload.data;
      const update: Record<string, unknown> = {};
      if (d.name !== undefined) update.name = d.name;
      if (d.email !== undefined) update.email = d.email;
      if (d.phone !== undefined) update.phone = d.phone;
      if (d.isAdmin !== undefined) update.is_admin = d.isAdmin;

      const { error } = await supabase.from('volunteers').update(update).eq('id', payload.id);
      if (error) throw error;

      if (d.availability !== undefined) {
        await supabase.from('volunteer_availability').delete().eq('volunteer_id', payload.id);
        if (d.availability.length > 0) {
          const rows = d.availability.map(slot => ({ volunteer_id: payload.id, slot }));
          await supabase.from('volunteer_availability').insert(rows);
        }
      }

      if (d.groupMemberIds !== undefined) {
        await setGroupMembers(qc, payload.id, d.groupMemberIds);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const { error } = await supabase.from('volunteers').delete().eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
