import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Inbox, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { notify } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const METHODS = ['Cash', 'Venmo', 'Zelle', 'PayPal', 'Apple Pay', 'Bank transfer', 'Other'];

export default function ParentCashouts() {
  const qc = useQueryClient();
  const [method, setMethod] = useState({});
  const [note, setNote] = useState({});

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ['parentCashouts', me?.family_id],
    queryFn: () => base44.entities.CashoutRequest.filter({ family_id: me.family_id }, '-created_date'),
    enabled: !!me?.family_id,
  });

  const sym = family?.currency_symbol || '$';
  const pending = requests.filter(r => r.status === 'pending');
  const history = requests.filter(r => r.status !== 'pending').slice(0, 20);

  const markPaid = useMutation({
    mutationFn: async (r) => {
      const pm = method[r.id] || 'Cash';
      await base44.entities.CashoutRequest.update(r.id, {
        status: 'paid',
        payment_method: pm,
        parent_note: note[r.id] || undefined,
        resolved_at: new Date().toISOString(),
        resolved_by: me.email,
      });
      // Deduct from kid's ledger
      await base44.entities.WalletTransaction.create({
        kid_email: r.kid_email,
        family_id: r.family_id,
        amount: r.amount,
        type: 'cashout',
        description: `Cashed out via ${pm}`,
      });
      await notify({
        recipient_email: r.kid_email,
        family_id: r.family_id,
        type: 'approval',
        emoji: '💸',
        title: `You got paid ${formatMoney(r.amount, sym)}!`,
        body: `Via ${pm}${note[r.id] ? ` · ${note[r.id]}` : ''}`,
        link: '/kid/wallet',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parentCashouts'] });
      toast.success('Marked as paid ✅');
    },
    onError: (e) => toast.error(e.message),
  });

  const deny = useMutation({
    mutationFn: async (r) => {
      await base44.entities.CashoutRequest.update(r.id, {
        status: 'denied',
        parent_note: note[r.id] || undefined,
        resolved_at: new Date().toISOString(),
        resolved_by: me.email,
      });
      await notify({
        recipient_email: r.kid_email,
        family_id: r.family_id,
        type: 'message',
        emoji: '❌',
        title: 'Cashout request denied',
        body: note[r.id] || 'Talk to your parent',
        link: '/kid/wallet',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parentCashouts'] });
      toast('Denied');
    },
  });

  return (
    <Shell role="parent">
      <Header title="Cashouts" />

      {pending.length === 0 ? (
        <Card className="p-10 text-center mb-6">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-display text-lg font-semibold">No cashout requests</div>
          <p className="text-sm text-muted-foreground">Kids can request payouts from their wallet.</p>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {pending.map(r => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{r.kid_emoji || '🦊'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.kid_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}
                  </div>
                </div>
                <div className="font-display text-2xl font-bold text-primary">
                  {formatMoney(r.amount, sym)}
                </div>
              </div>

              {r.note && (
                <div className="p-3 rounded-xl bg-muted/60 text-sm mb-3">"{r.note}"</div>
              )}

              <div className="mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay with</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {METHODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod({ ...method, [r.id]: m })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition bounce-tap ${
                        (method[r.id] || 'Cash') === m
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Note (optional)"
                value={note[r.id] || ''}
                onChange={e => setNote({ ...note, [r.id]: e.target.value })}
                rows={2}
                className="mb-3"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => deny.mutate(r)}
                  disabled={deny.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1.5" /> Deny
                </Button>
                <Button
                  onClick={() => markPaid.mutate(r)}
                  disabled={markPaid.isPending}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Check className="w-4 h-4 mr-1.5" /> Mark paid
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mb-2">Recent</h2>
          <div className="space-y-2">
            {history.map(r => {
              const isPaid = r.status === 'paid';
              const Icon = isPaid ? CheckCircle2 : XCircle;
              return (
                <Card key={r.id} className="p-3 flex items-center gap-3">
                  <div className="text-xl">{r.kid_emoji || '🦊'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {r.kid_name} · {formatMoney(r.amount, sym)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isPaid ? `Paid via ${r.payment_method || 'Cash'}` : 'Denied'} ·{' '}
                      {r.resolved_at ? formatDistanceToNow(new Date(r.resolved_at), { addSuffix: true }) : ''}
                    </div>
                  </div>
                  <Icon className={`w-5 h-5 ${isPaid ? 'text-success' : 'text-muted-foreground'}`} />
                </Card>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}