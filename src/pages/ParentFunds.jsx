import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Minus } from 'lucide-react';
import { formatMoney } from '@/lib/cq';
import { computeFamilyBalance, loadFamilyWalletTxs } from '@/lib/familyWallet';
import { toast } from 'sonner';

const QUICK = [5, 10, 20, 50, 100];

export default function ParentFunds() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['familyWallet', me?.family_id],
    queryFn: () => loadFamilyWalletTxs(me.family_id),
    enabled: !!me?.family_id,
  });

  const sym = family?.currency_symbol || '$';
  const balance = computeFamilyBalance(txs);

  const deposit = useMutation({
    mutationFn: async (amt) => {
      const v = Math.round(Number(amt) * 100) / 100;
      if (!v || v <= 0) throw new Error('Enter a valid amount');
      await api.entities.FamilyWalletTransaction.create({
        family_id: me.family_id,
        amount: v,
        type: 'deposit',
        description: 'Deposit',
        actor_email: me.email,
      });
    },
    onMutate: async (amt) => {
      const v = Math.round(Number(amt) * 100) / 100;
      if (!v || v <= 0) return;
      await qc.cancelQueries({ queryKey: ['familyWallet', me?.family_id] });
      const prev = qc.getQueryData(['familyWallet', me?.family_id]);
      qc.setQueryData(['familyWallet', me?.family_id], (old = []) => [
        { id: `temp-d-${Date.now()}`, family_id: me.family_id,
          amount: v, type: 'deposit', description: 'Deposit',
          actor_email: me.email, created_date: new Date().toISOString(), _optimistic: true },
        ...old,
      ]);
      setAmount('');
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(['familyWallet', me?.family_id], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('Funds added! 💰'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['familyWallet', me?.family_id] }),
  });

  const withdraw = useMutation({
    mutationFn: async (amt) => {
      const v = Math.round(Number(amt) * 100) / 100;
      if (!v || v <= 0) throw new Error('Enter a valid amount');
      if (v > balance) throw new Error('Not enough in pool');
      await api.entities.FamilyWalletTransaction.create({
        family_id: me.family_id,
        amount: -v,
        type: 'adjustment',
        description: 'Manual withdrawal',
        actor_email: me.email,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyWallet', me.family_id] });
      setAmount('');
      toast.success('Withdrawn');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Shell role="parent">
      <Header title="Family Funds" />

      {/* Balance card */}
      <Card className="p-6 mb-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80 mb-1">
          <Wallet className="w-4 h-4" /> Pool balance
        </div>
        <div className="font-display text-5xl font-bold leading-none">{formatMoney(balance, sym)}</div>
        <p className="text-xs opacity-80 mt-2">Used to pay kids when you approve chores</p>
      </Card>

      {/* Deposit */}
      <Card className="p-5 mb-4">
        <div className="font-display text-lg font-bold mb-3">Add funds</div>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {QUICK.map(q => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className={`py-2 rounded-xl text-sm font-semibold border transition bounce-tap ${
                amount === String(q) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'
              }`}
            >
              {sym}{q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{sym}</span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="pl-8 h-11 text-lg font-semibold"
            />
          </div>
          <Button
            onClick={() => deposit.mutate(amount)}
            disabled={deposit.isPending || !amount}
            className="h-11 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
          <Button
            onClick={() => withdraw.mutate(amount)}
            disabled={withdraw.isPending || !amount}
            variant="outline"
            className="h-11 rounded-xl"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* History */}
      <h2 className="font-display text-lg font-semibold mb-2">History</h2>
      {txs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No activity yet. Add your first deposit above.
        </Card>
      ) : (
        <div className="space-y-2">
          {txs.map(t => {
            const positive = t.amount > 0;
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${positive ? 'bg-success/15 text-success' : 'bg-secondary/15 text-secondary'}`}>
                  {positive ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.description || t.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString()}</div>
                </div>
                <div className={`font-semibold ${positive ? 'text-success' : 'text-secondary'}`}>
                  {positive ? '+' : ''}{formatMoney(t.amount, sym)}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}