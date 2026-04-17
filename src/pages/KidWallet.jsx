import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/cq';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';

export default function KidWallet() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['txs', me?.email],
    queryFn: () => base44.entities.WalletTransaction.filter({ kid_email: me.email }, '-created_date'),
    enabled: !!me?.email,
  });

  const sym = family?.currency_symbol || '$';
  const earned = txs.filter(t => t.type === 'earn').reduce((s, t) => s + t.amount, 0);
  const bonus = txs.filter(t => t.type === 'bonus').reduce((s, t) => s + t.amount, 0);
  const spent = txs.filter(t => ['spend','cashout'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const balance = earned + bonus - spent;

  return (
    <Shell role="kid">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-bold">Wallet</h1>
      </header>

      <Card className="p-6 mb-4 bg-primary text-primary-foreground">
        <div className="text-xs uppercase tracking-wider opacity-70">Balance</div>
        <div className="font-display text-5xl font-bold mt-1">{formatMoney(balance, sym)}</div>
        <div className="flex gap-4 mt-4 text-sm opacity-80">
          <div>Earned {formatMoney(earned, sym)}</div>
          {bonus > 0 && <div>+ Bonus {formatMoney(bonus, sym)} 🔥</div>}
        </div>
      </Card>

      <h2 className="font-display text-lg font-semibold mb-2">History</h2>
      {txs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No transactions yet. Complete a quest to earn!
        </Card>
      ) : (
        <div className="space-y-2">
          {txs.map(t => {
            const isIn = ['earn','bonus'].includes(t.type);
            return (
              <Card key={t.id} className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIn ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {t.type === 'bonus' ? <Sparkles className="w-5 h-5" /> : isIn ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.description || t.type}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(t.created_date), 'MMM d · h:mm a')}</div>
                </div>
                <div className={`font-display font-bold ${isIn ? 'text-success' : ''}`}>
                  {isIn ? '+' : '−'}{formatMoney(t.amount, sym)}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}