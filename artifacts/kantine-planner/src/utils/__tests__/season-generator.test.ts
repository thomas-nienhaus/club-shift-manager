import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const supabase = { from: vi.fn() };
  return { supabase };
});

import { supabase } from '@/lib/supabase';
import { generateSeasonShifts } from '../season-generator';

type DbResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function ok<T>(data: T): { data: T; error: null } {
  return { data, error: null };
}

function err(message: string): { data: null; error: { message: string } } {
  return { data: null, error: { message } };
}

let capturedInserts: unknown[] = [];

function setupMocks(responses: DbResult<unknown>[]) {
  capturedInserts = [];
  let callIndex = 0;

  vi.mocked(supabase.from).mockImplementation(() => {
    const result = responses[callIndex];
    if (callIndex < responses.length) callIndex++;

    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'single'];
    for (const m of methods) {
      chain[m] = () => chain;
    }
    chain.insert = (data: unknown) => {
      capturedInserts = data as unknown[];
      return chain;
    };
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    return chain as ReturnType<typeof supabase.from>;
  });
}

// 2024-09-07 is a Saturday (day 6)
const SEASON = { id: 1, name: 'Test 2024', start_date: '2024-09-07', end_date: '2024-09-07' };
const SAT_MORNING = { key: 'saturday_morning', is_active: true, is_home_game_slot: false };
const SAT_EXTRA = { key: 'saturday_extra', is_active: true, is_home_game_slot: true };

describe('generateSeasonShifts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('genereert een dienst per actieve slot op de juiste weekdag', async () => {
    setupMocks([ok(SEASON), ok([SAT_MORNING]), ok([]), ok(null)]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(1);
    expect(result.message).toContain('1 diensten');
    expect(capturedInserts).toEqual([
      { season_id: 1, date: '2024-09-07', slot: 'saturday_morning' },
    ]);
  });

  it('genereert meerdere slots op dezelfde dag als beide op die weekdag staan', async () => {
    const satAfternoon = { key: 'saturday_afternoon', is_active: true, is_home_game_slot: false };
    setupMocks([ok(SEASON), ok([SAT_MORNING, satAfternoon]), ok([]), ok(null)]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(2);
  });

  it('genereert diensten voor alle passende weekdagen in het seizoen', async () => {
    // 2024-09-07 t/m 2024-09-14 → twee zaterdagen (7 en 14 sept)
    const season = { ...SEASON, end_date: '2024-09-14' };
    setupMocks([ok(season), ok([SAT_MORNING]), ok([]), ok(null)]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(2);
  });

  it('slaat is_home_game_slot diensten over bij reguliere datums', async () => {
    // SAT_EXTRA heeft is_home_game_slot=true → niet toevoegen op elke zaterdag
    setupMocks([ok(SEASON), ok([SAT_EXTRA]), ok([])]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(0);
    expect(result.message).toMatch(/Geen actieve diensten/);
    // insert mag niet worden aangeroepen
    expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(3);
  });

  it('voegt extra slot toe op thuiswedstrijddatums', async () => {
    setupMocks([
      ok(SEASON),
      ok([SAT_MORNING]),
      ok([{ date: '2024-09-07', extra_slot: 'saturday_extra' }]),
      ok(null),
    ]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(2);
    expect(capturedInserts).toContainEqual({
      season_id: 1, date: '2024-09-07', slot: 'saturday_extra',
    });
  });

  it('voegt extra slot toe op thuiswedstrijddatum zelfs als er geen reguliere slots zijn', async () => {
    // Alle slots zijn home_game_slot → geen reguliere shifts, maar thuiswedstrijddatum voegt wel extra toe
    setupMocks([
      ok(SEASON),
      ok([SAT_EXTRA]),
      ok([{ date: '2024-09-07', extra_slot: 'saturday_extra' }]),
      ok(null),
    ]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(1);
    expect(capturedInserts).toEqual([
      { season_id: 1, date: '2024-09-07', slot: 'saturday_extra' },
    ]);
  });

  it('genereert geen diensten als datum niet overeenkomt met weekdag van slot', async () => {
    // 2024-09-06 is een vrijdag — saturday_morning past niet
    const fridaySeason = { ...SEASON, start_date: '2024-09-06', end_date: '2024-09-06' };
    setupMocks([ok(fridaySeason), ok([SAT_MORNING]), ok([])]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(0);
    expect(result.message).toMatch(/Geen actieve diensten/);
  });

  it('geeft melding terug als er geen actieve slots zijn', async () => {
    setupMocks([ok(SEASON), ok([]), ok([])]);

    const result = await generateSeasonShifts(1);

    expect(result.shiftsCreated).toBe(0);
    expect(result.message).toContain('Geen actieve diensten');
  });

  it('gooit fout als seizoen niet opgehaald kan worden', async () => {
    setupMocks([err('season not found'), ok([SAT_MORNING])]);

    await expect(generateSeasonShifts(1)).rejects.toMatchObject({
      message: 'season not found',
    });
  });

  it('gooit fout als beschikbaarheidslots niet opgehaald kunnen worden', async () => {
    setupMocks([ok(SEASON), err('slots error')]);

    await expect(generateSeasonShifts(1)).rejects.toMatchObject({
      message: 'slots error',
    });
  });

  it('gooit fout als de insert mislukt', async () => {
    setupMocks([
      ok(SEASON),
      ok([SAT_MORNING]),
      ok([]),
      err('insert failed'),
    ]);

    await expect(generateSeasonShifts(1)).rejects.toMatchObject({
      message: 'insert failed',
    });
  });
});
