import { supabase } from '@/lib/supabase';

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcalDate(date: string, time: string | null): string {
  // date is YYYY-MM-DD, time is HH:MM or null
  if (!time) return date.replace(/-/g, '');
  const [h, m] = time.split(':');
  return `${date.replace(/-/g, '')}T${h}${m}00`;
}

export async function generateIcal(volunteerId: number): Promise<string> {
  const [assignRes, slotsRes, volRes] = await Promise.all([
    supabase
      .from('assignments')
      .select('shifts(id, date, slot, start_time, end_time, notes)')
      .eq('volunteer_id', volunteerId),
    supabase.from('availability_slots').select('*'),
    supabase.from('volunteers').select('name').eq('id', volunteerId).single(),
  ]);

  if (assignRes.error) throw assignRes.error;
  if (slotsRes.error) throw slotsRes.error;

  const slotMap = new Map(slotsRes.data.map(s => [s.key, s]));
  const volName = volRes.data?.name ?? 'Vrijwilliger';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kantine Planner//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Kantine Diensten ${volName}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
  ];

  for (const a of assignRes.data) {
    const shift = (a as any).shifts;
    if (!shift) continue;

    const slotDef = slotMap.get(shift.slot);
    const startTime = shift.start_time ?? slotDef?.start_time ?? null;
    const endTime = shift.end_time ?? slotDef?.end_time ?? null;
    const allDay = !startTime && !endTime;

    const uid = `shift-${shift.id}-vol-${volunteerId}@kantine-planner`;
    const summary = slotDef?.label ?? shift.slot;
    const description = shift.notes ? escapeIcal(shift.notes) : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeIcal(summary)}`);
    if (description) lines.push(`DESCRIPTION:${description}`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${shift.date.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${shift.date.replace(/-/g, '')}`);
    } else {
      lines.push(`DTSTART;TZID=Europe/Amsterdam:${toIcalDate(shift.date, startTime)}`);
      lines.push(`DTEND;TZID=Europe/Amsterdam:${toIcalDate(shift.date, endTime)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcal(icalContent: string, filename: string) {
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
