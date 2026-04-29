import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Lightweight touch-based pull-to-refresh.
 * Wrap the top of a scrollable view; calls onRefresh when user pulls past threshold.
 */
const THRESHOLD = 70;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) return;
    // resistance curve
    const eased = Math.min(MAX_PULL, dy * 0.5);
    setPull(eased);
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    const triggered = pull >= THRESHOLD;
    startY.current = null;
    if (triggered) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull }}
        aria-hidden={pull === 0}
      >
        <RefreshCw
          className={`w-5 h-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: progress,
            transform: refreshing ? 'none' : `rotate(${progress * 270}deg)`,
            transition: refreshing ? 'none' : 'transform 80ms linear',
          }}
        />
      </div>
      {children}
    </div>
  );
}