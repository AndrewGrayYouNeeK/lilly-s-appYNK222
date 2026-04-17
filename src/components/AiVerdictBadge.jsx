import React from 'react';
import { Sparkles, Check, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';

const MAP = {
  looks_good:    { icon: Check,        label: 'AI: Looks good',     cls: 'bg-success/15 text-success border-success/30' },
  needs_review:  { icon: AlertTriangle,label: 'AI: Take a look',    cls: 'bg-accent/50 text-accent-foreground border-accent' },
  suspicious:    { icon: ShieldAlert,  label: 'AI: Suspicious',     cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  pending:       { icon: Loader2,      label: 'AI: Analyzing…',     cls: 'bg-muted text-muted-foreground border-border', spin: true },
};

export default function AiVerdictBadge({ verdict, score, reasoning }) {
  const v = MAP[verdict] || MAP.pending;
  const Icon = v.icon;
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${v.cls}`}>
      <div className="flex items-center gap-1.5 font-semibold">
        <Icon className={`w-3.5 h-3.5 ${v.spin ? 'animate-spin' : ''}`} />
        <span>{v.label}</span>
        {typeof score === 'number' && verdict !== 'pending' && (
          <span className="ml-auto opacity-80">{score}/100</span>
        )}
      </div>
      {reasoning && verdict !== 'pending' && (
        <div className="mt-1 opacity-80 leading-snug">{reasoning}</div>
      )}
    </div>
  );
}