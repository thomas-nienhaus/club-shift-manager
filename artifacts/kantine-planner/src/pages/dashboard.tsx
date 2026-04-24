import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard, useAuth } from '@/contexts/auth-context';
import { useListShifts } from '@/hooks/use-shifts';
import { useListVolunteers } from '@/hooks/use-volunteers';
import { useListSeasons } from '@/hooks/use-seasons';
import type { ShiftWithAssignments } from '@/lib/types';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ChevronDown, Printer, Calendar as CalendarIcon,
  List as ListIcon, X, AlertCircle, User, Download, ArrowLeftRight,
  Rss, Copy, Check, SlidersHorizontal,
} from 'lucide-react';
import { ShiftsGrid } from '@/components/shift/shifts-grid';
import { ShiftFormModal } from '@/components/shift/shift-form-modal';
import { AssignModal } from '@/components/shift/assign-modal';
import { OfferResponseModal } from '@/components/shift/offer-response-modal';
import { useListShiftOffers, useCreateShiftOffer, useAcceptOfferResponse, useDeclineOfferResponse } from '@/hooks/use-shift-offers';
import type { ShiftOffer } from '@/lib/types';
import { SLOT_ORDER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useSlots } from '@/hooks/use-slots';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { generateIcal, downloadIcal } from '@/utils/ical';

type FilterMode = 'week' | 'all';

