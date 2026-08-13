import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { subDays } from 'date-fns';
import { formatMoney } from '@/lib/cq';

export default function Leaderboard() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: kids = [] } = useQuery({
    queryKey: ['kids', me?.family_id],
    queryFn: () => api.entities.User.filter({ family_id: me.family_id, app_role: 'kid' }),
    enabled: !!me?.family_id,
  });
  const { data: claims = [] } = useQuery({
    queryKey: ['claimsLB', me?.family_id],
    queryFn: () => api.entities.ChoreClaim.filter({ family_id: me.family_id, status: 'approved' }),
    enabled: !!me?.family_id,
  });
  const { data: streaks = [] } = useQuery({
    queryKey: ['streaksLB', me?.family_id],
    queryFn: () => api.entities.Streak.filter({ family_id: me.family_id }),
    enabled: !!me?.family_id,
  });

  const weekAgo = subDays(new Date(), 7);
  const weekClaims = claims.filter(c => new Date(c.created_date) >= weekAgo);

  const rows = kids.map(k => {
    const kc = weekClaims.filter(c => c.kid_email === k.email);
    const st = streaks.find(s => s.kid_email === k.email);
    return {
      kid: k,
      chores: kc.length,
      earned: kc.reduce((s, c) => s + (c.paid_amount || 0), 0),
      streak: st?.current_count || 0,
    };
  }).sort((a, b) => b.chores - a.chores || b.earned - a.earned);

  const sym = family?.currency_symbol || '$';
  const medals = ['🥇','🥈','🥉'];
  const role = me?.app_role === 'kid' ? 'kid' : 'parent';

  return (
    <Shell role={role}>
      <Header title="Leaderboard" />

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <div className="font-display text-lg font-semibold">No kids yet</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.kid.email === me?.email;
            return (
              <Card key={r.kid.id} className={`p-4 flex items-center gap-3 ${isMe ? 'ring-2 ring-secondary' : ''}`}>
                <div className="text-2xl w-8 text-center">{medals[i] || `#${i+1}`}</div>
                <div className="text-3xl">{r.kid.avatar_emoji || '🦊'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {r.kid.display_name || r.kid.full_name}
                    {isMe && <span className="text-xs text-secondary font-bold ml-2">YOU</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.chores} chore{r.chores !== 1 ? 's' : ''} · 🔥 {r.streak}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold">{formatMoney(r.earned, sym)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">this week</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}