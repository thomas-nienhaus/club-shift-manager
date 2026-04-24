import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AvailabilitySlot } from '@/lib/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Prevent Supabase init from throwing when env vars are absent in tests
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/hooks/use-slots');
vi.mock('@/hooks/use-shifts');
vi.mock('@/hooks/use-toast');
vi.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
}));

import { useSlots } from '@/hooks/use-slots';
import { useCreateShift, useUpdateShift } from '@/hooks/use-shifts';
import { useToast } from '@/hooks/use-toast';
import { ShiftFormModal } from '../shift-form-modal';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSlot(key: string, label: string, isActive = true): AvailabilitySlot {
  return { id: 1, key, label, sortOrder: 1, isActive, startTime: null, endTime: null, createdAt: '' };
}

const mockMutate = vi.fn();

function setupMocks(activeSlots: AvailabilitySlot[], allSlots: AvailabilitySlot[]) {
  vi.mocked(useSlots).mockReturnValue({
    slots: activeSlots,
    allSlots,
    getLabel: (key: string) => allSlots.find(s => s.key === key)?.label ?? key,
    getSortOrder: () => 0,
    isLoading: false,
  });
  vi.mocked(useCreateShift).mockReturnValue({ mutate: mockMutate, isPending: false } as any);
  vi.mocked(useUpdateShift).mockReturnValue({ mutate: mockMutate, isPending: false } as any);
  vi.mocked(useToast).mockReturnValue({ toast: vi.fn() } as any);
}

// Render the modal open on a specific date (ISO yyyy-MM-dd)
function renderModal(activeSlots: AvailabilitySlot[], allSlots: AvailabilitySlot[], date?: Date) {
  setupMocks(activeSlots, allSlots);
  return render(
    <ShiftFormModal
      isOpen
      onClose={vi.fn()}
      defaultDate={date ?? new Date('2025-01-17')} // Friday
    />
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ShiftFormModal — slot status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toont een dropdown als er een actief dagdeel is voor de geselecteerde dag', () => {
    const friday = makeSlot('friday_evening', 'Vrijdagavond');
    renderModal([friday], [friday]);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Vrijdagavond')).toBeInTheDocument();
  });

  it('toont alleen dagdelen van de geselecteerde dag, niet van andere dagen', () => {
    const friday = makeSlot('friday_evening', 'Vrijdagavond');
    const wednesday = makeSlot('wednesday_evening', 'Woensdagavond');
    renderModal([friday, wednesday], [friday, wednesday]);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Vrijdagavond');
  });

  it('toont waarschuwing "niet actief" als het dagdeel bestaat maar inactief is', () => {
    const inactiveSlot = makeSlot('friday_evening', 'Vrijdagavond', false);
    renderModal([], [inactiveSlot]);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/niet actief/i)).toBeInTheDocument();
  });

  it('toont waarschuwing "geen dagdeel aangemaakt" als er helemaal geen dagdeel is', () => {
    renderModal([], []);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/Geen dagdeel aangemaakt/i)).toBeInTheDocument();
  });
});

describe('ShiftFormModal — opslaan-knop', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is ingeschakeld als er een actief dagdeel beschikbaar is', () => {
    const friday = makeSlot('friday_evening', 'Vrijdagavond');
    renderModal([friday], [friday]);

    expect(screen.getByRole('button', { name: /opslaan/i })).not.toBeDisabled();
  });

  it('is uitgeschakeld als het dagdeel inactief is', () => {
    const inactiveSlot = makeSlot('friday_evening', 'Vrijdagavond', false);
    renderModal([], [inactiveSlot]);

    expect(screen.getByRole('button', { name: /opslaan/i })).toBeDisabled();
  });

  it('is uitgeschakeld als er geen dagdeel bestaat voor de dag', () => {
    renderModal([], []);

    expect(screen.getByRole('button', { name: /opslaan/i })).toBeDisabled();
  });
});

describe('ShiftFormModal — datum wisselen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toont de juiste dagdelen na het wisselen van datum', async () => {
    const user = userEvent.setup();
    const friday = makeSlot('friday_evening', 'Vrijdagavond');
    const saturday = makeSlot('saturday_morning', 'Zaterdagochtend');

    setupMocks([friday, saturday], [friday, saturday]);

    const { rerender } = render(
      <ShiftFormModal
        isOpen
        onClose={vi.fn()}
        defaultDate={new Date('2025-01-17')} // Friday
      />
    );

    // Vrijdag — alleen vrijdagavond zichtbaar
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Vrijdagavond')).toBeInTheDocument();

    // Wissel naar zaterdag (2025-01-18)
    const dateInput = screen.getByDisplayValue('2025-01-17');
    await user.clear(dateInput);
    await user.type(dateInput, '2025-01-18');

    // Na re-render met zaterdag → zaterdagochtend zichtbaar
    rerender(
      <ShiftFormModal
        isOpen
        onClose={vi.fn()}
        defaultDate={new Date('2025-01-18')} // Saturday
      />
    );

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Zaterdagochtend')).toBeInTheDocument();
  });
});
