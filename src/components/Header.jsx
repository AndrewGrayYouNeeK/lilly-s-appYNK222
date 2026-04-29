import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Unified header for child screens (non-tab pages).
 * Provides a back button + page title.
 *
 * Usage:
 *   <Header title="Settings" />
 *   <Header title="Cashout" backTo="/kid" />
 *   <Header title="Goal" right={<Button>Save</Button>} />
 */
export default function Header({ title, backTo, right, onBack }) {
  const nav = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return nav(backTo);
    nav(-1);
  };

  return (
    <header className="flex items-center gap-2 mb-5 -mt-1">
      <button
        onClick={handleBack}
        aria-label="Back"
        className="bounce-tap w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted transition"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h1 className="font-display text-2xl font-bold text-primary flex-1 truncate">
        {title}
      </h1>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}