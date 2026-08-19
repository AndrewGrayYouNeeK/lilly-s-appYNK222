import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Check } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { toast } from 'sonner';

const EMOJIS = ['🎁','🍦','🎮','📱','🎬','🍕','⚽','🎨','📚','🏖️','🧸','🎟️'];

export default function ParentShop() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['shopAll', me?.family_id],
    queryFn: () => api.entities.ShopItem.filter({ family_id: me.family_id }),
    enabled: !!me?.family_id,
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchasesAll', me?.family_id],
    queryFn: () => api.entities.Purchase.filter({ family_id: me.family_id }, '-created_date'),
    enabled: !!me?.family_id,
  });

  const [form, setForm] = useState({ title:'', description:'', price:'', emoji:'🎁' });
  const [show, setShow] = useState(false);

  const add = useMutation({
    mutationFn: (d) => api.entities.ShopItem.create({ ...d, family_id: me.family_id, active: true, kind: 'real' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopAll'] }); setShow(false); setForm({ title:'', description:'', price:'', emoji:'🎁' }); toast.success('Reward added'); },
  });
  const del = useMutation({
    mutationFn: (id) => api.entities.ShopItem.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopAll'] }),
  });
  const fulfill = useMutation({
    mutationFn: (id) => api.entities.Purchase.update(id, { status: 'fulfilled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchasesAll'] }); toast.success('Marked fulfilled'); },
  });

  const pending = purchases.filter(p => p.status === 'pending');
  const sym = family?.currency_symbol || '$';

  return (
    <Shell role="parent">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Rewards Shop</h1>
          <p className="text-sm text-muted-foreground">{items.length} rewards · {pending.length} pending</p>
        </div>
        <Button onClick={() => setShow(v => !v)} className="rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </header>

      {show && (
        <Card className="p-5 mb-4">
          <h3 className="font-display text-lg font-semibold mb-3">New reward</h3>
          <div className="space-y-3">
            <Input placeholder="Title (e.g. Ice cream trip)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            <Input type="number" step="0.25" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm({...form, emoji: e})}
                  className={`text-xl w-10 h-10 rounded-lg ${form.emoji === e ? 'bg-secondary/20 ring-2 ring-secondary' : 'bg-muted'}`}>{e}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShow(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => form.title && form.price && add.mutate({ ...form, price: Number(form.price) })}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mb-2">Pending fulfillment</h2>
          <div className="space-y-2 mb-5">
            {pending.map(p => (
              <Card key={p.id} className="p-3 flex items-center gap-3">
                <div className="text-2xl">{p.item_emoji}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.item_title}</div>
                  <div className="text-xs text-muted-foreground">{p.kid_name} · {formatMoney(p.price, sym)}</div>
                </div>
                <Button size="sm" onClick={() => fulfill.mutate(p.id)} className="bg-success hover:bg-success/90 text-success-foreground">
                  <Check className="w-3 h-3 mr-1" /> Done
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="font-display text-lg font-semibold mb-2">Available rewards</h2>
      <div className="space-y-2">
        {items.map(it => (
          <Card key={it.id} className="p-3 flex items-center gap-3">
            <div className="text-2xl">{it.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{it.title}</div>
              {it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}
            </div>
            <div className="font-display font-bold">{formatMoney(it.price, sym)}</div>
            <button onClick={() => del.mutate(it.id)} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    </Shell>
  );
}