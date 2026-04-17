import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only (scheduled automation runs as admin) — also allow authenticated parent for manual runs.
    const user = await base44.auth.me().catch(() => null);
    const isAdmin = user?.role === 'admin';
    const isParent = user?.app_role === 'parent';
    if (!isAdmin && !isParent) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const dow = today.getUTCDay();

    // Get all active allowances scheduled for today that haven't been paid yet today
    const allowances = await base44.asServiceRole.entities.Allowance.filter({ active: true, day_of_week: dow });
    let paid = 0;

    for (const a of allowances) {
      if (a.last_paid_date === iso) continue;
      await base44.asServiceRole.entities.WalletTransaction.create({
        kid_email: a.kid_email,
        family_id: a.family_id,
        amount: a.amount,
        type: 'earn',
        description: `Weekly allowance`,
      });
      await base44.asServiceRole.entities.Allowance.update(a.id, { last_paid_date: iso });
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: a.kid_email,
        family_id: a.family_id,
        type: 'approval',
        emoji: '💰',
        title: `Allowance paid: ${a.amount}`,
        body: 'Your weekly allowance just landed in your wallet',
        link: '/kid/wallet',
        read: false,
      });
      paid++;
    }

    return Response.json({ paid, total: allowances.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});