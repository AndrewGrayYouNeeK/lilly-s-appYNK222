import { base44 } from '@/api/base44Client';

// Compute current family pool balance from transaction log
export const computeFamilyBalance = (txs = []) =>
  txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

export const loadFamilyWalletTxs = (family_id) =>
  base44.entities.FamilyWalletTransaction.filter({ family_id }, '-created_date');