import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { genInviteCode, fetchMe } from '@/lib/cq';
import { Sparkles, Users, Baby } from 'lucide-react';
import EmojiPickerDrawer from '@/components/EmojiPickerDrawer';

const AVATARS = ['🦊', '🐼', '🐯', '🐵', '🦁', '🐸', '🐙', '🦄', '🐨', '🐰', '🐶', '🐱', '🐻', '🐮', '🐷', '🐔'];

export default function Onboarding() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [mode, setMode] = useState(null); // 'parent' | 'kid'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMe().then(u => {
      if (!u) { base44.auth.redirectToLogin(); return; }
      if (u.app_role === 'parent') nav('/parent');
      else if (u.app_role === 'kid') nav('/kid');
      else { setMe(u); setDisplayName(u.full_name || ''); }
    });
  }, [nav]);

  const createFamily = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    const code = genInviteCode();
    const fam = await base44.entities.Family.create({
      name: familyName.trim(),
      invite_code: code,
    });
    await base44.auth.updateMe({
      app_role: 'parent',
      family_id: fam.id,
      display_name: displayName || me.full_name,
      avatar_emoji: avatar,
    });
    nav('/parent');
  };

  const joinFamily = async () => {
    if (!inviteCode.trim() || !displayName.trim()) return;
    setLoading(true);
    const fams = await base44.entities.Family.filter({ invite_code: inviteCode.trim().toUpperCase() });
    if (!fams.length) { alert('Code not found. Ask a parent for your family code.'); setLoading(false); return; }
    await base44.auth.updateMe({
      app_role: 'kid',
      family_id: fams[0].id,
      display_name: displayName.trim(),
      age: Number(age) || undefined,
      avatar_emoji: avatar,
    });
    await base44.entities.Streak.create({
      kid_email: me.email, family_id: fams[0].id, current_count: 0, longest_count: 0,
    });
    nav('/kid');
  };

  if (!me) return null;

  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/30 via-background to-secondary/10 flex items-center justify-center px-5">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-5xl mb-4"><Sparkles className="w-8 h-8 text-secondary" /><span className="flame">🔥</span></div>
            <h1 className="font-display text-5xl font-bold text-primary mb-2">Lilly's app</h1>
            <p className="text-muted-foreground">Chores they'll actually want to do.</p>
          </div>
          <div className="space-y-3">
            <Card onClick={() => setMode('parent')} className="p-6 cursor-pointer bounce-tap border-2 hover:border-primary transition">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center"><Users className="w-7 h-7" /></div>
                <div>
                  <div className="font-display text-xl font-bold">I'm a Parent</div>
                  <div className="text-sm text-muted-foreground">Create your family circle</div>
                </div>
              </div>
            </Card>
            <Card onClick={() => setMode('kid')} className="p-6 cursor-pointer bounce-tap border-2 hover:border-secondary transition">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center"><Baby className="w-7 h-7" /></div>
                <div>
                  <div className="font-display text-xl font-bold">I'm a Kid</div>
                  <div className="text-sm text-muted-foreground">Join with a family code</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <Card className="max-w-md w-full p-7">
        <button onClick={() => setMode(null)} className="text-sm text-muted-foreground mb-4">← Back</button>
        <h2 className="font-display text-3xl font-bold mb-1">{mode === 'parent' ? 'Start your family' : 'Join your family'}</h2>
        <p className="text-sm text-muted-foreground mb-6">{mode === 'parent' ? 'You\'ll get a code to share with your kids.' : 'Enter the code your parent gave you.'}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your name</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Mia" className="mt-1.5 h-11" />
          </div>

          {mode === 'parent' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Family name</label>
              <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="The Johnsons" className="mt-1.5 h-11" />
            </div>
          )}

          {mode === 'kid' && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Family code</label>
                <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="ABC123" className="mt-1.5 tracking-widest font-mono h-11" maxLength={6} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Age</label>
                <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="9" className="mt-1.5 h-11" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pick an avatar</label>
            <div className="mt-2">
              <EmojiPickerDrawer
                value={avatar}
                onChange={setAvatar}
                options={AVATARS}
                title="Pick your avatar"
              />
            </div>
          </div>

          <Button
            onClick={mode === 'parent' ? createFamily : joinFamily}
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl mt-2"
          >
            {loading ? 'Setting up…' : mode === 'parent' ? 'Create Family' : 'Join Family'}
          </Button>
        </div>
      </Card>
    </div>
  );
}