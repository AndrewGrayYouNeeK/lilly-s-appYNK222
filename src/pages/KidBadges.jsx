import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import AvatarRing from '@/components/AvatarRing';
import { BADGE_CATALOG, tierStyle } from '@/lib/gamification';

export default function KidBadges() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: owned = [] } = useQuery({
    queryKey: ['badges', me?.email],
    queryFn: () => api.entities.UserBadge.filter({ kid_email: me.email }),
    enabled: !!me?.email,
  });
  const { data: approved = [] } = useQuery({
    queryKey: ['approvedCount', me?.email],
    queryFn: () => api.entities.ChoreClaim.filter({ kid_email: me.email, status: 'approved' }),
    enabled: !!me?.email,
  });

  const ownedKeys = new Set(owned.map(b => b.badge_key));

  return (
    <Shell role="kid">
      <Header title="Achievements" />

      <Card className="p-5 mb-5">
        <AvatarRing emoji={me?.avatar_emoji || '🦊'} completedCount={approved.length} size={96} />
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Badges</h2>
        <span className="text-xs text-muted-foreground">{owned.length} / {BADGE_CATALOG.length}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {BADGE_CATALOG.map(b => {
          const has = ownedKeys.has(b.key);
          const s = tierStyle(b.tier);
          return (
            <Card key={b.key} className={`p-3 text-center ${has ? `${s.bg} ring-2 ${s.ring}` : 'opacity-50 grayscale'}`}>
              <div className="text-3xl mb-1">{b.emoji}</div>
              <div className={`text-xs font-semibold leading-tight ${has ? s.text : ''}`}>{b.title}</div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{b.desc}</div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}