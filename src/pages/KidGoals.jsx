import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { toast } from 'sonner';

const EMOJIS = ['🎯','🚲','🎮','📱','🎸','⚽','🎨','📚','🛹','🪀','🎧','🧸'];

export default function KidGoals() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['goals', me?.email],
    queryFn: () => base44.entities.SavingsGoal.filter({ kid_email: me.email }, '-created_date'),
    enabled: !!me?.email,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', target_amount: '', emoji: '🎯', allocation_pct: 20 });

  const create = useMutation({
    mutationFn: () => base44.entities.SavingsGoal.create({
      family_id: me.family_id,
      kid_email: me.email,
      title: form.title.trim(),
      emoji: form.emoji,
      target_amount: Number(form.target_amount),
      allocation_pct: Number(form.allocation_pct) || 0,
      saved_amount: 0,
      status: 'active',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setForm({ title: '', target_amount: '', emoji: '🎯', allocation_pct: 20 });
      toast.success('Goal created!');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.SavingsGoal.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const submit = () => {
    if (!form.title.trim() || !form.target_amount) return toast.error('Fill in title and target');
    create.mutate();
  };

  const sym = family?.currency_symbol || '$';

  return (
    <Shell role="kid">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">What are you saving up for?</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="rounded-full"><Plus className="w-4 h-4 mr-1" />New</Button>
      </header>

      {showForm && (
        <Card className="p-5 mb-4">
          <h3 className="font-display text-lg font-semibold mb-3">New goal</h3>
          <div className="space-y-3">
            <Input placeholder="What are you saving for?" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Input type="number" step="0.01" placeholder="Target amount" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} />
            <div>
              <label className="text-xs text-muted-foreground">Auto-save from earnings: <strong>{form.allocation_pct}%</strong></label>
              <input type="range" min="0" max="100" step="5" value={form.allocation_pct}
                onChange={e => setForm({...form, allocation_pct: e.target.value})}
                className="w-full mt-1 accent-secondary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Icon</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({...form, emoji: e})}
                    className={`text-xl w-10 h-10 rounded-lg ${form.emoji === e ? 'bg-secondary/20 ring-2 ring-secondary' : 'bg-muted'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit}>Save goal</Button>
            </div>
          </div>
        </Card>
      )}

      {goals.length === 0 && !showForm ? (
        <Card className="p-10 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <div className="font-display text-lg font-semibold">No goals yet</div>
          <p className="text-sm text-muted-foreground">Set one and auto-save a slice of each earning.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            const done = g.status === 'achieved' || g.saved_amount >= g.target_amount;
            return (
              <Card key={g.id} className={`p-4 ${done ? 'bg-success/10 border-success' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-4xl">{g.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg font-bold leading-tight">{g.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMoney(g.saved_amount, sym)} of {formatMoney(g.target_amount, sym)}
                      {g.allocation_pct > 0 && ` · auto-saving ${g.allocation_pct}%`}
                    </div>
                  </div>
                  <button onClick={() => confirm('Delete this goal?') && remove.mutate(g.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
                  <span>{pct}% there</span>
                  {done ? <span className="text-success font-bold">🎉 Achieved!</span> : <span>{formatMoney(g.target_amount - g.saved_amount, sym)} to go</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}