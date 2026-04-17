import { base44 } from '@/api/base44Client';

// Create a notification for a single user or a list
export async function notify({ recipient_email, family_id, type, title, body, emoji, link }) {
  if (!recipient_email) return;
  await base44.entities.Notification.create({
    recipient_email, family_id, type, title, body, emoji: emoji || '🔔', link, read: false,
  });
}

// Notify all parents in a family
export async function notifyParents({ family_id, ...rest }) {
  const parents = await base44.entities.User.filter({ family_id, app_role: 'parent' });
  await Promise.all(parents.map(p => notify({ recipient_email: p.email, family_id, ...rest })));
}