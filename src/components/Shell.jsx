import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CheckSquare, Home, Wallet, Flame } from 'lucide-react';

const parentTabs = [
  { to: '/parent', icon: LayoutDashboard, label: 'Home' },
  { to: '/parent/chores', icon: ListChecks, label: 'Chores' },
  { to: '/parent/approvals', icon: CheckSquare, label: 'Approve' },
];
const kidTabs = [
  { to: '/kid', icon: Home, label: 'Home' },
  { to: '/kid/pool', icon: Flame, label: 'Quests' },
  { to: '/kid/wallet', icon: Wallet, label: 'Wallet' },
];

export default function Shell({ role, children }) {
  const { pathname } = useLocation();
  const tabs = role === 'parent' ? parentTabs : kidTabs;

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-xl mx-auto px-5 pt-6">{children}</main>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="glass border border-border shadow-xl rounded-full px-2 py-2 flex gap-1">
          {tabs.map(t => {
            const active = pathname === t.to || (t.to !== '/parent' && t.to !== '/kid' && pathname.startsWith(t.to));
            const isHome = (t.to === '/parent' || t.to === '/kid') && pathname === t.to;
            const on = active || isHome;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition bounce-tap ${
                  on ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}