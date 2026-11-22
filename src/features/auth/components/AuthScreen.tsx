import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import heroUrl from '@/assets/branding/hero.jpg';
import portraitUrl from '@/assets/branding/portrait.jpg';
import { Signature } from '@/components/Signature';
import { Viewport } from '@/components/Viewport';
import { errorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { signIn, signUp } from '../api/authService';

type Mode = 'signin' | 'signup';

function friendlyAuthError(error: unknown): string {
  const msg = errorMessage(error);
  if (/invalid login credentials/i.test(msg))
    return 'That email and password don’t match an account.';
  if (/email not confirmed/i.test(msg))
    return 'Confirm your email first — the link is in your inbox.';
  if (/already registered/i.test(msg))
    return 'An account with this email already exists. Sign in instead.';
  if (/password should be at least/i.test(msg)) return 'Use a password of at least 6 characters.';
  // Supabase-side email checks (only when the project sends confirmation emails).
  if (/rate limit/i.test(msg))
    return 'Too many sign-ups in a short time. Try again in a few minutes.';
  if (/email address .* is invalid|example and test domains/i.test(msg))
    return 'That email address isn’t accepted. Use a different one.';
  return msg;
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const submit = useMutation({
    meta: { toast: false },
    mutationFn: async () => {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        return;
      }
      const active = await signUp(email.trim(), password, fullName.trim());
      if (!active) {
        setNotice(`We sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
        setMode('signin');
      }
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    submit.mutate();
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setNotice(null);
    submit.reset();
  };

  return (
    <main className="grid min-h-screen bg-ink-900 pt-[env(safe-area-inset-top)] lg:grid-cols-[1.15fr_1fr] lg:pt-0">
      {/* The reading-room viewport: the suite's identity, annotated like a study. */}
      <Viewport
        src={heroUrl}
        alt=""
        loading="eager"
        className="min-h-[260px] lg:min-h-screen"
        imgClassName="animate-windowing"
        topLeft={
          <div className="annot space-y-0.5">
            <p>Structured reporting</p>
            <p className="text-film-300">CT, MRI, US, X-ray, fluoroscopy</p>
          </div>
        }
        topRight={
          <div className="annot space-y-0.5 text-right">
            <p>93 report generators</p>
            <p className="text-film-300">12 body regions</p>
          </div>
        }
        bottomLeft={
          <div className="flex items-end gap-3 pb-1">
            <img
              src={portraitUrl}
              alt="Dr. Yasser Shalaby, MD"
              className="h-14 w-14 rounded-sm object-cover object-top ring-1 ring-caliper/50 sm:h-16 sm:w-16"
            />
            <div>
              <h1 className="type-condensed text-3xl font-semibold leading-none text-film-50 sm:text-5xl">
                Radiology Reporting Suite
              </h1>
              <Signature className="mt-1.5 text-base sm:text-lg" />
            </div>
          </div>
        }
      />

      <section className="flex items-center justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex rounded-md border border-ink-700 p-1" role="tablist">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
                  mode === m ? 'bg-ink-700 text-film-50' : 'text-film-400 hover:text-film-100',
                )}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-semibold text-film-50">
            {mode === 'signin' ? 'Welcome back' : 'Start on the Free plan'}
          </h2>
          <p className="mt-1.5 text-sm text-film-400">
            {mode === 'signin'
              ? 'Sign in to open your report generators.'
              : 'Free includes the normal-study and plain-film generators. Pro unlocks all 93.'}
          </p>

          {notice && (
            <p className="mt-5 rounded-md border border-localizer/40 bg-localizer/10 px-3 py-2.5 text-sm text-film-50">
              {notice}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="label">
                  Full name
                </label>
                <input
                  id="fullName"
                  className="field"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Amira Hassan"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className="field"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {submit.isError && (
              <p role="alert" className="animate-shake text-sm text-alert">
                {friendlyAuthError(submit.error)}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
