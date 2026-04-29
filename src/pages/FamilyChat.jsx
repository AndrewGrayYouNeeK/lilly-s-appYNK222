import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import MessageBubble from '@/components/MessageBubble';
import MessageComposer from '@/components/MessageComposer';
import { notifyParents, notify } from '@/lib/notify';

export default function FamilyChat() {
  const qc = useQueryClient();
  const bottomRef = useRef(null);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: messages = [] } = useQuery({
    queryKey: ['chat', me?.family_id],
    queryFn: () => base44.entities.Message.filter({ family_id: me.family_id, scope: 'family' }, 'created_date', 100),
    enabled: !!me?.family_id,
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (text) => {
      await base44.entities.Message.create({
        family_id: me.family_id,
        author_email: me.email,
        author_name: me.display_name || me.full_name,
        author_emoji: me.avatar_emoji || '🙂',
        author_role: me.app_role,
        text,
        scope: 'family',
        reactions: {},
      });
      // notify the other side
      const title = `${me.display_name || me.full_name}: ${text.slice(0, 40)}`;
      const link = me.app_role === 'parent' ? '/kid/chat' : '/parent/chat';
      if (me.app_role === 'kid') {
        await notifyParents({ family_id: me.family_id, type: 'message', title, emoji: '💬', link });
      } else {
        const kids = await base44.entities.User.filter({ family_id: me.family_id, app_role: 'kid' });
        await Promise.all(kids.map(k => notify({
          recipient_email: k.email, family_id: me.family_id, type: 'message', title, emoji: '💬', link,
        })));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }),
  });

  const role = me?.app_role === 'kid' ? 'kid' : 'parent';

  return (
    <Shell role={role}>
      <header className="mb-4">
        <h1 className="font-display text-3xl font-bold text-primary">Family Chat</h1>
        <p className="text-sm text-muted-foreground">Say hi — everyone in the family sees this</p>
      </header>

      <div className="space-y-4 mb-4 min-h-[40vh]">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <div className="text-4xl mb-2">👋</div>
            No messages yet. Be the first!
          </div>
        ) : messages.map(m => (
          <MessageBubble key={m.id} msg={m} me={me} invalidateKey={['chat', me?.family_id]} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        className="fixed left-0 right-0 px-5 z-30"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl mx-auto glass border border-border shadow-lg rounded-full p-1.5">
          <MessageComposer onSend={(t) => send.mutate(t)} disabled={send.isPending} />
        </div>
      </div>
    </Shell>
  );
}