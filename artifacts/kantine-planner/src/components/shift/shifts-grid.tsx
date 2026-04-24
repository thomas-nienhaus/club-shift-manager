import React from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { ShiftWithAssignments } from '@/lib/types';
import { ShiftCard } from './shift-card';

interface ShiftsGridProps {
  groupedShifts: Record<string, ShiftWithAssignments[]>;
  onEdit: (s: ShiftWithAssignments) => void;
  onAssign: (s: ShiftWithAssignments) => void;
  onOffer?: (s: ShiftWithAssignments) => void;
  myVolunteerId?: number | null;
  openOfferShiftIds?: Set<number>;
  adminMode?: boolean;
}

export function ShiftsGrid({
  groupedShifts,
  onEdit,
  onAssign,
  onOffer,
  myVolunteerId,
  openOfferShiftIds,
  adminMode = false,
}: ShiftsGridProps) {
  const sortedDates = Object.keys(groupedShifts).sort();
  if (sortedDates.length === 0) return (
    <p className="text-muted-foreground text-center py-10 italic">Geen diensten gevonden voor deze periode.</p>
  );

  return (
    <div className="space-y-10">
      {sortedDates.map(date => {
        const dayShifts = groupedShifts[date];
        const parsedDate = parseISO(date);
        return (
          <div key={date} className="print-break-inside-avoid">
            <h2 className="text-2xl font-display font-bold mb-4 pb-2 border-b-2 border-border capitalize flex items-center gap-3">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-lg">
                {format(parsedDate, 'EEEE', { locale: nl })}
              </span>
              {format(parsedDate, 'd MMMM yyyy', { locale: nl })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {dayShifts.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={onEdit}
                  onAssign={onAssign}
                  onOffer={onOffer}
                  myVolunteerId={myVolunteerId}
                  hasOpenOffer={openOfferShiftIds?.has(shift.id) ?? false}
                  adminMode={adminMode}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
