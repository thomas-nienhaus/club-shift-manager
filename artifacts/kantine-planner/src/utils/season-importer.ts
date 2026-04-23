import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

const PLACEHOLDER_NOTE = 'Om beurten een elftal';

const DUTCH_SLOT_MAP: Record<string, string> = {
  'woensdagavond': 'wednesday_evening',
  'donderdagavond': 'thursday_evening',
  'zaterdagochtend': 'saturday_morning',
  'zaterdagmiddag': 'saturday_afternoon',
  'zondagochtend': 'sunday_morning',
  'zondagmiddag': 'sunday_afternoon',
  'vrijdagavond': 'friday_evening',
};

const DAY_TO_DEFAULT_SLOTS: Record<number, string[]> = {
  0: ['sunday_morning', 'sunday_afternoon'],  // Sunday
  3: ['wednesday_evening'],
  4: ['thursday_evening'],
  5: ['friday_evening'],
  6: ['saturday_morning', 'saturday_afternoon'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').trim();
}

function parseDate(raw: unknown): string | null {
  if (typeof raw === 'number') {
    // XLSX serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof raw === 'string') {
    // Try DD-MM-YYYY or DD/MM/YYYY
    const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  }
  return null;
}

function parseSlotKey(raw: string): string | null {
  const n = normalize(raw);
  return DUTCH_SLOT_MAP[n] ?? (Object.values(DUTCH_SLOT_MAP).includes(n) ? n : null);
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

export async function importSeasonSchedule(seasonId: number, file: File): Promise<{ shiftsCreated: number; datesProcessed: number; skipped: number; message: string }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];

  if (rows.length < 2) throw new Error('Bestand bevat geen data.');

  const headers = rows[0].map(h => String(h));
  const dateCol = headers.findIndex(h => /datum|date/i.test(h));
  const slotCol = headers.findIndex(h => /dagdeel|slot|tijdslot/i.test(h));
  const homeCol = headers.findIndex(h => /thuiswedstrijd|elftalthuis|1eelftal|eersteelftal/i.test(normalize(h)));

  const shiftsToInsert: { season_id: number; date: string; slot: string; notes?: string }[] = [];
  let datesProcessed = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawDate = dateCol >= 0 ? row[dateCol] : row[0];
    const dateStr = parseDate(rawDate);
    if (!dateStr) { skipped++; continue; }

    datesProcessed++;
    const dow = dayOfWeek(dateStr);
    const isHome = homeCol >= 0 && /ja|yes|1|true/i.test(String(row[homeCol] ?? '').trim());

    if (slotCol >= 0 && String(row[slotCol]).trim()) {
      const slotKey = parseSlotKey(String(row[slotCol]));
      if (slotKey) {
        shiftsToInsert.push({ season_id: seasonId, date: dateStr, slot: slotKey });
      }
    } else {
      const defaultSlots = DAY_TO_DEFAULT_SLOTS[dow] ?? [];
      for (const slotKey of defaultSlots) {
        const isAfternoon = slotKey.includes('afternoon') || slotKey.includes('middag');
        const notes = isAfternoon && !isHome ? PLACEHOLDER_NOTE : undefined;
        shiftsToInsert.push({ season_id: seasonId, date: dateStr, slot: slotKey, ...(notes ? { notes } : {}) });
      }
    }
  }

  if (shiftsToInsert.length === 0) {
    return { shiftsCreated: 0, datesProcessed, skipped, message: 'Geen diensten gevonden in het bestand.' };
  }

  const { error } = await supabase
    .from('shifts')
    .upsert(shiftsToInsert, { onConflict: 'season_id,date,slot', ignoreDuplicates: true });
  if (error) throw error;

  return {
    shiftsCreated: shiftsToInsert.length,
    datesProcessed,
    skipped,
    message: `${shiftsToInsert.length} diensten aangemaakt voor ${datesProcessed} datums.`,
  };
}
