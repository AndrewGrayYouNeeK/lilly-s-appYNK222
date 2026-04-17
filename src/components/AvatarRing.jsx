import React from 'react';
import { getLevel } from '@/lib/gamification';

export default function AvatarRing({ emoji = '🦊', completedCount = 0, size = 96 }) {
  const { current, next, completed } = getLevel(completedCount);
  const prev = next ? (() => {
    const idx = Math.max(0, current.level - 1);
    return [0, 5, 15, 35, 70, 120][idx] || 0;
  })() : current.threshold;
  const denom = next ? next.threshold - prev : 1;
  const progress = next ? Math.min(1, (completed - prev) / denom) : 1;

  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const dash = c * progress;

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} className="stroke-muted" strokeWidth={4} fill="none" />
          <circle cx={size/2} cy={size/2} r={r} className={current.ring}
            strokeWidth={4} fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: size * 0.5 }}>
          {emoji}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Level {current.level}</div>
        <div className={`font-display text-xl font-bold ${current.color}`}>{current.title}</div>
        {next ? (
          <div className="text-xs text-muted-foreground mt-0.5">
            {next.threshold - completed} to {next.title}
          </div>
        ) : (
          <div className="text-xs text-secondary font-semibold mt-0.5">Max level! 🏆</div>
        )}
      </div>
    </div>
  );
}