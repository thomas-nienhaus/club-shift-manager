import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcalDate(date: string, time: string | null): string {
  if (!time) return date.replace(/-/g, '');
  const [h, m] = time.split(':');
  return `${date.replace(/-/g, '')}T${h}${m}00`;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey, content-type',
      },
    });
  }

  const url = new URL(req.url);
  const volunteerId = Number(url.searchParams.get('volunteerId'));
  const token = url.searchParams.get('token');

  if (!volunteerId || !token) {
    return new Response('Bad Request', { status: 400 });
  }

  // Service role client — bypasses RLS so we can look up by auth_id
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify token: token must equal auth_id for this volunteer
  const { data: volunteer, error: volError } = await supabase
    .from('volunteers')
    .select('id, name')
    .eq('id', volunteerId)
    .eq('auth_id', token)
    .single();

  if (volError || !volunteer) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [assignRes, slotsRes] = await Promise.all([
    supabase
      .from('assignments')
      .select('shifts(id, date, slot, start_time, end_time, notes)')
      .eq('volunteer_id', volunteerId),
    supabase.from('availability_slots').select('*'),
  ]);

  if (assignRes.error || slotsRes.error) {
    return new Response('Internal Server Error', { status: 500 });
  }

  const slotMap = new Map((slotsRes.data ?? []).map((s: any) => [s.key, s]));
  const volName: string = volunteer.name;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kantine Planner//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Kantine Diensten ${volName}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const a of (assignRes.data ?? [])) {
    const shift = (a as any).shifts;
    if (!shift) continue;

    const slotDef = slotMap.get(shift.slot);
    const startTime: string | null = shift.start_time ?? slotDef?.start_time ?? null;
    const endTime: string | null = shift.end_time ?? slotDef?.end_time ?? null;
    const allDay = !startTime && !endTime;

    const uid = `shift-${shift.id}-vol-${volunteerId}@kantine-planner`;
    const summary: string = slotDef?.label ?? shift.slot;
    const description: string = shift.notes ? escapeIcal(shift.notes) : '';

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

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
