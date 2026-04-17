import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckSquare, TrendingUp, Users, Plus, BarChart3, Medal, Baby, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { toast } from 'sonner';

export default function ParentDashboard() {
  const nav = useNavigate();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: kids = [] } = useQuery({
    queryKey: ['kids', me?.family_id],
    queryFn: () => base44.entities.User.filter({ family_id: me.family_id, app_role: 'kid' }),
    enabled: !!me?.family_id,
  });
  const { data: claims = [] } = useQuery({
    queryKey: ['claims', me?.family_id],
    queryFn: () => base44.entities.ChoreClaim.filter({ family_id: me.family_id }, '-created_date', 50),
    enabled: !!me?.family_id,
  });

  const pending = claims.filter(c => c.status === 'submitted');
  const approved = claims.filter(c => c.status === 'approved');
  const totalPaid = approved.reduce((s, c) => s + (c.paid_amount || 0), 0);
  const thisWeek = approved.filter(c => new Date(c.created_date) > new Date(Date.now() - 7 * 86400000));

  const copyCode = () => {
    navigator.clipboard.writeText(family.invite_code);
    toast.success('Family code copied!');
  };

  return (
    <Shell role="parent">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-3xl font-bold text-primary">{family?.name || 'Your family'}</h1>
      </header>

      {/* Invite code card */}
      <Card className="p-5 mb-5 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">Family code</div>
            <div className="font-mono text-3xl font-bold tracking-widest mt-1">{family?.invite_code || '—'}</div>
          </div>
          <Button onClick={copyCode} variant="secondary" size="sm" className="rounded-full">
            <Copy className="w-4 h-4 mr-1.5" /> Copy
          </Button>
        </div>
        <p className="text-xs opacity-70 mt-3">Share this code with your kids to join the family.</p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat icon={CheckSquare} label="Pending" value={pending.length} tone="accent" onClick={() => nav('/parent/approvals')} />
        <Stat icon={Users} label="Kids" value={kids.length} tone="primary" />
        <Stat icon={TrendingUp} label="This week" value={formatMoney(thisWeek.reduce((s,c)=>s+(c.paid_amount||0),0), family?.currency_symbol)} tone="secondary" onClick={() => nav('/parent/reports')} />
      </div>

      {/* Coach CTA */}
      <Card onClick={() => nav('/parent/coach')} className="p-4 mb-3 cursor-pointer bounce-tap bg-gradient-to-br from-secondary/20 to-accent/30 border-secondary/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-display font-bold leading-tight">Ask the Chore Coach</div>
          <div className="text-xs text-muted-foreground">Plan chores, get advice, analyze activity</div>
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button onClick={() => nav('/parent/kids')} className="bounce-tap flex items-center gap-2 p-3 rounded-xl bg-card border border-border text-sm font-medium">
          <Baby className="w-4 h-4 text-secondary" /> Kids
        </button>
        <button onClick={() => nav('/parent/reports')} className="bounce-tap flex items-center gap-2 p-3 rounded-xl bg-card border border-border text-sm font-medium">
          <BarChart3 className="w-4 h-4 text-primary" /> Reports
        </button>
        <button onClick={() => nav('/parent/leaderboard')} className="bounce-tap flex items-center gap-2 p-3 rounded-xl bg-card border border-border text-sm font-medium">
          <Medal className="w-4 h-4" /> Top kids
        </button>
      </div>

      {/* Kids list */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Your kids</h2>
        </div>
        {kids.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            No kids yet. Share your family code above to get them started.
          </Card>
        ) : (
          <div className="space-y-2">
            {kids.map(k => {
              const kidApproved = approved.filter(c => c.kid_email === k.email);
              const earned = kidApproved.reduce((s,c)=>s+(c.paid_amount||0),0);
              return (
                <Card key={k.id} className="p-4 flex items-center gap-4">
                  <div className="text-3xl">{k.avatar_emoji || '🦊'}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{k.display_name || k.full_name}</div>
                    <div className="text-xs text-muted-foreground">{kidApproved.length} chores completed</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold text-primary">{formatMoney(earned, family?.currency_symbol)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">earned</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Recent activity</h2>
        {claims.slice(0, 6).length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">No activity yet. Add some chores to get started.</p>
            <Button onClick={() => nav('/parent/chores')} size="sm"><Plus className="w-4 h-4 mr-1" /> Add chores</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {claims.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="text-xl">{c.chore_emoji || '✨'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.chore_title}</div>
                  <div className="text-xs text-muted-foreground">{c.kid_name} · {statusLabel(c.status)}</div>
                </div>
                <div className="text-sm font-semibold">{formatMoney(c.chore_value, family?.currency_symbol)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

const Stat = ({ icon: Icon, label, value, tone, onClick }) => {
  const toneMap = { accent: 'bg-accent/30', primary: 'bg-primary/10', secondary: 'bg-secondary/15' };
  return (
    <Card onClick={onClick} className={`p-4 ${onClick ? 'cursor-pointer bounce-tap' : ''}`}>
      <div className={`w-9 h-9 rounded-xl ${toneMap[tone]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="font-display text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
    </Card>
  );
};

const statusLabel = (s) => ({
  claimed: 'Claimed',
  before_done: 'In progress',
  submitted: 'Awaiting review',
  approved: 'Approved ✓',
  redo: 'Needs redo',
}[s] || s);