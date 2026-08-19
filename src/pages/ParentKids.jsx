import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Save, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { toast } from 'sonner';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ParentKids() {
  const qc = useQueryClient();
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
  const { data: allowances = [] } = useQuery({
    queryKey: ['allowances', me?.family_id],
    queryFn: () => api.entities.Allowance.filter({ family_id: me.family_id }),
    enabled: !!me?.family_id,
  });

  const sym = family?.currency_symbol || '$';

  return (
    <Shell role="parent">
      <Header title="Kids" />

      {kids.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <div className="font-display text-lg font-semibold">No kids yet</div>
          <p className="text-sm text-muted-foreground">Share the family code to invite them.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {kids.map(k => (
            <KidCard
              key={k.id}
              kid={k}
              allowance={allowances.find(a => a.kid_email === k.email)}
              sym={sym}
              familyId={me?.family_id}
              onChanged={() => {
                qc.invalidateQueries({ queryKey: ['kids'] });
                qc.invalidateQueries({ queryKey: ['allowances'] });
              }}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

function KidCard({ kid, allowance, sym, familyId, onChanged }) {
  const [amount, setAmount] = useState(allowance?.amount ?? '');
  const [day, setDay] = useState(allowance?.day_of_week ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) {
        if (allowance) await api.entities.Allowance.delete(allowance.id);
        toast.success('Allowance removed');
      } else if (allowance) {
        await api.entities.Allowance.update(allowance.id, { amount: amt, day_of_week: Number(day), active: true });
        toast.success('Updated');
      } else {
        await api.entities.Allowance.create({
          family_id: familyId,
          kid_email: kid.email,
          kid_name: kid.display_name || kid.full_name,
          amount: amt,
          day_of_week: Number(day),
          active: true,
        });
        toast.success('Allowance set');
      }
      onChanged();
    } catch { toast.error('Could not save'); }
    setSaving(false);
  };

  const removeKid = async () => {
    if (!confirm(`Remove ${kid.display_name || kid.full_name} from the family?`)) return;
    await api.auth.updateMe; // noop — we update the target kid via User entity
    await api.entities.User.update(kid.id, { family_id: null, app_role: null });
    if (allowance) await api.entities.Allowance.delete(allowance.id);
    toast.success('Removed');
    onChanged();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-4xl">{kid.avatar_emoji || '🦊'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-bold truncate">{kid.display_name || kid.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{kid.email}</div>
        </div>
        <button onClick={removeKid} className="p-2 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="bg-muted/50 rounded-xl p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Weekly allowance</div>
        <div className="grid grid-cols-[1fr_auto] gap-2 mb-2">
          <Input type="number" step="0.25" placeholder={`0.00`} value={amount} onChange={e => setAmount(e.target.value)} />
          <Button onClick={save} disabled={saving} className="rounded-xl">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {DAYS.map((d, i) => (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={`px-2.5 py-1 text-xs rounded-full font-semibold ${Number(day) === i ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'}`}
            >
              {d}
            </button>
          ))}
        </div>
        {allowance && (
          <div className="text-xs text-muted-foreground mt-2">
            Paying {formatMoney(allowance.amount, sym)} every {DAYS[allowance.day_of_week]}
            {allowance.last_paid_date && ` · last paid ${allowance.last_paid_date}`}
          </div>
        )}
      </div>
    </Card>
  );
}