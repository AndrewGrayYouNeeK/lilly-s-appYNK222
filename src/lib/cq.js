// ChoreQuest shared helpers
import { api } from '@/api/apiClient';

export const genInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (aISO, bISO) => {
  const a = new Date(aISO); const b = new Date(bISO);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

// streak multiplier based on current count
export const streakMultiplier = (count) => {
  if (count >= 14) return 2;
  if (count >= 7) return 1.5;
  if (count >= 3) return 1.25;
  return 1;
};

export const fetchMe = async () => {
  try { return await api.auth.me(); } catch { return null; }
};

export const formatMoney = (amount, symbol = '$') =>
  `${symbol}${(Number(amount) || 0).toFixed(2)}`;

export const difficultyStyle = (d) => ({
  easy:   { label: 'Easy',   bg: 'bg-success/15',  text: 'text-success',  ring: 'ring-success/30' },
  medium: { label: 'Medium', bg: 'bg-accent/25',   text: 'text-foreground', ring: 'ring-accent/40' },
  hard:   { label: 'Hard',   bg: 'bg-secondary/15',text: 'text-secondary', ring: 'ring-secondary/30' },
}[d || 'easy']);