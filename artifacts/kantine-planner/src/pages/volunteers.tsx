import React, { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import { useListVolunteers, useDeleteVolunteer } from '@/hooks/use-volunteers';
import type { Volunteer } from '@/lib/types';
import { Plus, Trash2, Edit2, Search, Mail, Phone, Users, AlertCircle, CalendarDays, Lock, ShieldAlert, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { VolunteerDialog } from '@/components/volunteer-dialog';
import { useSlots } from '@/hooks/use-slots';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { generateIcal, downloadIcal } from '@/utils/ical';
import { importVolunteersFromExcel } from '@/utils/volunteer-importer';
import { supabase } from '@/lib/supabase';

export default function Volunteers() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVol, setEditVol] = useState<Volunteer | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [invitingId, setInvitingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getLabel } = useSlots();

  const { data: volunteers, isLoading } = useListVolunteers();
  const { mutate: deleteVol, isPending: isDeleting } = useDeleteVolunteer();

  const filteredVols = volunteers?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.email ?? '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleEdit = (v: Volunteer) => {
    setEditVol(v);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditVol(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Weet je zeker dat je vrijwilliger ${name} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      deleteVol({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['volunteers'] });
          toast({ title: "Verwijderd", description: "Vrijwilliger is verwijderd uit het systeem." });
        }
      });
    }
  };

  const handleInvite = async (vol: Volunteer) => {
    if (!vol.email) return;
    setInvitingId(vol.id);
    const { error } = await supabase.functions.invoke('invite-volunteer', {
      body: { email: vol.email, volunteerId: vol.id },
    });
    setInvitingId(null);
    if (error) {
      let message = error.message;
      try {
        const text = await (error as any).context.text();
        const body = JSON.parse(text);
        if (body?.error) message = body.error;
      } catch {}
      toast({ title: 'Uitnodiging mislukt', description: message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      toast({ title: 'Uitnodiging verstuurd', description: `${vol.name} ontvangt een mail om een wachtwoord in te stellen.` });
    }
  };

  const handleIcalDownload = async (vol: Volunteer) => {
    try {
      const content = await generateIcal(vol.id);
      downloadIcal(content, `${vol.name}.ics`);
    } catch {
      toast({ title: 'Fout', description: 'Agenda kon niet worden gedownload.', variant: 'destructive' });
    }
  };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Vrijwilligers</h1>
            <p className="text-muted-foreground text-lg">Beheer de database van kantine vrijwilligers.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsImportOpen(true)} className="btn-secondary flex items-center gap-2 shrink-0">
              <Upload className="w-5 h-5" /> Importeren
            </button>
            <button onClick={handleCreate} className="btn-primary flex items-center gap-2 shrink-0">
              <Plus className="w-5 h-5" /> Nieuwe Vrijwilliger
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Zoek op naam of email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Laden...</div>
          ) : filteredVols.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Geen vrijwilligers gevonden.</div>
          ) : (
            <>
              {/* ── Desktop table (md+) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b border-border">
                      <th className="p-4 pl-6">Naam</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Beschikbaarheid</th>
                      <th className="p-4">Groep</th>
                      <th className="p-4 text-right pr-6">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredVols.map((vol) => (
                      <tr key={vol.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{vol.name}</span>
                            {vol.isAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold" title="Beheerder">
                                <ShieldAlert className="w-3 h-3" /> Beheerder
                              </span>
                            )}
                            {vol.hasPassword && (
                              <span title="Heeft Supabase account">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 space-y-1">
                          {vol.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4 shrink-0" /> {vol.email}
                            </div>
                          )}
                          {vol.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4 shrink-0" /> {vol.phone}
                            </div>
                          )}
                          {!vol.email && !vol.phone && <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4">
                          {vol.availability.length === 0 ? (
                            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Geen
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {vol.availability.map(slot => (
                                <span key={slot} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                  {getLabel(slot)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {vol.groupMembers && vol.groupMembers.length > 0 ? (
                            <div className="flex items-start gap-1.5">
                              <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5">
                                {vol.groupMembers.map(m => (
                                  <span key={m.id} className="text-sm font-medium text-foreground leading-tight">{m.name}</span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right space-x-1">
                          <button
                            onClick={() => handleIcalDownload(vol)}
                            title={`Agenda downloaden voor ${vol.name}`}
                            className="inline-flex p-2 rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <CalendarDays className="w-5 h-5" />
                          </button>
                          {vol.email && !vol.hasPassword && (
                            <button
                              onClick={() => handleInvite(vol)}
                              disabled={invitingId === vol.id}
                              title={`Uitnodiging sturen naar ${vol.name}`}
                              className="inline-flex p-2 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(vol)}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(vol.id, vol.name)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards (< md) ── */}
              <div className="md:hidden divide-y divide-border">
                {filteredVols.map((vol) => (
                  <div key={vol.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-base leading-tight">{vol.name}</span>
                        {vol.isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            <ShieldAlert className="w-3 h-3" /> Beheerder
                          </span>
                        )}
                        {vol.hasPassword && (
                          <span title="Heeft Supabase account">
                            <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleIcalDownload(vol)}
                          title={`Agenda downloaden voor ${vol.name}`}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        {vol.email && !vol.hasPassword && (
                          <button
                            onClick={() => handleInvite(vol)}
                            disabled={invitingId === vol.id}
                            title={`Uitnodiging sturen naar ${vol.name}`}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(vol)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vol.id, vol.name)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {(vol.email || vol.phone) && (
                      <div className="space-y-1">
                        {vol.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" /> {vol.email}
                          </div>
                        )}
                        {vol.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" /> {vol.phone}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      {vol.availability.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> Geen beschikbaarheid
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {vol.availability.map(slot => (
                            <span key={slot} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                              {getLabel(slot)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {vol.groupMembers && vol.groupMembers.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          {vol.groupMembers.map(m => (
                            <span key={m.id} className="text-sm font-medium text-foreground">{m.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <VolunteerDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editVolunteer={editVol}
        />

        <ImportVolunteersDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
      </AppLayout>
    </AuthGuard>
  );
}

// ── Import dialog ──────────────────────────────────────────────────────────────
type ImportResult = { imported: number; skipped: number; errors: string[] };

function ImportVolunteersDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { slots } = useSlots();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Naam', 'Email', 'Telefoon', 'Beschikbaarheid'],
      ['Jan Janssen', 'jan@example.nl', '06-12345678', slots[0]?.label ?? 'Woensdagavond'],
      ['Petra Pietersen', '', '06-87654321', slots.length > 1 ? `${slots[0]?.label}, ${slots[1]?.label}` : ''],
      ['Klaas de Vries', 'klaas@example.nl', '', ''],
    ]);
    ws['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Vrijwilligers');
    XLSX.writeFile(wb, 'vrijwilligers_voorbeeld.xlsx');
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    try {
      const data = await importVolunteersFromExcel(selectedFile, slots);
      setResult(data);
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      }
    } catch (err: any) {
      toast({ title: 'Import mislukt', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">Vrijwilligers Importeren</DialogTitle>
          <DialogDescription>
            Voeg meerdere vrijwilligers tegelijk toe via een Excel bestand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-sm border border-blue-100">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Bestandsformaat
            </h4>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li><strong>Naam</strong>: verplicht</li>
              <li><strong>Email</strong>: optioneel</li>
              <li><strong>Telefoon</strong>: optioneel</li>
              <li><strong>Beschikbaarheid</strong>: optioneel — kommagescheiden dagdelen</li>
            </ul>
            <p className="text-blue-700/80 text-xs mb-3">
              Geldige dagdelen: {slots.map(s => s.label).join(', ')}
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download voorbeeld
            </button>
          </div>

          {!result && (
            <div>
              <label
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                {selectedFile ? (
                  <span className="font-semibold text-foreground text-sm text-center">{selectedFile.name}</span>
                ) : (
                  <span className="text-muted-foreground text-sm text-center">
                    Sleep een .xlsx bestand hierheen,<br />of klik om een bestand te kiezen
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-800">Import voltooid</p>
                  <p className="text-sm text-green-700">
                    {result.imported} vrijwilliger{result.imported !== 1 ? 's' : ''} toegevoegd
                    {result.skipped > 0 ? `, ${result.skipped} overgeslagen (al bestaand)` : ''}
                  </p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-800 text-sm flex items-center gap-1.5 mb-1.5">
                    <XCircle className="w-4 h-4" /> Waarschuwingen
                  </p>
                  <ul className="text-xs text-amber-700 space-y-0.5 pl-2">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          {result ? (
            <>
              <button type="button" onClick={reset} className="btn-secondary w-full sm:w-auto">
                Nog een import
              </button>
              <button type="button" onClick={handleClose} className="btn-primary w-full sm:w-auto">
                Sluiten
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleClose} className="btn-secondary w-full sm:w-auto" disabled={isLoading}>
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!selectedFile || isLoading}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Upload className="w-4 h-4 animate-pulse" /> Importeren...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Importeren</>
                )}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
