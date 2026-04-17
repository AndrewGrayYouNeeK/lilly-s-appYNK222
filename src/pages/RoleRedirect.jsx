import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function RoleRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { base44.auth.redirectToLogin(); return; }
        if (me.app_role === 'parent') nav('/parent', { replace: true });
        else if (me.app_role === 'kid') nav('/kid', { replace: true });
        else nav('/onboarding', { replace: true });
      } catch {
        base44.auth.redirectToLogin();
      }
    })();
  }, [nav]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}