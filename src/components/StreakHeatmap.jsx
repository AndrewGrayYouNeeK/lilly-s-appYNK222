import React from 'react';
import { format, subDays, startOfDay } from 'date-fns';

// Last 12 weeks, GitHub-style heatmap
export default function StreakHeatmap({ completedDates = [] }) {
  const set = new Set(completedDates);
  const today = startOfDay(new Date());
  const days = 84; // 12 weeks

  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const iso = format(d, 'yyyy-MM-dd');
    cells.push({ iso, done: set.has(iso), isToday: i === 0 });
  }

  // Pad to align Monday-start weeks
  const firstDay = cells[0] ? new Date(cells[0].iso).getDay() : 0;
  const pad = (firstDay + 6) % 7; // shift so Monday=0
  const padded = [...Array(pad).fill(null), ...cells];

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((c, di) => {
              if (!c) return <div key={di} className="w-3.5 h-3.5" />;
              return (
                <div
                  key={c.iso}
                  title={`${c.iso}${c.done ? ' ✓' : ''}`}
                  className={`w-3.5 h-3.5 rounded-sm ${
                    c.done ? 'bg-secondary' : 'bg-muted'
                  } ${c.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-muted" />
        <div className="w-3 h-3 rounded-sm bg-secondary/50" />
        <div className="w-3 h-3 rounded-sm bg-secondary" />
        <span>More</span>
      </div>
    </div>
  );
}