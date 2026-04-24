import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import { AutoScheduleModal } from '@/components/shift/auto-schedule-modal';
import { ShiftFormModal } from '@/components/shift/shift-form-modal';
import { AssignModal } from '@/components/shift/assign-modal';
import { ShiftsGrid } from '@/components/shift/shifts-grid';
import { useListShifts } from '@/hooks/use-shifts';
import type { ShiftWithAssignments } from '@/lib/types';
import {
  Shuffle, Plus, Calendar, Users, Clock,
  ChevronLeft, ChevronRight, CalendarIcon, List as ListIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterMode = 'week' | 'all';

function groupByDate(shifts: ShiftWithAssignments[]): Record<string, ShiftWithAssignments[]> {
  return shifts.reduce((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);
    return acc;
  }, {} as Record<string, ShiftWithAssignments[]>);
}

export default function Beheer() {
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftWithAssignments | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<ShiftWithAssignments | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('week');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const screenParams = filterMode === 'week'
    ? { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') }
    : {};

  const { data: shifts, isLoading } = useListShifts(screenParams);

  const groupedShifts = useMemo(() => {
    if (!shifts) return {};
    return groupByDate(shifts);
  }, [shifts]);

  const handleOpenEdit = (shift: ShiftWithAssignments) => { setEditShift(shift); setIsShiftModalOpen(true); };
  const handleOpenCreate = () => { setEditShift(null); setIsShiftModalOpen(true); };
  const handleOpenAssign = (shift: ShiftWithAssignments) => { setAssignShift(shift); setIsAssignModalOpen(true); };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col gap-10">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Beheer</h1>
            <p className="text-muted-foreground text-lg">Beheer diensten, vrijwilligers en instellingen.</p>
          </div>

          {/* ── Overzichten ── */}
          <section>
            <h2 className="text-xl font-bold mb-4">Overzichten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/seasons">
                <div className="bg-white rounded-2xl border-2 border-border p-6 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <Calendar className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg mb-1">Seizoenen</h3>
                  <p className="text-sm text-muted-foreground">Beheer seizoenen en importeer diensten.</p>
                </div>
              </Link>
              <Link href="/volunteers">
                <div className="bg-white rounded-2xl border-2 border-border p-6 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <Users className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg mb-1">Vrijwilligers</h3>
                  <p className="text-sm text-muted-foreground">Beheer vrijwilligers en beschikbaarheid.</p>
                </div>
              </Link>
              <Link href="/availability-slots">
                <div className="bg-white rounded-2xl border-2 border-border p-6 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <Clock className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg mb-1">Dagdelen</h3>
                  <p className="text-sm text-muted-foreground">Beheer de beschikbare tijdslots voor diensten.</p>
                </div>
              </Link>
            </div>
          </section>

          {/* ── Planning beheren ── */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">Planning beheren</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-muted p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setFilterMode('week')}
                    className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2", filterMode === 'week' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <CalendarIcon className="w-4 h-4" /> Week
                  </button>
                  <button
                    onClick={() => setFilterMode('all')}
                    className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2", filterMode === 'all' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <ListIcon className="w-4 h-4" /> Alle
                  </button>
                </div>
                <button
                  onClick={() => setIsAutoScheduleOpen(true)}
                  className="btn-secondary flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Shuffle className="w-5 h-5" /> Auto Indelen
                </button>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Nieuwe Dienst
                </button>
              </div>
            </div>

            {filterMode === 'week' && (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-border mb-8 shadow-sm">
                <button
                  onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                  className="p-2 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-5 h-5" /> Vorige
                </button>
                <h3 className="text-xl font-bold text-center capitalize">
                  {format(weekStart, 'd MMM', { locale: nl })} – {format(weekEnd, 'd MMMM yyyy', { locale: nl })}
                </h3>
                <button
                  onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                  className="p-2 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
                >
                  Volgende <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="py-20 text-center text-muted-foreground font-bold animate-pulse">Schema laden...</div>
            ) : (
              <ShiftsGrid
                groupedShifts={groupedShifts}
                onEdit={handleOpenEdit}
                onAssign={handleOpenAssign}
                adminMode={true}
              />
            )}
          </section>
        </div>

        <AutoScheduleModal
          isOpen={isAutoScheduleOpen}
          onClose={() => setIsAutoScheduleOpen(false)}
        />
        <ShiftFormModal
          isOpen={isShiftModalOpen}
          onClose={() => { setIsShiftModalOpen(false); setEditShift(null); }}
          editShift={editShift}
          defaultDate={currentDate}
        />
        <AssignModal
          isOpen={isAssignModalOpen}
          onClose={() => { setIsAssignModalOpen(false); setAssignShift(null); }}
          shift={assignShift}
        />
      </AppLayout>
    </AuthGuard>
  );
}
