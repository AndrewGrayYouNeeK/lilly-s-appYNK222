import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Plus } from 'lucide-react';
import CoachMessage from '@/components/CoachMessage';
import { toast } from 'sonner';

const STARTERS = [
  'Suggest 5 age-appropriate chores for my kids',
  'Which chores are getting skipped this week?',
  'Help me plan a weekend cleaning routine',
  'How much allowance is fair for my kids?',
];

export default function ParentCoach() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Init conversation
  useEffect(() => {
    (async () => {
      const c = await api.agents.createConversation({
        agent_name: 'chore_coach',
        metadata: { name: `Coach · ${new Date().toLocaleDateString()}` },
      });
      setConversation(c);
      setMessages(c.messages || []);
    })();
  }, []);

  // Subscribe to streaming updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = api.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const last = (data.messages || []).slice(-1)[0];
      if (last?.role === 'assistant' && !last?.is_streaming) setSending(false);
    });
    return () => unsub();
  }, [conversation?.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim() || !conversation || sending) return;
    setSending(true);
    setInput('');
    try {
      await api.agents.addMessage(conversation, { role: 'user', content: text.trim() });
    } catch (e) {
      toast.error('Could not send message');
      setSending(false);
    }
  };

  return (
    <Shell role="parent">
      <Header title="Chore Coach" />

      <div ref={scrollRef} className="h-[60vh] overflow-y-auto rounded-2xl bg-muted/30 border border-border p-3 space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-8 h-8 text-primary mb-2" />
            <div className="font-display text-lg font-semibold">Ask me anything</div>
            <p className="text-xs text-muted-foreground mb-4">I can read your family's activity and suggest chores.</p>
            <div className="space-y-2 w-full max-w-sm">
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left text-sm p-3 rounded-xl bg-card border border-border hover:border-primary transition bounce-tap">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <CoachMessage key={i} message={m} />)
        )}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.15s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the coach…"
          disabled={!conversation || sending}
          className="rounded-full"
        />
        <Button type="submit" disabled={!input.trim() || sending} className="rounded-full">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Shell>
  );
}