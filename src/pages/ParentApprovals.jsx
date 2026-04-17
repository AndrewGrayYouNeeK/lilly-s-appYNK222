import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, RefreshCcw, Inbox } from 'lucide-react';
import { formatMoney, todayISO, streakMultiplier } from '@/lib/cq';
import { checkAndAwardBadges, checkFamilyQuests } from '@/lib/gamification';
import { notify } from '@/lib/notify';
import ClaimCommentThread from '@/components/ClaimCommentThread';
import { toast } from 'sonner';

export default function ParentApprovals() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: pending = [] } = useQuery({
    queryKey: ['pending', me?.family_id],
    queryFn: () => base44.entities.ChoreClaim.filter({ family_id: me.family_id, status: 'submitted' }, '-created_date'),
    enabled: !!me?.family_id,
  });

  const [comment, setComment] = useState({});

  const approve = useMutation({
    mutationFn: async (claim) => {
      // update / bump streak first, compute multiplier
      const streaks = await base44.entities.Streak.filter({ kid_email: claim.kid_email, family_id: claim.family_id });
      let streak = streaks[0];
      const today = todayISO();
      let newCount = 1;
      if (streak) {
        if (streak.last_completed_date === today) newCount = streak.current_count;
        else {
          const last = streak.last_completed_date ? new Date(streak.last_completed_date) : null;
          const diff = last ? Math.round((new Date(today) - last) / 86400000) : 999;
          newCount = diff === 1 ? streak.current_count + 1 : 1;
        }
        await base44.entities.Streak.update(streak.id, {
          current_count: newCount,
          longest_count: Math.max(streak.longest_count || 0, newCount),
          last_completed_date: today,
        });
      } else {
        streak = await base44.entities.Streak.create({
          kid_email: claim.kid_email, family_id: claim.family_id,
          current_count: 1, longest_count: 1, last_completed_date: today,
        });
      }

      const mult = streakMultiplier(newCount);
      const base = claim.chore_value || 0;
      const paid = Math.round(base * mult * 100) / 100;
      const bonus = Math.round((paid - base) * 100) / 100;

      await base44.entities.ChoreClaim.update(claim.id, { status: 'approved', paid_amount: paid });
      await base44.entities.WalletTransaction.create({
        kid_email: claim.kid_email, family_id: claim.family_id,
        amount: base, type: 'earn', description: claim.chore_title, claim_id: claim.id,
      });
      if (bonus > 0) {
        await base44.entities.WalletTransaction.create({
          kid_email: claim.kid_email, family_id: claim.family_id,
          amount: bonus, type: 'bonus', description: `Streak bonus (${newCount} days 🔥)`, claim_id: claim.id,
        });
      }

      // Award badges + check family quests
      const newBadges = await checkAndAwardBadges({ kidEmail: claim.kid_email, familyId: claim.family_id });
      await checkFamilyQuests(claim.family_id);

      // Notify the kid
      await notify({
        recipient_email: claim.kid_email, family_id: claim.family_id,
        type: 'approval', emoji: '✅',
        title: `Approved: ${claim.chore_title}`,
        body: `You earned ${formatMoney(paid, family?.currency_symbol)}${bonus > 0 ? ` (incl. ${Math.round((mult-1)*100)}% streak bonus)` : ''}`,
        link: '/kid/wallet',
      });
      return { newBadges };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pending'] });
      qc.invalidateQueries({ queryKey: ['claims'] });
      const extra = res?.newBadges?.length ? ` · ${res.newBadges.length} new badge${res.newBadges.length>1?'s':''}!` : '';
      toast.success(`Approved & paid!${extra}`);
    },
  });

  const redo = useMutation({
    mutationFn: async ({ claim, note }) => {
      await base44.entities.ChoreClaim.update(claim.id, { status: 'redo', review_comment: note });
      await notify({
        recipient_email: claim.kid_email, family_id: claim.family_id,
        type: 'redo', emoji: '🔁',
        title: `Redo needed: ${claim.chore_title}`,
        body: note || 'Please take another look',
        link: `/kid/do/${claim.id}`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pending'] }); toast('Sent back for redo'); },
  });

  return (
    <Shell role="parent">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-bold text-primary">Approvals</h1>
        <p className="text-sm text-muted-foreground">{pending.length} waiting for you</p>
      </header>

      {pending.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-display text-lg font-semibold">All caught up</div>
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map(c => (
            <Card key={c.id} className="overflow-hidden">
              <div className="p-4 flex items-center gap-3 border-b border-border">
                <div className="text-2xl">{c.chore_emoji}</div>
                <div className="flex-1">
                  <div className="font-semibold">{c.chore_title}</div>
                  <div className="text-xs text-muted-foreground">{c.kid_name}</div>
                </div>
                <div className="font-display text-lg font-bold text-primary">
                  {formatMoney(c.chore_value, family?.currency_symbol)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0.5 bg-border">
                <Photo label="Before" url={c.before_photo_url} />
                <Photo label="After"  url={c.after_photo_url}  />
              </div>
              <div className="p-4 space-y-3">
                <Textarea
                  placeholder="Comment (optional, for redo)"
                  value={comment[c.id] || ''}
                  onChange={e => setComment({ ...comment, [c.id]: e.target.value })}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => redo.mutate({ claim: c, note: comment[c.id] || 'Please redo' })}
                    variant="outline" className="flex-1">
                    <RefreshCcw className="w-4 h-4 mr-1.5" /> Redo
                  </Button>
                  <Button onClick={() => approve.mutate(c)} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                    <Check className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                </div>
                <ClaimCommentThread claim={c} me={me} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

const Photo = ({ label, url }) => (
  <div className="relative bg-muted aspect-square">
    {url ? <img src={url} alt={label} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>}
    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/90 text-[10px] font-semibold uppercase tracking-wider">{label}</div>
  </div>
);