interface PrintFilters {
  slotFilter: string[];
  volunteerId: number | null;
  volunteerName: string | null;
  seasonId: number | null;
  seasonName: string | null;
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
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '53%' }} />
            </colgroup>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin, volunteerId: myVolunteerId, volunteerName: myVolunteerName, authId } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('week');
  const [myShiftsOnly, setMyShiftsOnly] = useState(false);
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [printOpen, setPrintOpen] = useState(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);
  const [printSlotFilter, setPrintSlotFilter] = useState<string[] | null>(null);
  const [printVolunteerId, setPrintVolunteerId] = useState<number | null>(null);
  const [printSeasonId, setPrintSeasonId] = useState<number | null>(null);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftWithAssignments | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<ShiftWithAssignments | null>(null);

  const [activePrintFilters, setActivePrintFilters] = useState<PrintFilters | null>(null);

  const [icalStreamOpen, setIcalStreamOpen] = useState(false);
  const [icalCopied, setIcalCopied] = useState(false);

  const [isOfferResponseOpen, setIsOfferResponseOpen] = useState(false);
  const [respondOffer, setRespondOffer] = useState<ShiftOffer | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const screenParams = filterMode === 'week'
    ? { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') }
    : {};

  const { data: shifts, isLoading } = useListShifts(screenParams);
  const { data: allShifts } = useListShifts({});
  const { data: shiftOffers } = useListShiftOffers();
  const { data: volunteers } = useListVolunteers();
  const { data: seasons } = useListSeasons();

  // ── Grouped shifts for screen ─────────────────────────────────────────────
  const groupedShifts = useMemo(() => {
    if (!shifts) return {};
    let filtered = shifts;
    if (myShiftsOnly && myVolunteerId) {
      filtered = filtered.filter(s => s.assignments.some(a => a.volunteerId === myVolunteerId));
    }
    if (slotFilter) {
      filtered = filtered.filter(s => s.slot === slotFilter);
    }
    return groupByDate(filtered);
  }, [shifts, myShiftsOnly, slotFilter, myVolunteerId]);

  const sortedDates = Object.keys(groupedShifts).sort();

  // ── Shift offer data ──────────────────────────────────────────────────────
  const openOffersFromOthers = (shiftOffers ?? []).filter(
    o => o.status === 'open' && o.volunteerId !== myVolunteerId
  );
  const myOffersWithPendingResponses = (shiftOffers ?? []).filter(
    o => o.volunteerId === myVolunteerId && o.status === 'open' && o.responses.some(r => r.status === 'pending')
  );
  const myOpenOfferShiftIds = new Set(
    (shiftOffers ?? [])
      .filter(o => o.status === 'open' && o.volunteerId === myVolunteerId)
      .map(o => o.shiftId)
  );
  const myFutureAssignedShifts = (allShifts ?? []).filter(
    s => s.assignments.some(a => a.volunteerId === myVolunteerId) &&
      new Date(s.date) >= new Date(new Date().toDateString())
  );

  const { mutate: createOffer } = useCreateShiftOffer();
  const { mutate: acceptResponse } = useAcceptOfferResponse();
  const { mutate: declineResponse } = useDeclineOfferResponse();

  // ── Filtered shifts for print ─────────────────────────────────────────────
  const printGroupedShifts = useMemo(() => {
    if (!activePrintFilters || !allShifts) return {};

    let filtered = [...allShifts];

    if (activePrintFilters.seasonId !== null) {
      filtered = filtered.filter(s => s.seasonId === activePrintFilters.seasonId);
    }

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

  // ── Filter dropdown click-outside ────────────────────────────────────────
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // ── Print dropdown click-outside ──────────────────────────────────────────
  useEffect(() => {
    if (!printOpen) return;
    const handler = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setPrintOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [printOpen]);

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
  const handleOpenAssign = (shift: ShiftWithAssignments) => { setAssignShift(shift); setIsAssignModalOpen(true); };

  const handleOffer = (shift: ShiftWithAssignments) => {
    if (!myVolunteerId) return;
    if (window.confirm(`Wil je jouw dienst op ${format(parseISO(shift.date), 'd MMMM', { locale: nl })} aanbieden aan andere vrijwilligers?`)) {
      createOffer({ shiftId: shift.id, volunteerId: myVolunteerId }, {
        onSuccess: () => toast({ title: 'Aangeboden', description: 'Jouw dienst is aangeboden aan andere vrijwilligers.' }),
        onError: () => toast({ title: 'Fout', description: 'Kon de dienst niet aanbieden.', variant: 'destructive' }),
      });
    }
  };

  const handlePrint = () => {
    const vol = volunteers?.find(v => v.id === printVolunteerId);
    const season = seasons?.find(s => s.id === printSeasonId);
    setActivePrintFilters({
      slotFilter: printSlotFilter ?? [],
      volunteerId: printVolunteerId,
      volunteerName: vol?.name ?? null,
      seasonId: printSeasonId,
      seasonName: season?.name ?? null,
    });
    setPrintOpen(false);
  };

  const handleIcalDownload = async () => {
    if (!myVolunteerId) return;
    try {
      const content = await generateIcal(myVolunteerId);
      downloadIcal(content, 'mijn-diensten.ics');
    } catch {
      toast({ title: 'Fout', description: 'Agenda kon niet worden gedownload.', variant: 'destructive' });
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const icalStreamHttpUrl = myVolunteerId && authId
    ? `${supabaseUrl}/functions/v1/ical?volunteerId=${myVolunteerId}&token=${authId}`
    : null;
  const icalStreamWebcalUrl = icalStreamHttpUrl?.replace(/^https?:\/\//, 'webcal://') ?? null;

  const handleCopyIcalUrl = async () => {
    if (!icalStreamHttpUrl) return;
    await navigator.clipboard.writeText(icalStreamHttpUrl);
    setIcalCopied(true);
    setTimeout(() => setIcalCopied(false), 2000);
  };

  const { slots, getLabel: getSlotLabel } = useSlots();

  const printTitle = useMemo(() => {
    if (!activePrintFilters) return 'Kantine Schema';
    const base = activePrintFilters.seasonName ?? 'Kantine Schema';
    const parts: string[] = [base];
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
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl mb-6 no-print overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">Welkom, {myVolunteerName}!</p>
                <p className="text-sm text-muted-foreground">Synchroniseer jouw diensten met je agenda-app.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {icalStreamWebcalUrl && (
                  <button
                    onClick={() => setIcalStreamOpen(o => !o)}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors", icalStreamOpen ? "bg-primary text-primary-foreground" : "bg-primary/20 hover:bg-primary/30 text-primary")}
                    title="Abonneer op jouw agenda-stream"
                  >
                    <Rss className="w-4 h-4" />
                    <span className="hidden sm:inline">Abonneren</span>
                  </button>
                )}
                <button
                  onClick={handleIcalDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-semibold text-sm transition-colors"
                  title="Download jouw diensten als agenda-bestand"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Downloaden</span>
                </button>
              </div>
            </div>

            {icalStreamOpen && icalStreamHttpUrl && icalStreamWebcalUrl && (
              <div className="border-t-2 border-primary/20 px-5 py-4 bg-white/60">
                <p className="text-sm font-bold text-foreground mb-1">Agenda-abonnement</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Voeg de URL hieronder toe in Google Calendar, Apple Agenda of Outlook. Nieuwe diensten verschijnen dan automatisch.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    readOnly
                    value={icalStreamHttpUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={handleCopyIcalUrl}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm transition-colors shrink-0", icalCopied ? "bg-green-100 text-green-700" : "bg-primary/10 hover:bg-primary/20 text-primary")}
                  >
                    {icalCopied ? <><Check className="w-4 h-4" /> Gekopieerd</> : <><Copy className="w-4 h-4" /> Kopieer</>}
                  </button>
                </div>
                <a
                  href={icalStreamWebcalUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Rss className="w-3.5 h-3.5" /> Direct openen in agenda-app
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Open offers from others ── */}
        {!isAdmin && myVolunteerId && openOffersFromOthers.length > 0 && (
          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 mb-6 no-print">
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              Aangeboden diensten
            </h2>
            <ul className="space-y-2">
              {openOffersFromOthers.map(offer => (
                <li key={offer.id} className="flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 gap-3">
                  <span className="text-sm font-semibold">
                    <span className="text-primary">{offer.volunteer.name}</span> biedt aan:{' '}
                    <span className="capitalize">{format(parseISO(offer.shift.date), 'd MMMM', { locale: nl })}</span>
                    {' '}— {getSlotLabel(offer.shift.slot)}
                  </span>
                  <button
                    onClick={() => { setRespondOffer(offer); setIsOfferResponseOpen(true); }}
                    className="shrink-0 text-sm font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Reageren
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Pending responses on my offers ── */}
        {!isAdmin && myOffersWithPendingResponses.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6 no-print">
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Reacties op jouw aanbiedingen
            </h2>
            <ul className="space-y-3">
              {myOffersWithPendingResponses.flatMap(offer =>
                offer.responses.filter(r => r.status === 'pending').map(response => (
                  <li key={response.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3 gap-3">
                    <span className="text-sm font-semibold">
                      <span className="text-amber-700">{response.responder.name}</span> wil jouw dienst op{' '}
                      <span className="capitalize">{format(parseISO(offer.shift.date), 'd MMMM', { locale: nl })}</span>{' '}
                      {response.type === 'takeover'
                        ? 'overnemen'
                        : <>ruilen voor zijn/haar dienst op <span className="capitalize">{format(parseISO(response.swapShift!.date), 'd MMMM', { locale: nl })}</span></>
                      }
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => acceptResponse(
                          { responseId: response.id, type: response.type },
                          { onSuccess: () => toast({ title: 'Geaccepteerd', description: 'De dienst is overgedragen.' }) }
                        )}
                        className="text-sm font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Accepteren
                      </button>
                      <button
                        onClick={() => declineResponse(
                          { responseId: response.id },
                          { onSuccess: () => toast({ title: 'Geweigerd' }) }
                        )}
                        className="text-sm font-bold px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Weigeren
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 no-print">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Kantine Planning</h1>
            <p className="text-muted-foreground text-lg">Bekijk de volledige kantine planning.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* ── Filter dropdown ── */}
            <div className="relative" ref={filterDropdownRef}>
              {(() => {
                const activeCount = (myShiftsOnly ? 1 : 0) + (slotFilter ? 1 : 0) + (filterMode === 'all' ? 1 : 0);
                return (
                  <button
                    onClick={() => setFilterOpen(o => !o)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl font-bold border-2 transition-all",
                      filterOpen || activeCount > 0
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border text-foreground hover:border-primary/40"
                    )}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeCount > 0 && (
                      <span className="bg-white/30 text-inherit text-xs font-bold px-1.5 py-0.5 rounded-md">
                        {activeCount}
                      </span>
                    )}
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-150", filterOpen && "rotate-180")} />
                  </button>
                );
              })()}

              {filterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border-2 border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                  <div className="p-4 space-y-5">

                    {/* Weergave */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Weergave</p>
                      <div className="flex bg-muted p-1 rounded-xl border border-border">
                        <button
                          onClick={() => setFilterMode('week')}
                          className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all", filterMode === 'week' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <CalendarIcon className="w-4 h-4" /> Week
                        </button>
                        <button
                          onClick={() => setFilterMode('all')}
                          className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all", filterMode === 'all' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <ListIcon className="w-4 h-4" /> Alle
                        </button>
                      </div>
                    </div>

                    {/* Mijn diensten */}
                    {myVolunteerId && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Mijn diensten</p>
                        <button
                          onClick={() => setMyShiftsOnly(o => !o)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all",
                            myShiftsOnly ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border text-foreground hover:border-primary/40"
                          )}
                        >
                          <User className="w-4 h-4" />
                          {myShiftsOnly ? 'Alleen mijn diensten' : 'Alle vrijwilligers'}
                        </button>
                      </div>
                    )}

                    {/* Dagdeel */}
                    {slots.length > 1 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Dagdeel</p>
                        <select
                          value={slotFilter ?? ''}
                          onChange={e => setSlotFilter(e.target.value || null)}
                          className="w-full px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        >
                          <option value="">Alle dagdelen</option>
                          {slots.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Wis filters */}
                    {(myShiftsOnly || slotFilter || filterMode === 'all') && (
                      <button
                        onClick={() => { setMyShiftsOnly(false); setSlotFilter(null); setFilterMode('week'); }}
                        className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        Filters wissen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Print dropdown ── */}
            <div className="relative" ref={printDropdownRef}>
              <button
                onClick={() => setPrintOpen(o => !o)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl font-bold border-2 transition-all",
                  printOpen ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-foreground hover:border-primary/40"
                )}
              >
                <Printer className="w-4 h-4" />
                Printen
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-150", printOpen && "rotate-180")} />
              </button>

              {printOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border-2 border-border rounded-2xl shadow-xl z-20">
                  <div className="p-4 space-y-4">

                    {seasons && seasons.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Seizoen</p>
                        <select
                          value={printSeasonId ?? ''}
                          onChange={e => setPrintSeasonId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Alle seizoenen</option>
                          {seasons.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {slots.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dagdelen</p>
                          <button
                            type="button"
                            onClick={() => setPrintSlotFilter(printSlotFilter === null ? [] : null)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {printSlotFilter === null ? 'Niets' : 'Alles'}
                          </button>
                        </div>
                        <div className="space-y-1">
                          {slots.map(slot => {
                            const checked = printSlotFilter === null || printSlotFilter.includes(slot.key);
                            return (
                              <label key={slot.key} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/40 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setPrintSlotFilter(prev => {
                                    const all = slots.map(s => s.key);
                                    const eff = prev ?? all;
                                    const next = eff.includes(slot.key) ? eff.filter(k => k !== slot.key) : [...eff, slot.key];
                                    return next.length === all.length ? null : next;
                                  })}
                                  className="w-4 h-4 rounded accent-primary flex-shrink-0"
                                />
                                <span className="text-sm font-medium">{slot.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {printSlotFilter !== null && printSlotFilter.length === 0 && (
                          <p className="text-xs text-amber-600 font-semibold mt-1.5 px-1">
                            Selecteer minimaal één dagdeel.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Vrijwilliger</p>
                      <select
                        value={printVolunteerId ?? ''}
                        onChange={e => setPrintVolunteerId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Alle vrijwilligers</option>
                        {volunteers?.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handlePrint}
                      disabled={printSlotFilter !== null && printSlotFilter.length === 0}
                      className="w-full py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-4 h-4" /> Afdrukken
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <p className="text-muted-foreground">
                {myShiftsOnly || slotFilter
                  ? 'Geen diensten gevonden voor de geselecteerde filters.'
                  : 'Er zijn nog geen kantinediensten ingepland voor deze periode.'}
              </p>
              {(myShiftsOnly || slotFilter) && (
                <button
                  onClick={() => { setMyShiftsOnly(false); setSlotFilter(null); setFilterMode('week'); }}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Filters wissen
                </button>
              )}
            </div>
          ) : (
            <ShiftsGrid
              groupedShifts={groupedShifts}
              onEdit={handleOpenEdit}
              onAssign={handleOpenAssign}
              onOffer={myVolunteerId ? handleOffer : undefined}
              myVolunteerId={myVolunteerId}
              openOfferShiftIds={myOpenOfferShiftIds}
            />
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
        {myVolunteerId && (
          <OfferResponseModal
            isOpen={isOfferResponseOpen}
            onClose={() => { setIsOfferResponseOpen(false); setRespondOffer(null); }}
            offer={respondOffer}
            myVolunteerId={myVolunteerId}
            myShifts={myFutureAssignedShifts}
          />
        )}

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
      </AppLayout>
    </AuthGuard>
  );
}
