import React, { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { Card } from '@/components/ui/card';
import { Lightbulb, X } from 'lucide-react';
import { todayISO } from '@/lib/cq';

// Fallback tips so kids always see something instant, AI-generated daily tip layered on top
const FALLBACKS = [
  { fact: 'Saving 20% of what you earn each week turns small jobs into big goals.', tag: 'Money 💰' },
  { fact: 'Making your bed each morning can boost your mood and focus all day.', tag: 'Habits 🧠' },
  { fact: 'Teamwork on chores means more family time — and less for cleaning up!', tag: 'Teamwork 🤝' },
  { fact: 'Helping with dishes uses the same skills as being a chef. Every plate counts!', tag: 'Life skills 🍽️' },
  { fact: 'A clean room helps your brain focus better on fun stuff like games and drawing.', tag: 'Brains 🧠' },
];

export default function DailyTip({ age }) {
  const key = `cq_tip_${todayISO()}`;
  const [tip, setTip] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  });
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(`${key}_dismissed`) === '1');

  useEffect(() => {
    if (tip || dismissed) return;
    // instant fallback
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    setTip(fallback);
    localStorage.setItem(key, JSON.stringify(fallback));

    // try to fetch a personalized one in background
    (async () => {
      try {
        const res = await api.integrations.Core.InvokeLLM({
          prompt: `Give one short (under 20 words) fun educational tip for a ${age || 10}-year-old about money, saving, responsibility, or family life. Output plain text, no quotes.`,
          response_json_schema: { type: 'object', properties: { fact: { type: 'string' }, tag: { type: 'string' } } },
        });
        if (res?.fact) {
          setTip(res);
          localStorage.setItem(key, JSON.stringify(res));
        }
      } catch {}
    })();
  }, [age, key, tip, dismissed]);

  if (dismissed || !tip) return null;

  return (
    <Card className="p-4 mb-4 bg-accent/25 border-accent relative">
      <button
        onClick={() => { localStorage.setItem(`${key}_dismissed`, '1'); setDismissed(true); }}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tip.tag || 'Did you know?'}</div>
          <div className="text-sm font-medium mt-0.5">{tip.fact}</div>
        </div>
      </div>
    </Card>
  );
}