import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import { useListSeasons, useCreateSeason, useDeleteSeason } from '@/hooks/use-seasons';
import type { Season } from '@/lib/types';
import { Plus, Trash2, Calendar as CalendarIcon, Eye, Wand2, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link } from 'wouter';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSlots } from '@/hooks/use-slots';
import { generateSeasonShifts } from '@/utils/season-generator';

export default function Seasons() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: seasons, isLoading } = useListSeasons();
  const { mutate: deleteSeason, isPending: isDeleting } = useDeleteSeason();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleDelete = (season: Season) => {
    if (window.confirm(`Weet je zeker dat je seizoen "${season.name}" wilt verwijderen? Dit verwijdert ook alle gekoppelde diensten.`)) {
      deleteSeason({ id: season.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['seasons'] });
          queryClient.invalidateQueries({ queryKey: ['shifts'] });
          toast({ title: "Verwijderd", description: "Seizoen is succesvol verwijderd." });
        },
        onError: () => {
          toast({ title: "Fout", description: "Er is een fout opgetreden bij het verwijderen.", variant: "destructive" });
        }
      });
    }
  };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Seizoenen</h1>
            <p className="text-muted-foreground text-lg">Beheer de seizoenen en importeer roosters.</p>
          </div>

          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus className="w-5 h-5" /> Nieuw Seizoen
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground font-bold animate-pulse">Laden...</div>
        ) : seasons?.length === 0 ? (
          <div className="py-20 text-center bg-white border-2 border-dashed border-border rounded-3xl">
            <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Geen seizoenen gevonden</h3>
            <p className="text-muted-foreground">Begin met het aanmaken van een nieuw seizoen.</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="mt-6 btn-primary">
              Maak Eerste Seizoen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasons?.map(season => (
              <div key={season.id} className="bg-white rounded-2xl border-2 border-border p-6 shadow-sm flex flex-col hover:border-primary/50 transition-colors">
                <div className="mb-4">
                  <h3 className="text-2xl font-display font-bold mb-1">{season.name}</h3>
                  <div className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(parseISO(season.startDate), 'd MMM yyyy', { locale: nl })} - {format(parseISO(season.endDate), 'd MMM yyyy', { locale: nl })}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 mb-6 inline-block w-fit">
                  <span className="font-bold text-lg text-foreground">{season.shiftCount}</span>
                  <span className="text-muted-foreground text-sm ml-2">diensten</span>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="flex gap-3">
                    <Link href={`/?startDate=${season.startDate}&endDate=${season.endDate}`} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold border-2 border-border text-foreground hover:bg-muted transition-colors">
                        <Eye className="w-4 h-4" /> Planning
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(season)}
                      disabled={isDeleting}
                      className="px-4 py-2.5 rounded-xl font-bold border-2 border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                      title="Verwijder seizoen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateSeasonModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      </AppLayout>
    </AuthGuard>
  );
}

function CreateSeasonModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const { mutate: createSeason, isPending: isCreating } = useCreateSeason();
  const { slots: activeSlots } = useSlots();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPending = isCreating || isGenerating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      toast({ title: "Fout", description: "Vul alle velden in.", variant: "destructive" });
      return;
    }

    createSeason({ data: { name, startDate, endDate } }, {
      onSuccess: async (res) => {
        queryClient.invalidateQueries({ queryKey: ['seasons'] });

        if (autoGenerate) {
          setIsGenerating(true);
          try {
            const data = await generateSeasonShifts(res.id);
            toast({
              title: "Seizoen aangemaakt",
              description: `Seizoen aangemaakt en ${data.shiftsCreated} diensten automatisch gegenereerd.`,
            });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
          } catch (err: any) {
            toast({ title: "Genereren mislukt", description: err?.message ?? "Seizoen aangemaakt, maar diensten konden niet automatisch worden gegenereerd.", variant: "destructive" });
          } finally {
            setIsGenerating(false);
          }
        } else {
          toast({ title: "Aangemaakt", description: "Nieuw seizoen is aangemaakt." });
        }

        onSuccess();
        setName(''); setStartDate(''); setEndDate('');
      },
      onError: () => {
        toast({ title: "Fout", description: "Er is een fout opgetreden.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">Nieuw Seizoen</DialogTitle>
          <DialogDescription>
            Voeg een nieuw voetbalseizoen toe aan de planning.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="label-text">Naam (bijv. 2025-2026)</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="2025-2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Startdatum</label>
              <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Einddatum</label>
              <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className={`rounded-xl border-2 p-4 transition-colors ${autoGenerate ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={e => setAutoGenerate(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
                  Diensten automatisch genereren
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Maakt voor elke datum in het seizoen automatisch diensten aan op basis van de actieve dagdelen.
                </p>
                {autoGenerate && activeSlots.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-primary/80">
                      <span className="font-semibold">Actieve dagdelen: </span>
                      {activeSlots.map(s => s.label).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto" disabled={isPending}>Annuleren</button>
            <button type="submit" disabled={isPending} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
              {isGenerating ? (
                <><Wand2 className="w-4 h-4 animate-pulse" /> Genereren...</>
              ) : isCreating ? "Opslaan..." : (
                autoGenerate ? <><Wand2 className="w-4 h-4" /> Aanmaken & Genereren</> : "Aanmaken"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
