import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/MessageBubble';
import MessageComposer from '@/components/MessageComposer';
import { notify, notifyParents } from '@/lib/notify';
import { MessageSquare } from 'lucide-react';

export default function ClaimCommentThread({ claim, me }) {
  const qc = useQueryClient();
  const key = ['claimThread', claim.id];

  const { data: messages = [] } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.Message.filter({ claim_id: claim.id, scope: 'claim' }, 'created_date', 50),
    refetchInterval: 15000,
  });

  const send = useMutation({
    mutationFn: async (text) => {
      await base44.entities.Message.create({
        family_id: claim.family_id,
        author_email: me.email,
        author_name: me.display_name || me.full_name,
        author_emoji: me.avatar_emoji || '🙂',
        author_role: me.app_role,
        text,
        scope: 'claim',
        claim_id: claim.id,
        reactions: {},
      });
      const title = `💬 Comment on "${claim.chore_title}"`;
      const body = `${me.display_name || me.full_name}: ${text.slice(0, 60)}`;
      if (me.app_role === 'parent') {
        await notify({
          recipient_email: claim.kid_email, family_id: claim.family_id,
          type: 'message', title, body, emoji: '💬', link: `/kid/do/${claim.id}`,
        });
      } else {
        await notifyParents({
          family_id: claim.family_id, type: 'message', title, body, emoji: '💬',
          link: '/parent/approvals',
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="border-t border-border pt-3 mt-3">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <MessageSquare className="w-3.5 h-3.5" /> Comments {messages.length > 0 && `(${messages.length})`}
      </div>
      {messages.length > 0 && (
        <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
          {messages.map(m => <MessageBubble key={m.id} msg={m} me={me} invalidateKey={key} />)}
        </div>
      )}
      <MessageComposer onSend={(t) => send.mutate(t)} disabled={send.isPending} />
    </div>
  );
}