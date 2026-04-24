import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the module under test
vi.mock('@/lib/supabase', () => {
  const makeChain = (result: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'in', 'order', 'single', 'upsert', 'insert', 'update', 'delete'];
    for (const m of methods) {
      chain[m] = () => chain;
    }
    // Make the chain thenable so `await chain` resolves to result
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  };

  const supabase = { from: vi.fn() };
  return { supabase };
});

import { supabase } from '@/lib/supabase';
import { runAutoSchedule } from '../auto-schedule';

type SupabaseResult<T> = { data: T; error: null };

function ok<T>(data: T): SupabaseResult<T> {
  return { data, error: null };
}

function setupMocks({
  volunteers = [{ id: 1 }],
  availability = [{ volunteer_id: 1, slot: 'saturday_morning' }],
  groupMembers = [] as { group_id: number; volunteer_id: number }[],
  assignments = [] as { volunteer_id: number }[],
  shifts = [{ id: 10, slot: 'saturday_morning', season_id: 1, notes: null }],
  assignedShiftIds = [] as { shift_id: number }[],
} = {}) {
  let callIndex = 0;
  const responses = [
    ok(volunteers),
    ok(availability),
    ok(groupMembers),
    ok(assignments),
    ok(shifts),
  ];

  vi.mocked(supabase.from).mockImplementation(() => {
    const result = responses[callIndex] ?? ok(assignedShiftIds);
    if (callIndex < responses.length) callIndex++;

    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'in', 'order', 'single', 'upsert'];
    for (const m of methods) {
      chain[m] = () => chain;
    }
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    return chain as ReturnType<typeof supabase.from>;
  });
}

describe('runAutoSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('geeft melding terug als er geen onbezette diensten zijn', async () => {
    setupMocks({ assignedShiftIds: [{ shift_id: 10 }] });
    const result = await runAutoSchedule();
    expect(result.shiftsScheduled).toBe(0);
    expect(result.message).toMatch(/Geen lege diensten/);
  });

  it('slaat placeholder-diensten over', async () => {
    setupMocks({
      shifts: [{ id: 10, slot: 'saturday_morning', season_id: 1, notes: 'Om beurten een elftal' }],
    });
    const result = await runAutoSchedule();
    expect(result.shiftsScheduled).toBe(0);
  });

  it('filtert op seizoen als seasonId opgegeven is', async () => {
    setupMocks({
      shifts: [
        { id: 10, slot: 'saturday_morning', season_id: 1, notes: null },
        { id: 11, slot: 'saturday_morning', season_id: 2, notes: null },
      ],
    });
    // season 2 heeft geen assignments → beide onbezet, maar we filteren op season 1
    const result = await runAutoSchedule(1);
    expect(result.shiftsScheduled).toBe(1);
  });

  it('deelt een vrijwilliger in op een beschikbaar dagdeel', async () => {
    setupMocks();
    const result = await runAutoSchedule();
    expect(result.shiftsScheduled).toBe(1);
    expect(result.assignmentsMade).toBe(1);
  });

  it('slaat vrijwilliger over als die niet beschikbaar is voor het dagdeel', async () => {
    setupMocks({
      availability: [{ volunteer_id: 1, slot: 'wednesday_evening' }],
      shifts: [{ id: 10, slot: 'saturday_morning', season_id: 1, notes: null }],
    });
    const result = await runAutoSchedule();
    // geen beschikbare vrijwilligers voor dit slot
    expect(result.shiftsScheduled).toBe(0);
    expect(result.assignmentsMade).toBe(0);
  });

  it('verdeelt diensten round-robin over twee vrijwilligers', async () => {
    setupMocks({
      volunteers: [{ id: 1 }, { id: 2 }],
      availability: [
        { volunteer_id: 1, slot: 'saturday_morning' },
        { volunteer_id: 2, slot: 'saturday_morning' },
      ],
      shifts: [
        { id: 10, slot: 'saturday_morning', season_id: 1, notes: null },
        { id: 11, slot: 'saturday_morning', season_id: 1, notes: null },
      ],
    });
    const result = await runAutoSchedule();
    expect(result.shiftsScheduled).toBe(2);
    expect(result.assignmentsMade).toBe(2);
  });

  it('wijst beide groepsleden toe bij een groepsdienst', async () => {
    setupMocks({
      volunteers: [{ id: 1 }, { id: 2 }],
      availability: [
        { volunteer_id: 1, slot: 'saturday_morning' },
        { volunteer_id: 2, slot: 'saturday_morning' },
      ],
      groupMembers: [
        { group_id: 1, volunteer_id: 1 },
        { group_id: 1, volunteer_id: 2 },
      ],
    });
    const result = await runAutoSchedule();
    // 1 dienst, 2 groepsleden → 2 toewijzingen
    expect(result.shiftsScheduled).toBe(1);
    expect(result.assignmentsMade).toBe(2);
  });

  it('berekent groepsbeschikbaarheid als doorsnede van ledenslots', async () => {
    // Lid 1: alleen zaterdag, lid 2: zaterdag + woensdag
    // Groep is beschikbaar voor zaterdag (doorsnede)
    setupMocks({
      volunteers: [{ id: 1 }, { id: 2 }],
      availability: [
        { volunteer_id: 1, slot: 'saturday_morning' },
        { volunteer_id: 2, slot: 'saturday_morning' },
        { volunteer_id: 2, slot: 'wednesday_evening' },
      ],
      groupMembers: [
        { group_id: 1, volunteer_id: 1 },
        { group_id: 1, volunteer_id: 2 },
      ],
      shifts: [
        { id: 10, slot: 'wednesday_evening', season_id: 1, notes: null },
      ],
    });
    const result = await runAutoSchedule();
    // Groep niet beschikbaar op woensdag (lid 1 staat er niet in)
    expect(result.shiftsScheduled).toBe(0);
  });
});
