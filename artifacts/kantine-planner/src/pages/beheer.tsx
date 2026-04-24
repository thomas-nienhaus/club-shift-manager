import React, { useState } from 'react';
import { Link } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import { AutoScheduleModal } from '@/components/shift/auto-schedule-modal';
import { ShiftFormModal } from '@/components/shift/shift-form-modal';
import { Shuffle, Plus, Calendar, Users, Clock } from 'lucide-react';

export default function Beheer() {
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Beheer</h1>
            <p className="text-muted-foreground text-lg">Beheer diensten, vrijwilligers en instellingen.</p>
          </div>

          {/* ── Diensten ── */}
          <section>
            <h2 className="text-xl font-bold mb-4">Diensten</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsAutoScheduleOpen(true)}
                className="btn-secondary flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Shuffle className="w-5 h-5" /> Auto Indelen
              </button>
              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Nieuwe Dienst
              </button>
            </div>
          </section>

          {/* ── Beheer-kaarten ── */}
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
        </div>

        <AutoScheduleModal
          isOpen={isAutoScheduleOpen}
          onClose={() => setIsAutoScheduleOpen(false)}
        />
        <ShiftFormModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        />
      </AppLayout>
    </AuthGuard>
  );
}
