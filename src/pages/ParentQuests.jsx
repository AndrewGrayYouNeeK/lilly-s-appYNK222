import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Plus, Trophy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EMOJIS = ['🏆','🎬','🍕','🎮','🏖️','🍦','🎳','🚗','🎢','🌟'];

export default function ParentQuests() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: quests = [] } = useQuery({
    queryKey: ['quests', me?.family_id],
    queryFn: () => base44.entities.FamilyQuest.filter({ family_id: me.family_id }, '-created_date'),
    enabled: !!me?.family_id,
  });
  const { data: claims = [] } = useQuery({
    queryKey: ['claimsApproved', me?.family_id],
    queryFn: () => base44.entities.ChoreClaim.filter({ family_id: me.family_id, status: 'approved' }),
    enabled: !!me?.family_id,
  });

  const [form, setForm] = useState({ title:'', description:'', target_count:'', reward:'', emoji:'🏆' });
  const [show, setShow] = useState(false);

  const add = useMutation({
    mutationFn: (d) => base44.entities.FamilyQuest.create({ ...d, family_id: me.family_id, status: 'active' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quests'] }); setShow(false); setForm({ title:'', description:'', target_count:'', reward:'', emoji:'🏆' }); toast.success('Family quest started!'); },
  });
  const del = useMutation({
    mutationFn: (id) => base44.entities.FamilyQuest.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quests'] }),
  });

  const progressOf = (q) => {
    const since = new Date(q.created_date);
    return claims.filter(c => new Date(c.created_date) >= since).length;
  };

  return (
    <Shell role="parent">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Family Quests</h1>
          <p className="text-sm text-muted-foreground">Shared goals the whole family works on</p>
        </div>
        <Button onClick={() => setShow(v => !v)} className="rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </header>

      {show && (
        <Card className="p-5 mb-4">
          <h3 className="font-display text-lg font-semibold mb-3">New family quest</h3>
          <div className="space-y-3">
            <Input placeholder="Title (e.g. Family Movie Night)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Target chores" value={form.target_count} onChange={e => setForm({...form, target_count: e.target.value})} />
              <Input placeholder="Reward" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm({...form, emoji: e})}
                  className={`text-xl w-10 h-10 rounded-lg ${form.emoji === e ? 'bg-secondary/20 ring-2 ring-secondary' : 'bg-muted'}`}>{e}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShow(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => form.title && form.target_count && add.mutate({ ...form, target_count: Number(form.target_count) })}>
                Start quest
              </Button>
            </div>
          </div>
        </Card>
      )}

      {quests.length === 0 ? (
        <Card className="p-10 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <div className="font-display text-lg font-semibold">No quests yet</div>
          <p className="text-sm text-muted-foreground">Create a goal for everyone to work toward.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {quests.map(q => {
            const p = progressOf(q);
            const pct = Math.min(100, (p / q.target_count) * 100);
            const done = q.status === 'completed' || p >= q.target_count;
            return (
              <Card key={q.id} className={`p-5 ${done ? 'bg-success/10 border-success/40' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{q.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-lg font-bold truncate">{q.title}</div>
                      {done && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success text-success-foreground">COMPLETE</span>}
                    </div>
                    {q.description && <div className="text-xs text-muted-foreground mt-0.5">{q.description}</div>}
                    {q.reward && <div className="text-xs font-semibold mt-1">🎁 Reward: {q.reward}</div>}
                    <div className="mt-3">
                      <Progress value={pct} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">{p} / {q.target_count} chores</div>
                    </div>
                  </div>
                  <button onClick={() => del.mutate(q.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}