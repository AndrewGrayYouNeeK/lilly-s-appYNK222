import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Trash2, ShieldAlert, User as UserIcon, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const nav = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isParent = me?.app_role === 'parent';

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    if (!me) return;
    setDeleting(true);
    try {
      // Wipe the user's own data (entities they own).
      const wipers = [
        () => base44.entities.WalletTransaction.filter({ kid_email: me.email }).then(rs => Promise.all(rs.map(r => base44.entities.WalletTransaction.delete(r.id)))),
        () => base44.entities.ChoreClaim.filter({ kid_email: me.email }).then(rs => Promise.all(rs.map(r => base44.entities.ChoreClaim.delete(r.id)))),
        () => base44.entities.Notification.filter({ recipient_email: me.email }).then(rs => Promise.all(rs.map(r => base44.entities.Notification.delete(r.id)))),
        () => base44.entities.SavingsGoal.filter({ kid_email: me.email }).then(rs => Promise.all(rs.map(r => base44.entities.SavingsGoal.delete(r.id)))),
        () => base44.entities.CashoutRequest.filter({ kid_email: me.email }).then(rs => Promise.all(rs.map(r => base44.entities.CashoutRequest.delete(r.id)))),
      ];
      await Promise.allSettled(wipers.map(fn => fn()));

      // Clear user's profile fields so re-login starts fresh
      await base44.auth.updateMe({
        family_id: null,
        app_role: null,
        display_name: null,
        avatar_emoji: null,
        age: null,
      });

      toast.success('Account data cleared. Logging you out…');
      setTimeout(() => base44.auth.logout(), 1200);
    } catch (e) {
      toast.error('Could not delete account. Please contact support.');
      setDeleting(false);
    }
  };

  return (
    <Shell role={isParent ? 'parent' : 'kid'}>
      <Header title="Settings" />

      {/* Profile card */}
      <Card className="p-5 mb-4 flex items-center gap-4">
        <div className="text-4xl">{me?.avatar_emoji || (isParent ? '👤' : '🦊')}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-semibold truncate">
            {me?.display_name || me?.full_name || 'You'}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Mail className="w-3 h-3" /> {me?.email}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {isParent ? 'Parent account' : 'Kid account'}
          </div>
        </div>
      </Card>

      {/* Account actions */}
      <Card className="p-2 mb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition text-left"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Sign out</div>
            <div className="text-xs text-muted-foreground">You can sign back in anytime</div>
          </div>
        </button>
      </Card>

      {/* Danger zone */}
      <Card className="p-5 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <div className="font-display text-base font-bold text-destructive">Danger zone</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={deleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting…' : 'Delete account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove your profile, wallet history, claims, goals, and notifications.
                You will be signed out immediately. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center mt-6 px-4">
        Need help? Contact support at support@lillysapp.com
      </p>
    </Shell>
  );
}