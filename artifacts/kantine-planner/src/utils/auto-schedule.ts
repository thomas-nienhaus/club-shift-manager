import { supabase } from '@/lib/supabase';

interface VolunteerUnit {
  volunteerIds: number[];
  availability: string[];
  assignmentCount: number;
}

export async function runAutoSchedule(seasonId?: number | null): Promise<{ shiftsScheduled: number; assignmentsMade: number; message: string }> {
  // Load all data
  const [volRes, availRes, groupMemRes, assignRes, shiftRes] = await Promise.all([
    supabase.from('volunteers').select('id'),
    supabase.from('volunteer_availability').select('volunteer_id, slot'),
    supabase.from('volunteer_group_members').select('group_id, volunteer_id'),
    supabase.from('assignments').select('volunteer_id'),
    supabase.from('shifts').select('id, slot, season_id, notes'),
  ]);

  for (const r of [volRes, availRes, groupMemRes, assignRes, shiftRes]) {
    if (r.error) throw r.error;
  }

  // Filter shifts: unassigned, not placeholder, optionally by season
  const existingAssignmentShiftIds = new Set(
    (await supabase.from('assignments').select('shift_id')).data?.map(a => a.shift_id) ?? []
  );

  const PLACEHOLDER = 'Om beurten een elftal';
  const unassignedShifts = shiftRes.data!.filter(s => {
    if (s.notes === PLACEHOLDER) return false;
    if (seasonId !== undefined && seasonId !== null && s.season_id !== seasonId) return false;
    return !existingAssignmentShiftIds.has(s.id);
  });

  if (unassignedShifts.length === 0) {
    return { shiftsScheduled: 0, assignmentsMade: 0, message: 'Geen lege diensten gevonden om in te delen.' };
  }

  // Build availability map
  const availMap = new Map<number, string[]>();
  for (const a of availRes.data!) {
    if (!availMap.has(a.volunteer_id)) availMap.set(a.volunteer_id, []);
    availMap.get(a.volunteer_id)!.push(a.slot);
  }

  // Build assignment count map
  const countMap = new Map<number, number>();
  for (const a of assignRes.data!) {
    countMap.set(a.volunteer_id, (countMap.get(a.volunteer_id) ?? 0) + 1);
  }

  // Build volunteer units (groups count as one unit)
  const groupMap = new Map<number, number[]>(); // group_id → volunteer_ids
  for (const m of groupMemRes.data!) {
    if (!groupMap.has(m.group_id)) groupMap.set(m.group_id, []);
    groupMap.get(m.group_id)!.push(m.volunteer_id);
  }

  const groupedVolIds = new Set(groupMemRes.data!.map(m => m.volunteer_id));
  const processedGroups = new Set<number>();
  const units: VolunteerUnit[] = [];

  for (const [groupId, memberIds] of groupMap) {
    if (processedGroups.has(groupId)) continue;
    processedGroups.add(groupId);
    // Group availability = intersection of all member availabilities
    const memberAvails = memberIds.map(id => availMap.get(id) ?? []);
    const intersection = memberAvails.reduce((acc, cur) => acc.filter(s => cur.includes(s)));
    const totalCount = memberIds.reduce((sum, id) => sum + (countMap.get(id) ?? 0), 0);
    units.push({ volunteerIds: memberIds, availability: intersection, assignmentCount: totalCount });
  }

  for (const vol of volRes.data!) {
    if (groupedVolIds.has(vol.id)) continue;
    units.push({
      volunteerIds: [vol.id],
      availability: availMap.get(vol.id) ?? [],
      assignmentCount: countMap.get(vol.id) ?? 0,
    });
  }

  // Group unassigned shifts by slot
  const slotShifts = new Map<string, typeof unassignedShifts>();
  for (const s of unassignedShifts) {
    if (!slotShifts.has(s.slot)) slotShifts.set(s.slot, []);
    slotShifts.get(s.slot)!.push(s);
  }

  // Round-robin assignment per slot
  const newAssignments: { shift_id: number; volunteer_id: number }[] = [];
  let scheduledShifts = 0;

  for (const [slot, shifts] of slotShifts) {
    const eligible = units.filter(u => u.availability.length === 0 || u.availability.includes(slot));
    if (eligible.length === 0) continue;

    let idx = 0;
    for (const shift of shifts) {
      const sorted = [...eligible].sort((a, b) => a.assignmentCount - b.assignmentCount);
      const unit = sorted[idx % sorted.length];
      idx++;

      for (const vid of unit.volunteerIds) {
        newAssignments.push({ shift_id: shift.id, volunteer_id: vid });
        unit.assignmentCount++;
        countMap.set(vid, (countMap.get(vid) ?? 0) + 1);
      }
      scheduledShifts++;
    }
  }

  if (newAssignments.length > 0) {
    const { error } = await supabase.from('assignments').upsert(newAssignments, { onConflict: 'shift_id,volunteer_id', ignoreDuplicates: true });
    if (error) throw error;
  }

  return {
    shiftsScheduled: scheduledShifts,
    assignmentsMade: newAssignments.length,
    message: `${scheduledShifts} diensten ingedeeld, ${newAssignments.length} toewijzingen aangemaakt.`,
  };
}
