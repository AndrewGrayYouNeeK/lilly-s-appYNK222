import { base44 } from '@/api/base44Client';

// 6 levels: Rookie → Hero → Legend
export const LEVELS = [
  { level: 1, title: 'Rookie',     threshold: 0,   color: 'text-muted-foreground', ring: 'stroke-muted-foreground' },
  { level: 2, title: 'Helper',     threshold: 5,   color: 'text-success',          ring: 'stroke-success' },
  { level: 3, title: 'Champion',   threshold: 15,  color: 'text-accent-foreground',ring: 'stroke-accent' },
  { level: 4, title: 'Hero',       threshold: 35,  color: 'text-secondary',        ring: 'stroke-secondary' },
  { level: 5, title: 'Superstar',  threshold: 70,  color: 'text-primary',          ring: 'stroke-primary' },
  { level: 6, title: 'Legend',     threshold: 120, color: 'text-secondary',        ring: 'stroke-secondary' },
];

export const getLevel = (completedCount = 0) => {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (completedCount >= l.threshold) cur = l;
  const next = LEVELS.find(l => l.threshold > completedCount);
  return { current: cur, next, completed: completedCount };
};

// Badge catalog (auto-awarded based on stats)
export const BADGE_CATALOG = [
  { key: 'first_quest',  title: 'First Quest',  emoji: '🎯', tier: 'bronze',    desc: 'Complete your first chore',       check: s => s.approved >= 1 },
  { key: 'five_quests',  title: 'Taking Off',   emoji: '🚀', tier: 'bronze',    desc: 'Complete 5 chores',               check: s => s.approved >= 5 },
  { key: 'ten_quests',   title: 'Double Digits',emoji: '🔟', tier: 'silver',    desc: 'Complete 10 chores',              check: s => s.approved >= 10 },
  { key: 'twentyfive',   title: 'Quest Master', emoji: '🏆', tier: 'gold',      desc: 'Complete 25 chores',              check: s => s.approved >= 25 },
  { key: 'fifty',        title: 'Legendary',    emoji: '👑', tier: 'legendary', desc: 'Complete 50 chores',              check: s => s.approved >= 50 },
  { key: 'streak_3',     title: 'On Fire',      emoji: '🔥', tier: 'bronze',    desc: '3-day streak',                    check: s => s.longestStreak >= 3 },
  { key: 'streak_7',     title: 'Week Warrior', emoji: '⚡', tier: 'silver',    desc: '7-day streak',                    check: s => s.longestStreak >= 7 },
  { key: 'streak_14',    title: 'Unstoppable',  emoji: '💫', tier: 'legendary', desc: '14-day streak',                   check: s => s.longestStreak >= 14 },
  { key: 'earner_10',    title: 'First Tenner', emoji: '💰', tier: 'bronze',    desc: 'Earn 10 in total',                check: s => s.totalEarned >= 10 },
  { key: 'earner_50',    title: 'Big Saver',    emoji: '💎', tier: 'gold',      desc: 'Earn 50 in total',                check: s => s.totalEarned >= 50 },
];

export const tierStyle = (tier) => ({
  bronze:    { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  silver:    { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300' },
  gold:      { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  legendary: { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-300' },
}[tier || 'bronze']);

// Award any newly-earned badges based on kid stats. Returns array of newly awarded badges.
export const checkAndAwardBadges = async ({ kidEmail, familyId }) => {
  const [approved, streakRows, owned] = await Promise.all([
    base44.entities.ChoreClaim.filter({ kid_email: kidEmail, status: 'approved' }),
    base44.entities.Streak.filter({ kid_email: kidEmail }),
    base44.entities.UserBadge.filter({ kid_email: kidEmail }),
  ]);
  const stats = {
    approved: approved.length,
    longestStreak: streakRows[0]?.longest_count || 0,
    totalEarned: approved.reduce((s, c) => s + (c.paid_amount || 0), 0),
  };
  const ownedKeys = new Set(owned.map(b => b.badge_key));
  const newly = [];
  for (const b of BADGE_CATALOG) {
    if (!ownedKeys.has(b.key) && b.check(stats)) {
      await base44.entities.UserBadge.create({
        kid_email: kidEmail, family_id: familyId,
        badge_key: b.key, badge_title: b.title, badge_emoji: b.emoji, badge_tier: b.tier,
      });
      newly.push(b);
    }
  }
  return newly;
};

// Check if a family quest is completed (based on total approved chores since quest created_date)
export const checkFamilyQuests = async (familyId) => {
  const quests = await base44.entities.FamilyQuest.filter({ family_id: familyId, status: 'active' });
  for (const q of quests) {
    const since = new Date(q.created_date);
    const approved = await base44.entities.ChoreClaim.filter({ family_id: familyId, status: 'approved' });
    const count = approved.filter(c => new Date(c.created_date) >= since).length;
    if (count >= q.target_count) {
      await base44.entities.FamilyQuest.update(q.id, { status: 'completed' });
    }
  }
};