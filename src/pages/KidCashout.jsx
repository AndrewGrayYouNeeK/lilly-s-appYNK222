import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { notifyParents } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function KidCashout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['txs', me?.email],
    queryFn: () => api.entities.WalletTransaction.filter({ kid_email: me.email }),
    enabled: !!me?.email,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ['cashouts', me?.email],
    queryFn: () => api.entities.CashoutRequest.filter({ kid_email: me.email }, '-created_date'),
    enabled: !!me?.email,
  });

  const sym = family?.currency_symbol || '$';
  const earned = txs.filter(t => ['earn', 'bonus'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const spent = txs.filter(t => ['spend', 'cashout'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const pendingAmount = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const available = Math.round((earned - spent - pendingAmount) * 100) / 100;

  const request = useMutation({
    mutationFn: async () => {
      const v = Math.round(Number(amount) * 100) / 100;
      if (!v || v <= 0) throw new Error('Enter an amount');
      if (v > available) throw new Error(`You only have ${formatMoney(available, sym)} available`);
      const req = await api.entities.CashoutRequest.create({
        family_id: me.family_id,
        kid_email: me.email,
        kid_name: me.display_name || me.full_name,
        kid_emoji: me.avatar_emoji || '🦊',
        amount: v,
        note: note.trim() || undefined,
        status: 'pending',
      });
      await notifyParents({
        family_id: me.family_id,
        type: 'message',
        emoji: '💸',
        title: `${me.display_name || me.full_name} requested ${formatMoney(v, sym)}`,
        body: note.trim() || 'Tap to review the cashout request',
        link: '/parent/cashouts',
      });
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashouts'] });
      setAmount(''); setNote('');
      toast.success('Request sent to your parent! 💸');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Shell role="kid">
      <Header title="Cash out" />

      <Card className="p-5 mb-4 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
          <Wallet className="w-4 h-4" /> Available
        </div>
        <div className="font-display text-4xl font-bold mt-1">{formatMoney(available, sym)}</div>
        {pendingAmount > 0 && (
          <div className="text-xs opacity-80 mt-2">{formatMoney(pendingAmount, sym)} waiting for approval</div>
        )}
      </Card>

      <Card className="p-5 mb-5">
        <div className="font-display text-lg font-bold mb-3">Request cashout</div>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{sym}</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max={available}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="pl-8 h-12 text-lg font-semibold"
          />
        </div>
        <Textarea
          placeholder="Note to parent (optional) — e.g. 'Saving for a game'"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          className="mb-3"
        />
        <Button
          onClick={() => request.mutate()}
          disabled={request.isPending || !amount || available <= 0}
          className="w-full h-12 rounded-xl text-base"
        >
          <Send className="w-4 h-4 mr-1.5" /> Send request
        </Button>
        {available <= 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">Complete more quests to earn!</p>
        )}
      </Card>

      <h2 className="font-display text-lg font-semibold mb-2">Your requests</h2>
      {requests.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No cashout requests yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map(r => {
            const cfg = {
              pending: { icon: Clock, color: 'text-accent-foreground', bg: 'bg-accent/40', label: 'Waiting' },
              paid: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/15', label: 'Paid' },
              denied: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Denied' },
            }[r.status] || { icon: Clock, color: '', bg: 'bg-muted', label: r.status };
            const Icon = cfg.icon;
            return (
              <Card key={r.id} className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{formatMoney(r.amount, sym)}</div>
                  <div className="text-xs text-muted-foreground">
                    {cfg.label}
                    {r.payment_method && ` · via ${r.payment_method}`}
                    {' · '}
                    {formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}
                  </div>
                  {r.parent_note && <div className="text-xs text-muted-foreground italic mt-0.5">"{r.parent_note}"</div>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}