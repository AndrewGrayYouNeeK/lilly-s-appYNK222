import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, ListChecks, CheckSquare, Home, Wallet, Flame, Trophy, ShoppingBag, Gift, Medal, MessageCircle } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const parentTabs = [
  { to: '/parent', icon: LayoutDashboard, label: 'Home' },
  { to: '/parent/chores', icon: ListChecks, label: 'Chores' },
  { to: '/parent/approvals', icon: CheckSquare, label: 'Approve' },
  { to: '/parent/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/parent/shop', icon: Gift, label: 'Shop' },
];
const kidTabs = [
  { to: '/kid', icon: Home, label: 'Home' },
  { to: '/kid/pool', icon: Flame, label: 'Quests' },
  { to: '/kid/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/kid/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/kid/wallet', icon: Wallet, label: 'Wallet' },
];

export default function Shell({ role, children }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const tabs = role === 'parent' ? parentTabs : kidTabs;

  const handleTabClick = (e, to) => {
    // If we're already inside this tab's section but on a sub-route, reset to root.
    const isRootTab = to === '/parent' || to === '/kid';
    const inSection = isRootTab
      ? pathname.startsWith(to) && pathname !== to
      : pathname === to;
    if (inSection || pathname === to) {
      e.preventDefault();
      if (pathname === to) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        nav(to);
      }
    }
  };

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div
        className="fixed right-3 z-40"
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div className="glass rounded-full border border-border shadow">
          <NotificationBell email={me?.email} />
        </div>
      </div>
      <main className="max-w-xl mx-auto px-5 pt-6">{children}</main>
      <nav
        className="fixed left-1/2 -translate-x-1/2 z-40"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="glass border border-border shadow-xl rounded-full px-2 py-2 flex gap-1">
          {tabs.map(t => {
            const active = pathname === t.to || (t.to !== '/parent' && t.to !== '/kid' && pathname.startsWith(t.to));
            const isHome = (t.to === '/parent' || t.to === '/kid') && pathname === t.to;
            const on = active || isHome;
            return (
              <Link
                key={t.to}
                to={t.to}
                onClick={(e) => handleTabClick(e, t.to)}
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