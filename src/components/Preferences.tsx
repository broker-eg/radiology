import { Moon, Sun } from 'lucide-react';
import { setLang, useLang, useT, type Lang } from '@/lib/i18n';
import { setTheme, useTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Language and theme as two labelled segmented controls (account menu). */
export function PreferenceControls({ className }: { className?: string }) {
  const t = useT();
  const lang = useLang();
  const theme = useTheme();
  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: t.prefs.english },
    { value: 'ar', label: t.prefs.arabic },
  ];
  const themes: { value: Theme; label: string; icon: typeof Moon }[] = [
    { value: 'dark', label: t.prefs.dark, icon: Moon },
    { value: 'light', label: t.prefs.light, icon: Sun },
  ];
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-film-400" id="pref-lang">
          {t.prefs.language}
        </span>
        <div className="segmented" role="group" aria-labelledby="pref-lang">
          {langs.map((l) => (
            <button
              key={l.value}
              type="button"
              lang={l.value}
              aria-pressed={lang === l.value}
              onClick={() => setLang(l.value)}
              className="segment min-w-[4.5rem]"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-film-400" id="pref-theme">
          {t.prefs.theme}
        </span>
        <div className="segmented" role="group" aria-labelledby="pref-theme">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className="segment min-w-[4.5rem]"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact pair for the sign-in screen: the other language by name, and a theme toggle. */
export function QuickPreferences({ className }: { className?: string }) {
  const t = useT();
  const lang = useLang();
  const theme = useTheme();
  const other: Lang = lang === 'en' ? 'ar' : 'en';
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        lang={other}
        onClick={() => setLang(other)}
        className="btn-ghost px-2.5 font-medium"
      >
        {other === 'ar' ? t.prefs.arabic : t.prefs.english}
      </button>
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="btn-ghost px-2.5"
        aria-label={theme === 'dark' ? t.prefs.switchToLight : t.prefs.switchToDark}
        title={theme === 'dark' ? t.prefs.switchToLight : t.prefs.switchToDark}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}
