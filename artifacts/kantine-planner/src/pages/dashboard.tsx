import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard, useAuth } from '@/contexts/auth-context';
import { useListShifts } from '@/hooks/use-shifts';
import { useListSeasons } from '@/hooks/use-seasons';
import { useListVolunteers } from '@/hooks/use-volunteers';
import type { ShiftWithAssignments } from '@/lib/types';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Printer, Calendar as CalendarIcon,
  List as ListIcon, Shuffle, X, AlertCircle, Settings2, User, Download,
} from 'lucide-react';
import { ShiftCard } from '@/components/shift/shift-card';
import { ShiftFormModal } from '@/components/shift/shift-form-modal';
import { AssignModal } from '@/components/shift/assign-modal';
import { SLOT_ORDER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useSlots } from '@/hooks/use-slots';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { runAutoSchedule } from '@/utils/auto-schedule';
import { generateIcal, downloadIcal } from '@/utils/ical';

type FilterMode = 'week' | 'all';

interface PrintFilters {
  slotFilter: string[];
  volunteerId: number | null;
  volunteerName: string | null;
}

// ─── Auto Schedule Modal ──────────────────────────────────────────────────────
function AutoScheduleModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: seasons } = useListSeasons();

  const { mutate: doAutoSchedule, isPending } = useMutation({
    mutationFn: ({ seasonId }: { seasonId: number | null }) =>
      runAutoSchedule(seasonId ?? undefined),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Automatisch ingedeeld', description: result.message });
      onClose();
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Er is iets misgegaan bij het automatisch indelen.', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    doAutoSchedule({ seasonId: selectedSeasonId });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Shuffle className="w-5 h-5 text-primary" /></div>
            <h2 className="text-xl font-display font-bold">Automatisch Indelen</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Hoe werkt het?</p>
              <ul className="space-y-1 text-amber-700">
                <li>• Alleen lege diensten (zonder vrijwilligers) worden gevuld</li>
                <li>• Vrijwilligers worden ingedeeld op hun beschikbare dagdelen</li>
                <li>• Groepen worden samen ingedeeld</li>
                <li>• Elke vrijwilliger krijgt ongeveer evenveel diensten</li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Seizoen (optioneel)</label>
            <select
              value={selectedSeasonId ?? ''}
              onChange={e => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Alle diensten</option>
              {seasons?.map(season => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">Laat leeg om alle diensten in het systeem te verwerken.</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors">Annuleren</button>
          <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Shuffle className="w-4 h-4 animate-spin" />Bezig...</> : <><Shuffle className="w-4 h-4" />Indelen</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Print Options Modal ──────────────────────────────────────────────────────
interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (filters: PrintFilters) => void;
}

function PrintOptionsModal({ isOpen, onClose, onPrint }: PrintOptionsModalProps) {
  const [slotFilter, setSlotFilter] = useState<string[] | null>(null);
  const [volunteerId, setVolunteerId] = useState<number | null>(null);
  const { data: volunteers } = useListVolunteers();
  const { slots } = useSlots();

  const allSlotKeys = slots.map(s => s.key);
  const allSelected = slotFilter === null;

  const isSlotChecked = (key: string) => slotFilter === null || slotFilter.includes(key);

  const toggleSlot = (key: string) => {
    setSlotFilter(prev => {
      const effective = prev ?? allSlotKeys;
      const next = effective.includes(key) ? effective.filter(k => k !== key) : [...effective, key];
      return next.length === allSlotKeys.length ? null : next;
    });
  };

  const handlePrint = () => {
    const vol = volunteers?.find(v => v.id === volunteerId);
    onPrint({ slotFilter: slotFilter ?? [], volunteerId, volunteerName: vol?.name ?? null });
    onClose();
  };

  const reset = () => { setSlotFilter(null); setVolunteerId(null); };

  const noneSelected = slotFilter !== null && slotFilter.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Settings2 className="w-5 h-5 text-primary" /></div>
            <h2 className="text-xl font-display font-bold">Afdruk Instellingen</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {slots.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold uppercase tracking-wide text-muted-foreground">Dagdelen</label>
                <button
                  onClick={() => setSlotFilter(allSelected ? [] : null)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {allSelected ? 'Niets selecteren' : 'Alles selecteren'}
                </button>
              </div>
              <div className="space-y-1.5">
                {slots.map(slot => (
                  <label
                    key={slot.key}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      isSlotChecked(slot.key)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/20 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSlotChecked(slot.key)}
                      onChange={() => toggleSlot(slot.key)}
                      className="w-4 h-4 rounded accent-primary flex-shrink-0"
                    />
                    <span className={cn("text-sm font-semibold", isSlotChecked(slot.key) ? "text-primary" : "text-foreground")}>
                      {slot.label}
                    </span>
                  </label>
                ))}
              </div>
              {noneSelected && (
                <p className="text-xs text-amber-600 font-semibold mt-1.5">
                  Geen dagdelen geselecteerd — selecteer er minimaal één om af te drukken.
                </p>
              )}
              {!allSelected && !noneSelected && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {slotFilter!.length} van {allSlotKeys.length} dagdelen geselecteerd.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wide text-muted-foreground">
              Vrijwilliger (optioneel)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={volunteerId ?? ''}
                onChange={e => setVolunteerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Alle vrijwilligers</option>
                {volunteers?.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            {volunteerId && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Alleen diensten waarbij deze vrijwilliger is ingedeeld worden afgedrukt.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-border flex-shrink-0">
          <button
            onClick={reset}
            className="px-4 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors text-sm text-muted-foreground"
          >
            Reset
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors">Annuleren</button>
          <button
            onClick={handlePrint}
            disabled={noneSelected}
            className="flex-1 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Afdrukken
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByDate(shifts: ShiftWithAssignments[]): Record<string, ShiftWithAssignments[]> {
  const groups: Record<string, ShiftWithAssignments[]> = {};
  shifts.forEach(shift => {
    if (!groups[shift.date]) groups[shift.date] = [];
    groups[shift.date].push(shift);
  });
  Object.keys(groups).forEach(date => {
    groups[date].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
  });
  return groups;
}

interface WeekGroup { weekKey: string; weekLabel: string; shifts: ShiftWithAssignments[]; }

function groupByWeek(shifts: ShiftWithAssignments[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  shifts.forEach(shift => {
    const d = parseISO(shift.date);
    const wStart = startOfWeek(d, { weekStartsOn: 1 });
    const wEnd = endOfWeek(d, { weekStartsOn: 1 });
    const key = format(wStart, 'yyyy-MM-dd');
    if (!map.has(key)) {
      map.set(key, {
        weekKey: key,
        weekLabel: `${format(wStart, 'd MMM', { locale: nl })} – ${format(wEnd, 'd MMMM yyyy', { locale: nl })}`,
        shifts: [],
      });
    }
    map.get(key)!.shifts.push(shift);
  });
  return Array.from(map.values())
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map(w => ({
      ...w,
      shifts: w.shifts.sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : (SLOT_ORDER[a.slot] ?? 99) - (SLOT_ORDER[b.slot] ?? 99)
      ),
    }));
}

const PLACEHOLDER_NOTE = 'Om beurten een elftal';

function PrintWeeklyTable({ shifts }: { shifts: ShiftWithAssignments[] }) {
  const { getLabel } = useSlots();
  const weeks = useMemo(() => groupByWeek(shifts), [shifts]);

  if (weeks.length === 0) return (
    <p className="text-center italic py-8">Geen diensten gevonden voor deze selectie.</p>
  );

  return (
    <div>
      {weeks.map(week => (
        <div key={week.weekKey} className="print-week-block">
          <h2 className="print-week-heading">{week.weekLabel}</h2>
          <table className="print-schedule-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Dagdeel</th>
                <th>Tijden</th>
                <th>Vrijwilligers</th>
              </tr>
            </thead>
            <tbody>
              {week.shifts.map(shift => {
                const d = parseISO(shift.date);
                const timeRange = shift.startTime && shift.endTime
                  ? `${shift.startTime} – ${shift.endTime}`
                  : shift.startTime ? `v/a ${shift.startTime}`
                  : shift.endTime ? `t/m ${shift.endTime}`
                  : '—';
                const names = shift.notes === PLACEHOLDER_NOTE
                  ? PLACEHOLDER_NOTE
                  : shift.assignments.length > 0
                    ? shift.assignments.map(a => a.volunteer.name).join(', ')
                    : '—';
                return (
                  <tr key={shift.id}>
                    <td className="nowrap">{format(d, 'EEE d MMM', { locale: nl })}</td>
                    <td>{getLabel(shift.slot)}</td>
                    <td className="nowrap">{timeRange}</td>
                    <td>{names}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ShiftsGrid({
  groupedShifts,
  onEdit,
  onAssign,
}: {
  groupedShifts: Record<string, ShiftWithAssignments[]>;
  onEdit: (s: ShiftWithAssignments) => void;
  onAssign: (s: ShiftWithAssignments) => void;
}) {
  const sortedDates = Object.keys(groupedShifts).sort();
  if (sortedDates.length === 0) return (
    <p className="text-muted-foreground text-center py-10 italic">Geen diensten gevonden voor deze selectie.</p>
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
                <ShiftCard key={shift.id} shift={shift} onEdit={onEdit} onAssign={onAssign} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin, volunteerId: myVolunteerId, volunteerName: myVolunteerName } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('week');

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftWithAssignments | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<ShiftWithAssignments | null>(null);

  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintFilters, setActivePrintFilters] = useState<PrintFilters | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const screenParams = filterMode === 'week'
    ? { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') }
    : {};

  const { data: shifts, isLoading } = useListShifts(screenParams);
  const { data: allShifts } = useListShifts({});

  // ── Grouped shifts for screen ─────────────────────────────────────────────
  const groupedShifts = useMemo(() => {
    if (!shifts) return {};
    return groupByDate(shifts);
  }, [shifts]);

  const sortedDates = Object.keys(groupedShifts).sort();

  // ── Filtered shifts for print ─────────────────────────────────────────────
  const printGroupedShifts = useMemo(() => {
    if (!activePrintFilters || !allShifts) return {};

    let filtered = [...allShifts];

    if (activePrintFilters.slotFilter.length > 0) {
      filtered = filtered.filter(s => activePrintFilters.slotFilter.includes(s.slot));
    }

    if (activePrintFilters.volunteerId !== null) {
      filtered = filtered.filter(s =>
        s.assignments.some(a => a.volunteerId === activePrintFilters.volunteerId)
      );
    }

    return groupByDate(filtered);
  }, [activePrintFilters, allShifts]);

  // ── Print trigger ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePrintFilters) return;

    const timer = setTimeout(() => {
      window.print();
      const onAfterPrint = () => {
        setActivePrintFilters(null);
        window.removeEventListener('afterprint', onAfterPrint);
      };
      window.addEventListener('afterprint', onAfterPrint);
    }, 120);

    return () => clearTimeout(timer);
  }, [activePrintFilters]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenEdit = (shift: ShiftWithAssignments) => { setEditShift(shift); setIsShiftModalOpen(true); };
  const handleOpenCreate = () => { setEditShift(null); setIsShiftModalOpen(true); };
  const handleOpenAssign = (shift: ShiftWithAssignments) => { setAssignShift(shift); setIsAssignModalOpen(true); };

  const handleIcalDownload = async () => {
    if (!myVolunteerId) return;
    try {
      const content = await generateIcal(myVolunteerId);
      downloadIcal(content, 'mijn-diensten.ics');
    } catch {
      toast({ title: 'Fout', description: 'Agenda kon niet worden gedownload.', variant: 'destructive' });
    }
  };

  const { getLabel: getSlotLabel } = useSlots();

  const printTitle = useMemo(() => {
    if (!activePrintFilters) return 'Voetbalclub Kantine Schema';
    const parts: string[] = ['Voetbalclub Kantine Schema'];
    if (activePrintFilters.slotFilter.length > 0) {
      const labels = activePrintFilters.slotFilter.map(k => getSlotLabel(k)).join(', ');
      parts.push(`— ${labels}`);
    }
    if (activePrintFilters.volunteerName) parts.push(`— ${activePrintFilters.volunteerName}`);
    return parts.join(' ');
  }, [activePrintFilters, getSlotLabel]);

  return (
    <AuthGuard>
      <AppLayout>
        {/* ── Volunteer welcome banner ── */}
        {myVolunteerId && (
          <div className="flex items-center gap-4 bg-primary/10 border-2 border-primary/20 rounded-2xl px-5 py-4 mb-6 no-print">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">Welkom, {myVolunteerName}!</p>
              <p className="text-sm text-muted-foreground">Download jouw persoonlijke diensten als agenda-bestand.</p>
            </div>
            <button
              onClick={handleIcalDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-semibold text-sm transition-colors shrink-0"
              title="Download jouw diensten als agenda-bestand"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">iCal downloaden</span>
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 no-print">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Kantine Planning</h1>
            <p className="text-muted-foreground text-lg">
              {'Bekijk de volledige kantine planning.'}
            </p>
          </div>

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

            <button onClick={() => setIsPrintModalOpen(true)} className="btn-secondary flex items-center gap-2">
              <Printer className="w-5 h-5" /> Printen
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setIsAutoScheduleOpen(true)}
                  className="btn-secondary flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Shuffle className="w-5 h-5" /> Auto Indelen
                </button>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Nieuwe Dienst
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Week Navigation ── */}
        {filterMode === 'week' && (
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-border mb-8 shadow-sm no-print">
            <button
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" /> Vorige
            </button>
            <h2 className="text-xl font-bold text-center capitalize">
              {format(weekStart, 'd MMM', { locale: nl })} – {format(weekEnd, 'd MMMM yyyy', { locale: nl })}
            </h2>
            <button
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
            >
              Volgende <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Screen: shifts display ── */}
        <div className={cn(activePrintFilters ? 'no-print' : '')}>
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground font-bold animate-pulse">Schema laden...</div>
          ) : sortedDates.length === 0 ? (
            <div className="py-20 text-center bg-white border-2 border-dashed border-border rounded-3xl">
              <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Geen diensten gevonden</h3>
              <p className="text-muted-foreground">Er zijn nog geen kantinediensten ingepland voor deze periode.</p>
              {isAdmin && (
                <button onClick={handleOpenCreate} className="mt-6 btn-primary">
                  Eerste Dienst Aanmaken
                </button>
              )}
            </div>
          ) : (
            <ShiftsGrid groupedShifts={groupedShifts} onEdit={handleOpenEdit} onAssign={handleOpenAssign} />
          )}
        </div>

        {/* ── Print-only section ── */}
        {activePrintFilters && (
          <div className="print-only hidden">
            <div className="print-doc-header">
              <h1>{printTitle}</h1>
              <p>Afgedrukt op {format(new Date(), 'd MMMM yyyy', { locale: nl })}</p>
            </div>
            <PrintWeeklyTable shifts={Object.values(printGroupedShifts).flat()} />
          </div>
        )}

        {/* ── Modals ── */}
        <PrintOptionsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          onPrint={setActivePrintFilters}
        />

        {isAdmin && (
          <>
            <ShiftFormModal
              isOpen={isShiftModalOpen}
              onClose={() => setIsShiftModalOpen(false)}
              editShift={editShift}
              defaultDate={currentDate}
            />
            <AssignModal
              isOpen={isAssignModalOpen}
              onClose={() => setIsAssignModalOpen(false)}
              shift={assignShift}
            />
            <AutoScheduleModal
              isOpen={isAutoScheduleOpen}
              onClose={() => setIsAutoScheduleOpen(false)}
            />
          </>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
