import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, WifiOff } from 'lucide-react';
import heroUrl from '@/assets/branding/hero.webp';
import portraitUrl from '@/assets/branding/portrait.webp';
import { InstallButton } from '@/components/InstallButton';
import { QuickPreferences } from '@/components/Preferences';
import { Signature } from '@/components/Signature';
import { Viewport } from '@/components/Viewport';
import { t as messages, useT } from '@/lib/i18n';
import { useOnline } from '@/lib/network';
import { errorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { signIn, signUp } from '../api/authService';

type Mode = 'signin' | 'signup';

function friendlyAuthError(error: unknown): string {
  const msg = errorMessage(error);
  const t = messages().auth;
  if (/invalid login credentials/i.test(msg)) return t.errInvalidCredentials;
  if (/email not confirmed/i.test(msg)) return t.errNotConfirmed;
  if (/already registered/i.test(msg)) return t.errRegistered;
  if (/password should be at least/i.test(msg)) return t.errPasswordShort;
  // Supabase-side email checks (only when the project sends confirmation emails).
  if (/rate limit/i.test(msg)) return t.errRateLimit;
  if (/email address .* is invalid|example and test domains/i.test(msg)) return t.errEmailInvalid;
  return msg;
}

export function AuthScreen() {
  const t = useT();
  const online = useOnline();
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
        setNotice(messages().auth.confirmSent(email.trim()));
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
    <main className="relative grid min-h-screen bg-ink-900 lg:grid-cols-[1.15fr_1fr]">
      {/* The reading-room viewport: the suite's identity, annotated like a study. */}
      <Viewport
        src={heroUrl}
        alt=""
        loading="eager"
        scale
        className="min-h-[calc(260px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] lg:min-h-screen"
        imgClassName="animate-windowing"
        topLeft={
          <div className="annot mt-[env(safe-area-inset-top)] space-y-0.5">
            <p>{t.auth.heroScope}</p>
            <p className="text-film-300">{t.auth.heroModalities}</p>
          </div>
        }
        topRight={
          <div className="annot mt-[env(safe-area-inset-top)] space-y-0.5 text-end max-lg:hidden">
            <p>{t.auth.heroGenerators(93)}</p>
            <p className="text-film-300">{t.auth.heroRegions(12)}</p>
          </div>
        }
      >
        {/* The title block sits inset from the corner, clear of the corner annotations. */}
        <div className="absolute bottom-5 end-5 start-5 flex items-end gap-3 sm:bottom-10 sm:end-10 sm:start-10 sm:gap-4 lg:bottom-14 lg:start-14">
          <img
            src={portraitUrl}
            alt="Dr. Yasser Shalaby, MD"
            className="h-14 w-14 shrink-0 rounded-sm object-cover object-top ring-1 ring-caliper/50 sm:h-[4.5rem] sm:w-[4.5rem]"
          />
          <div className="min-w-0">
            <h1 className="type-condensed text-3xl font-semibold leading-none text-film-50 [text-shadow:0_2px_12px_rgb(0_0_0/0.6)] sm:text-5xl lg:text-[3.5rem]">
              {t.brand.name}
            </h1>
            <Signature className="mt-1.5 text-base [text-shadow:0_1px_6px_rgb(0_0_0/0.8)] sm:mt-2 sm:text-lg" />
          </div>
        </div>
      </Viewport>

      {/* Language + theme: over the image on phones, top corner of the form on desktop. */}
      <QuickPreferences className="scheme-dark absolute end-2 top-[calc(env(safe-area-inset-top)+0.25rem)] z-10 lg:hidden" />

      <section className="relative flex items-center justify-center px-5 py-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:py-10">
        <QuickPreferences className="absolute end-4 top-4 hidden lg:flex" />
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
                {m === 'signin' ? t.auth.signIn : t.auth.createAccount}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-semibold text-film-50">
            {mode === 'signin' ? t.auth.welcomeBack : t.auth.startFree}
          </h2>
          <p className="mt-1.5 text-sm text-film-400">
            {mode === 'signin' ? t.auth.signInLead : t.auth.signUpLead}
          </p>

          {!online && (
            <p className="mt-5 flex items-center gap-2 rounded-md border border-alert/40 bg-alert/10 px-3 py-2.5 text-sm text-film-50">
              <WifiOff className="h-4 w-4 shrink-0 text-alert" aria-hidden />
              {t.offline.signInOffline}
            </p>
          )}

          {notice && (
            <p className="mt-5 rounded-md border border-localizer/40 bg-localizer/10 px-3 py-2.5 text-sm text-film-50">
              {notice}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="label">
                  {t.auth.fullName}
                </label>
                <input
                  id="fullName"
                  className="field"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label">
                {t.auth.email}
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                {t.auth.password}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
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

            <button
              type="submit"
              className="btn-primary w-full py-2.5 touch:min-h-12"
              disabled={submit.isPending}
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? t.auth.signIn : t.auth.createAccount}
            </button>
          </form>

          <InstallButton className="-ms-2.5 mt-6 text-film-400" />
        </div>
      </section>
    </main>
  );
}
