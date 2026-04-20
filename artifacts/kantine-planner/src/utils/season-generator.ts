import { supabase } from '@/lib/supabase';

const DAY_PREFIXES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function slotDayIndex(slotKey: string): number | undefined {
  const prefix = slotKey.split('_')[0].toLowerCase();
  return DAY_PREFIXES[prefix];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function generateSeasonShifts(seasonId: number): Promise<{ shiftsCreated: number; message: string }> {
  const [seasonRes, slotsRes] = await Promise.all([
    supabase.from('seasons').select('*').eq('id', seasonId).single(),
    supabase.from('availability_slots').select('*').eq('is_active', true),
  ]);
  if (seasonRes.error) throw seasonRes.error;
  if (slotsRes.error) throw slotsRes.error;

  const season = seasonRes.data;
  const slots = slotsRes.data;

  // Build day-of-week → slot keys map
  const daySlots = new Map<number, string[]>();
  for (const slot of slots) {
    const dayIdx = slotDayIndex(slot.key);
    if (dayIdx === undefined) continue;
    if (!daySlots.has(dayIdx)) daySlots.set(dayIdx, []);
    daySlots.get(dayIdx)!.push(slot.key);
  }

  // Iterate date range
  const shifts: { season_id: number; date: string; slot: string }[] = [];
  let current = new Date(season.start_date + 'T00:00:00');
  const end = new Date(season.end_date + 'T00:00:00');

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = toISODate(current);
    const slotKeys = daySlots.get(dayOfWeek) ?? [];
    for (const slotKey of slotKeys) {
      shifts.push({ season_id: seasonId, date: dateStr, slot: slotKey });
    }
    current = addDays(current, 1);
  }

  if (shifts.length === 0) {
    return { shiftsCreated: 0, message: 'Geen actieve dagdelen gevonden voor dit seizoen.' };
  }

  const { error } = await supabase
    .from('shifts')
    .upsert(shifts, { onConflict: 'season_id,date,slot', ignoreDuplicates: true });
  if (error) throw error;

  return { shiftsCreated: shifts.length, message: `${shifts.length} diensten aangemaakt.` };
}
