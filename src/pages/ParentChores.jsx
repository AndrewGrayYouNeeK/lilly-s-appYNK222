import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Sparkles, Camera } from 'lucide-react';
import { difficultyStyle, formatMoney } from '@/lib/cq';
import { toast } from 'sonner';
import EmojiPickerDrawer from '@/components/EmojiPickerDrawer';

const EMOJIS = ['🧹','🛏️','🍽️','🗑️','🐕','🪴','🧺','📚','🚿','🧼','🪟','🧸','🍳','🧑‍🍳','🚽','🪥','👕','🧦','🚗','🍂'];

export default function ParentChores() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: chores = [] } = useQuery({
    queryKey: ['chores', me?.family_id],
    queryFn: () => api.entities.Chore.filter({ family_id: me.family_id }, '-created_date'),
    enabled: !!me?.family_id,
  });

  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', value:'', difficulty:'easy', emoji:'🧹', requires_photo: true });

  const createChore = useMutation({
    mutationFn: (data) => api.entities.Chore.create({ ...data, family_id: me.family_id, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chores'] }); setShowForm(false); setForm({ title:'', description:'', value:'', difficulty:'easy', emoji:'🧹', requires_photo: true }); toast.success('Chore added!'); },
  });

  const removeChore = useMutation({
    mutationFn: (id) => api.entities.Chore.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });

  const submit = () => {
    if (!form.title.trim() || !form.value) return toast.error('Fill in title and value');
    createChore.mutate({ ...form, value: Number(form.value) });
  };

  const aiSuggest = async () => {
    setAiLoading(true);
    try {
      const res = await api.integrations.Core.InvokeLLM({
        prompt: 'Suggest 5 age-appropriate household chores for kids 6-14. For each: short title (max 4 words), one-sentence description, suggested $ value (between 0.50 and 5.00), difficulty (easy/medium/hard), and a single emoji.',
        response_json_schema: {
          type: 'object',
          properties: {
            chores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  value: { type: 'number' },
                  difficulty: { type: 'string', enum: ['easy','medium','hard'] },
                  emoji: { type: 'string' },
                },
              },
            },
          },
        },
      });
      for (const c of (res.chores || [])) {
        await api.entities.Chore.create({ ...c, family_id: me.family_id, active: true, recurrence: 'daily' });
      }
      qc.invalidateQueries({ queryKey: ['chores'] });
      toast.success('Added 5 suggested chores!');
    } catch { toast.error('Could not generate right now.'); }
    setAiLoading(false);
  };

  return (
    <Shell role="parent">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Chore Pool</h1>
          <p className="text-sm text-muted-foreground">{chores.length} chores available</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </header>

      {!showForm && chores.length === 0 && (
        <Card className="p-5 mb-4 bg-accent/20 border-accent">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-1">Not sure what to add?</div>
              <p className="text-xs text-muted-foreground mb-3">Let AI suggest 5 age-appropriate chores.</p>
              <Button onClick={aiSuggest} disabled={aiLoading} size="sm" variant="outline">
                {aiLoading ? 'Thinking…' : '✨ Suggest chores'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-5 mb-4">
          <h3 className="font-display text-lg font-semibold mb-3">New chore</h3>
          <div className="space-y-3">
            <Input placeholder="Title (e.g. Make your bed)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-11" />
            <Textarea placeholder="Short description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="min-h-[44px]" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="0.25" placeholder="Value" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="h-11" />
              <Select value={form.difficulty} onValueChange={v => setForm({...form, difficulty: v})}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Emoji</label>
              <div className="mt-1.5">
                <EmojiPickerDrawer
                  value={form.emoji}
                  onChange={(v) => setForm({ ...form, emoji: v })}
                  options={EMOJIS}
                  title="Pick a chore emoji"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-start gap-2.5">
                <Camera className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-semibold leading-tight">Require photo proof</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">Kid uploads before/after photos. AI gives you a quality assessment.</div>
                </div>
              </div>
              <Switch checked={form.requires_photo} onCheckedChange={v => setForm({...form, requires_photo: v})} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 min-h-[44px]" onClick={submit}>Save chore</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {chores.map(c => {
          const d = difficultyStyle(c.difficulty);
          return (
            <Card key={c.id} className="p-4 flex items-center gap-3">
              <div className="text-3xl">{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold truncate">{c.title}</div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${d.bg} ${d.text}`}>{d.label}</span>
                  {c.requires_photo !== false && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-0.5">
                      <Camera className="w-2.5 h-2.5" /> Photo
                    </span>
                  )}
                </div>
                {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold">{formatMoney(c.value, family?.currency_symbol)}</div>
              </div>
              <button onClick={() => removeChore.mutate(c.id)} className="p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}