import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell({ email }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['notifs', email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: email }, '-created_date', 30),
    enabled: !!email,
    refetchInterval: 20000,
  });

  const unread = items.filter(n => !n.read).length;

  const markAll = useMutation({
    mutationFn: async () => {
      await Promise.all(items.filter(n => !n.read).map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs'] }),
  });

  const handleClick = async (n) => {
    if (!n.read) await base44.entities.Notification.update(n.id, { read: true });
    qc.invalidateQueries({ queryKey: ['notifs'] });
    setOpen(false);
    if (n.link) nav(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted bounce-tap">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-secondary rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-96 overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-display font-bold">Notifications</div>
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} className="text-xs text-primary font-semibold">Mark all read</button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : items.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 flex gap-3 ${!n.read ? 'bg-accent/10' : ''}`}
            >
              <div className="text-xl">{n.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                </div>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}