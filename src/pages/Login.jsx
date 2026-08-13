import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success('Account created! You can sign in now.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        nav(redirect);
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/30 via-background to-secondary/10 flex items-center justify-center px-5">
      <Card className="max-w-md w-full p-7">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-4xl mb-3">
            <Sparkles className="w-7 h-7 text-secondary" />
            <span>🔥</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Lilly's app</h1>
          <p className="text-sm text-muted-foreground mt-1">Chores they'll actually want to do.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 h-11"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-11"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold rounded-xl">
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === 'signin' ? (
            <>No account? <button type="button" onClick={() => setMode('signup')} className="text-primary font-medium">Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => setMode('signin')} className="text-primary font-medium">Sign in</button></>
          )}
        </p>
      </Card>
    </div>
  );
}
