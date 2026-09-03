'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { PhoneShell } from '@/components/Shell';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'var(--gray-500)',
  border: '1px solid var(--gray-400)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 16px',
  color: '#fff',
  fontSize: 17,
  outline: 'none',
};

const labelStyle = {
  fontSize: 13,
  lineHeight: '19px',
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dietPlan, setDietPlan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      router.replace('/home');
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Read by the handle_new_user() trigger to seed the profile row.
      options: {
        data: {
          name: name.trim() || email.split('@')[0],
          diet_plan: dietPlan.trim() || 'My Plan',
        },
      },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    if (!data.session) {
      setNotice('Check your inbox to confirm your email, then sign in.');
      setMode('signin');
      setBusy(false);
      return;
    }

    router.replace('/home');
    router.refresh();
  }

  return (
    <PhoneShell>
      <div className="scrollarea">
        <div style={{ padding: '48px 20px 0 20px' }}>
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
            Welcome to
          </div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tracked
          </div>
          <div style={{ marginTop: 4, fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
            Snap a meal, get its calories and macros.
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {mode === 'signup' && (
              <>
                <div>
                  <div style={labelStyle}>Name</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Alex"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Diet plan</div>
                  <input
                    value={dietPlan}
                    onChange={(e) => setDietPlan(e.target.value)}
                    placeholder="Vegan Vitality"
                    style={fieldStyle}
                  />
                </div>
              </>
            )}

            <div>
              <div style={labelStyle}>Email</div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                style={fieldStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Password</div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                style={fieldStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(201,56,56,0.15)',
                  color: '#FF3E3E',
                  fontSize: 13,
                  lineHeight: '19px',
                }}
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  lineHeight: '19px',
                }}
              >
                {notice}
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Button type="submit" disabled={busy}>
                {busy ? 'One moment…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            style={{
              marginTop: 20,
              width: '100%',
              background: 'none',
              border: 0,
              color: 'var(--primary-100)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
