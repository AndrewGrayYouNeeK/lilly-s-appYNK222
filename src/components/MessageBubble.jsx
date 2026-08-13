import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { SmilePlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';

const REACTIONS = ['❤️', '😂', '🔥', '👍', '🎉', '😮'];

export default function MessageBubble({ msg, me, invalidateKey }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const isMe = msg.author_email === me?.email;

  const toggleReaction = async (emoji) => {
    setPicking(false);
    const reactions = { ...(msg.reactions || {}) };
    const list = reactions[emoji] || [];
    if (list.includes(me.email)) {
      reactions[emoji] = list.filter(e => e !== me.email);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...list, me.email];
    }
    await api.entities.Message.update(msg.id, { reactions });
    qc.invalidateQueries({ queryKey: invalidateKey });
  };

  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className="text-2xl flex-shrink-0 mt-auto">{msg.author_emoji || '🙂'}</div>
      <div className={`max-w-[75%] group ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMe && <div className="text-[10px] text-muted-foreground mb-0.5 px-1">{msg.author_name}</div>}
        <div className="relative">
          <div className={`px-3.5 py-2 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
            <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
          </div>
          <Popover open={picking} onOpenChange={setPicking}>
            <PopoverTrigger asChild>
              <button className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-7' : '-right-7'} opacity-0 group-hover:opacity-100 transition p-1 rounded-full bg-background border border-border`}>
                <SmilePlus className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1.5 flex gap-0.5">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => toggleReaction(e)} className="text-lg p-1 hover:bg-muted rounded bounce-tap">{e}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const mine = users.includes(me?.email);
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${mine ? 'bg-secondary/20 border-secondary' : 'bg-muted border-border'}`}
                >
                  {emoji} {users.length}
                </button>
              );
            })}
          </div>
        )}

        <div className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isMe ? 'text-right' : ''}`}>
          {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}