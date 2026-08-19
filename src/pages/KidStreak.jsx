import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import StreakHeatmap from '@/components/StreakHeatmap';
import { streakMultiplier } from '@/lib/cq';
import { Flame } from 'lucide-react';

const MILESTONES = [
  { days: 3, label: '+25% bonus', emoji: '🔥' },
  { days: 7, label: '+50% bonus', emoji: '⚡' },
  { days: 14, label: '+100% LEGENDARY', emoji: '💫' },
];

export default function KidStreak() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: streak } = useQuery({
    queryKey: ['streak', me?.email],
    queryFn: () => api.entities.Streak.filter({ kid_email: me.email }).then(r => r[0]),
    enabled: !!me?.email,
  });
  const { data: approved = [] } = useQuery({
    queryKey: ['approvedDates', me?.email],
    queryFn: () => api.entities.ChoreClaim.filter({ kid_email: me.email, status: 'approved' }),
    enabled: !!me?.email,
  });

  const completedDates = [...new Set(approved.map(c => (c.claim_date || c.created_date || '').slice(0, 10)))];
  const count = streak?.current_count || 0;
  const longest = streak?.longest_count || 0;
  const mult = streakMultiplier(count);

  return (
    <Shell role="kid">
      <Header title="Your Streak" />

      <Card className="p-6 mb-4 bg-gradient-to-br from-secondary to-accent text-primary-foreground">
        <div className="flex items-baseline gap-3">
          <span className="flame text-6xl">🔥</span>
          <span className="font-display text-6xl font-bold leading-none">{count}</span>
          <span className="text-sm opacity-80">{count === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="flex gap-4 mt-4 text-sm opacity-90">
          <div>Longest: <strong>{longest}</strong></div>
          {mult > 1 && <div>Today's bonus: <strong>+{Math.round((mult-1)*100)}%</strong></div>}
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-display text-lg font-semibold mb-3">Last 12 weeks</h2>
        <StreakHeatmap completedDates={completedDates} />
        <div className="mt-3 text-xs text-muted-foreground">{completedDates.length} active days</div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Milestones</h2>
        <div className="space-y-2">
          {MILESTONES.map(m => {
            const hit = longest >= m.days;
            return (
              <div key={m.days} className={`flex items-center gap-3 p-3 rounded-xl ${hit ? 'bg-success/10' : 'bg-muted/50'}`}>
                <div className="text-2xl">{m.emoji}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{m.days}-day streak</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
                {hit ? <span className="text-success text-xs font-bold">✓ UNLOCKED</span> : <span className="text-xs text-muted-foreground">{m.days - longest} to go</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </Shell>
  );
}