import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/cq';
import { toast } from 'sonner';
import { ShoppingBag, Clock } from 'lucide-react';

export default function KidShop() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => base44.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['shop', me?.family_id],
    queryFn: () => base44.entities.ShopItem.filter({ family_id: me.family_id, active: true }),
    enabled: !!me?.family_id,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['txs', me?.email],
    queryFn: () => base44.entities.WalletTransaction.filter({ kid_email: me.email }),
    enabled: !!me?.email,
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', me?.email],
    queryFn: () => base44.entities.Purchase.filter({ kid_email: me.email }, '-created_date'),
    enabled: !!me?.email,
  });

  const balance = txs.reduce((s, t) => s + (['earn','bonus'].includes(t.type) ? t.amount : -t.amount), 0);
  const sym = family?.currency_symbol || '$';

  const buy = useMutation({
    mutationFn: async (item) => {
      if (balance < item.price) throw new Error('Not enough funds');
      await base44.entities.Purchase.create({
        family_id: me.family_id, kid_email: me.email, kid_name: me.display_name || me.full_name,
        item_id: item.id, item_title: item.title, item_emoji: item.emoji,
        price: item.price, status: 'pending',
      });
      await base44.entities.WalletTransaction.create({
        kid_email: me.email, family_id: me.family_id,
        amount: item.price, type: 'spend', description: `Bought: ${item.title}`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['txs'] }); qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success('Purchased! Waiting for parent.'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Shell role="kid">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Shop</h1>
          <p className="text-sm text-muted-foreground">Spend what you've earned</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Balance</div>
          <div className="font-display text-xl font-bold text-primary">{formatMoney(balance, sym)}</div>
        </div>
      </header>

      {items.length === 0 ? (
        <Card className="p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <div className="font-display text-lg font-semibold">Shop is empty</div>
          <p className="text-sm text-muted-foreground">Ask a parent to add rewards.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {items.map(it => {
            const canAfford = balance >= it.price;
            return (
              <Card key={it.id} className="p-4 flex flex-col">
                <div className="text-4xl mb-2">{it.emoji}</div>
                <div className="font-display font-bold leading-tight">{it.title}</div>
                {it.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{it.description}</div>}
                <div className="font-display text-lg font-bold mt-2">{formatMoney(it.price, sym)}</div>
                <Button size="sm" className="mt-2 rounded-full" disabled={!canAfford || buy.isPending} onClick={() => buy.mutate(it)}>
                  {canAfford ? 'Buy' : 'Save up'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {purchases.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mb-2">Your purchases</h2>
          <div className="space-y-2">
            {purchases.slice(0, 10).map(p => (
              <Card key={p.id} className="p-3 flex items-center gap-3">
                <div className="text-2xl">{p.item_emoji}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.item_title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {p.status === 'pending' ? <><Clock className="w-3 h-3" /> Pending</> : '✓ Fulfilled'}
                  </div>
                </div>
                <div className="font-semibold text-sm">{formatMoney(p.price, sym)}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}