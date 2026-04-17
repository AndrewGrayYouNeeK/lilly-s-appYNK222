import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { difficultyStyle, formatMoney, todayISO } from '@/lib/cq';
import { toast } from 'sonner';

export default function ChorePool() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: chores = [] } = useQuery({
    queryKey: ['pool', me?.family_id],
    queryFn: () => base44.entities.Chore.filter({ family_id: me.family_id, active: true }),
    enabled: !!me?.family_id,
  });
  const { data: myClaims = [] } = useQuery({
    queryKey: ['myClaims', me?.email],
    queryFn: () => base44.entities.ChoreClaim.filter({ kid_email: me.email }),
    enabled: !!me?.email,
  });

  const today = todayISO();
  const claimedToday = myClaims.filter(c => (c.claim_date || '').startsWith(today));
  const openClaimedIds = myClaims
    .filter(c => ['claimed','before_done','submitted'].includes(c.status))
    .map(c => c.chore_id);
  const maxPerDay = family?.max_chores_per_day || 1;
  const atLimit = claimedToday.length >= maxPerDay;

  const claim = useMutation({
    mutationFn: async (chore) => {
      const c = await base44.entities.ChoreClaim.create({
        family_id: me.family_id,
        chore_id: chore.id,
        chore_title: chore.title,
        chore_emoji: chore.emoji,
        chore_value: chore.value,
        kid_email: me.email,
        kid_name: me.display_name || me.full_name,
        status: 'claimed',
        claim_date: today,
      });
      return c;
    },
    onSuccess: (c) => { toast.success('Quest claimed!'); qc.invalidateQueries({ queryKey: ['myClaims'] }); nav(`/kid/do/${c.id}`); },
  });

  const available = chores.filter(c => !openClaimedIds.includes(c.id));

  return (
    <Shell role="kid">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-bold">Chore Pool</h1>
        <p className="text-sm text-muted-foreground">Pick a quest and start earning</p>
        {atLimit && <p className="text-xs text-secondary mt-2 font-semibold">You've claimed your daily quest. Come back tomorrow!</p>}
      </header>

      {available.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-display text-lg font-semibold">Nothing in the pool</div>
          <p className="text-sm text-muted-foreground">Check back soon — a parent will add more.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {available.map(c => {
            const d = difficultyStyle(c.difficulty);
            return (
              <Card key={c.id} className={`p-4 flex flex-col ring-1 ${d.ring}`}>
                <div className="text-4xl mb-2">{c.emoji}</div>
                <div className="font-display font-bold leading-tight mb-1">{c.title}</div>
                {c.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{c.description}</div>}
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${d.bg} ${d.text}`}>{d.label}</span>
                  <span className="font-display text-lg font-bold">{formatMoney(c.value, family?.currency_symbol)}</span>
                </div>
                <Button
                  size="sm"
                  className="mt-3 rounded-full"
                  disabled={atLimit || claim.isPending}
                  onClick={() => claim.mutate(c)}
                >
                  Claim
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}