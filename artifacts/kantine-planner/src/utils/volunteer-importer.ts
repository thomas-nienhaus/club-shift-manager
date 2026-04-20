import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => normalize(h).includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

export async function importVolunteersFromExcel(file: File, slotLabels: { key: string; label: string }[]): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ['Bestand bevat geen data.'] };

  const headers = rows[0].map(String);
  const nameCol = findCol(headers, 'naam', 'name', 'voornaam');
  const emailCol = findCol(headers, 'email', 'e-mail');
  const phoneCol = findCol(headers, 'telefoon', 'phone', 'tel', 'mobiel');
  const availCol = findCol(headers, 'beschikbaarheid', 'availability', 'dagdeel');

  if (nameCol < 0) return { imported: 0, skipped: 0, errors: ['Geen "Naam" kolom gevonden.'] };

  // Fetch existing volunteers to check dedup
  const { data: existing } = await supabase.from('volunteers').select('name, email');
  const existingSet = new Set(
    (existing ?? []).map(v => `${normalize(v.name)}|${normalize(v.email ?? '')}`)
  );

  // Label → slot key map
  const labelToKey = new Map<string, string>();
  for (const s of slotLabels) {
    labelToKey.set(normalize(s.label), s.key);
    labelToKey.set(normalize(s.key), s.key);
  }

  function parseAvailability(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,;|]/).map(s => {
      const k = labelToKey.get(normalize(s.trim()));
      return k ?? null;
    }).filter(Boolean) as string[];
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameCol] ?? '').trim();
    if (!name) continue;

    const email = emailCol >= 0 ? String(row[emailCol] ?? '').trim() || null : null;
    const phone = phoneCol >= 0 ? String(row[phoneCol] ?? '').trim() || null : null;
    const availRaw = availCol >= 0 ? String(row[availCol] ?? '') : '';
    const availability = parseAvailability(availRaw);

    const key = `${normalize(name)}|${normalize(email ?? '')}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    try {
      const { data: vol, error } = await supabase
        .from('volunteers')
        .insert({ name, email, phone })
        .select()
        .single();
      if (error) throw error;

      if (availability.length > 0) {
        await supabase.from('volunteer_availability').insert(
          availability.map(slot => ({ volunteer_id: vol.id, slot }))
        );
      }

      existingSet.add(key);
      imported++;
    } catch (err: any) {
      errors.push(`Rij ${i + 1} (${name}): ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}
