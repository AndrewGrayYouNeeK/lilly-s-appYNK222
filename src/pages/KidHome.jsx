import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import AvatarRing from '@/components/AvatarRing';
import DailyTip from '@/components/DailyTip';
import { Progress } from '@/components/ui/progress';
import { Wallet, Flame, Trophy, ChevronRight, Target } from 'lucide-react';
import { formatMoney, streakMultiplier, todayISO } from '@/lib/cq';

export default function KidHome() {
  const nav = useNavigate();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: streak } = useQuery({
    queryKey: ['streak', me?.email],
    queryFn: () => base44.entities.Streak.filter({ kid_email: me.email }).then(r => r[0]),
    enabled: !!me?.email,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['txs', me?.email],
    queryFn: () => base44.entities.WalletTransaction.filter({ kid_email: me.email }),
    enabled: !!me?.email,
  });
  const { data: myClaims = [] } = useQuery({
    queryKey: ['myClaims', me?.email],
    queryFn: () => base44.entities.ChoreClaim.filter({ kid_email: me.email }, '-created_date'),
    enabled: !!me?.email,
  });
  const { data: familyQuests = [] } = useQuery({
    queryKey: ['quests', me?.family_id],
    queryFn: () => base44.entities.FamilyQuest.filter({ family_id: me.family_id, status: 'active' }),
    enabled: !!me?.family_id,
  });
  const { data: familyApproved = [] } = useQuery({
    queryKey: ['familyApproved', me?.family_id],
    queryFn: () => base44.entities.ChoreClaim.filter({ family_id: me.family_id, status: 'approved' }),
    enabled: !!me?.family_id,
  });

  const balance = txs.reduce((s, t) => s + (['earn','bonus'].includes(t.type) ? t.amount : -t.amount), 0);
  const count = streak?.current_count || 0;
  const mult = streakMultiplier(count);
  const today = todayISO();
  const activeQuest = myClaims.find(c => ['claimed','before_done','redo'].includes(c.status));
  const submittedToday = myClaims.filter(c => (c.claim_date || '').startsWith(today) && c.status === 'submitted');

  const flameSize = count >= 14 ? 'text-7xl' : count >= 7 ? 'text-6xl' : count >= 3 ? 'text-5xl' : 'text-4xl';
  const approvedCount = myClaims.filter(c => c.status === 'approved').length;
  const activeQuest2 = familyQuests[0];

  return (
    <Shell role="kid">
      <header className="mb-5">
        <div className="text-xs text-muted-foreground mb-1">Hey there</div>
        <h1 className="font-display text-2xl font-bold mb-4">{me?.display_name || me?.full_name}</h1>
        <AvatarRing emoji={me?.avatar_emoji || '🦊'} completedCount={approvedCount} size={88} />
      </header>

      <DailyTip age={me?.age} />

      {/* Streak hero */}
      <Card onClick={() => nav('/kid/streak')} className="p-6 mb-4 bg-gradient-to-br from-secondary to-accent text-primary-foreground overflow-hidden relative cursor-pointer bounce-tap">
        <div className="relative z-10">
          <div className="text-xs uppercase tracking-wider opacity-80">Current streak</div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`flame ${flameSize}`}>🔥</span>
            <span className="font-display text-6xl font-bold leading-none">{count}</span>
            <span className="text-sm opacity-80">{count === 1 ? 'day' : 'days'}</span>
          </div>
          {mult > 1 && (
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-white/25 backdrop-blur text-xs font-bold">
              🎉 {Math.round((mult - 1) * 100)}% bonus active today!
            </div>
          )}
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => nav('/kid/goals')} className="bounce-tap flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
          <Target className="w-4 h-4 text-secondary" /> Goals
        </button>
        <button onClick={() => nav('/kid/leaderboard')} className="bounce-tap flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
          <Trophy className="w-4 h-4 text-primary" /> Leaderboard
        </button>
      </div>

      {/* Wallet */}
      <Card onClick={() => nav('/kid/wallet')} className="p-5 mb-4 cursor-pointer bounce-tap flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Wallet</div>
          <div className="font-display text-3xl font-bold">{formatMoney(balance, family?.currency_symbol)}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Card>

      {/* Active quest or CTA */}
      {activeQuest ? (
        <Card onClick={() => nav(`/kid/do/${activeQuest.id}`)} className="p-5 mb-4 cursor-pointer bounce-tap bg-primary text-primary-foreground">
          <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
            {activeQuest.status === 'redo' ? 'Needs redo' : 'Active quest'}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{activeQuest.chore_emoji}</div>
            <div className="flex-1">
              <div className="font-display text-xl font-bold">{activeQuest.chore_title}</div>
              <div className="text-xs opacity-80">Tap to continue →</div>
            </div>
          </div>
        </Card>
      ) : (
        <Card onClick={() => nav('/kid/pool')} className="p-6 mb-4 cursor-pointer bounce-tap border-2 border-dashed border-secondary bg-secondary/5 text-center">
          <Flame className="w-8 h-8 text-secondary mx-auto mb-2" />
          <div className="font-display text-xl font-bold">Start a new quest</div>
          <div className="text-xs text-muted-foreground">Pick a chore from the pool</div>
        </Card>
      )}

      {submittedToday.length > 0 && (
        <Card className="p-4 mb-4 bg-accent/30">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4" />
            <span>{submittedToday.length} quest{submittedToday.length>1?'s':''} waiting for parent review</span>
          </div>
        </Card>
      )}

      {activeQuest2 && (() => {
        const since = new Date(activeQuest2.created_date);
        const prog = familyApproved.filter(c => new Date(c.created_date) >= since).length;
        const pct = Math.min(100, (prog / activeQuest2.target_count) * 100);
        return (
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl">{activeQuest2.emoji}</div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Family Quest</div>
                <div className="font-display font-bold leading-tight">{activeQuest2.title}</div>
              </div>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
              <span>{prog} / {activeQuest2.target_count} chores</span>
              {activeQuest2.reward && <span className="font-semibold">🎁 {activeQuest2.reward}</span>}
            </div>
          </Card>
        );
      })()}
    </Shell>
  );
}