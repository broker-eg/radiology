import { ExternalLink, Lock, Play, Star } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';

/** Bottom-right corner annotation: which plan the generator belongs to. */
export function TierAnnotation({ app, locked }: { app: SuiteApp; locked: boolean }) {
  const t = useT();
  return app.tier === 'pro' ? (
    <p className="annot inline-flex items-center gap-1 font-semibold text-caliper">
      {locked && <Lock className="h-3 w-3" aria-hidden />}
      {t.common.pro}
    </p>
  ) : (
    <p className="annot">{t.common.free}</p>
  );
}

export function FavoriteButton({
  active,
  onToggle,
  className,
  tour = false,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
  tour?: boolean;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? t.app.removeFavorite : t.app.addFavorite}
      data-tour={tour ? 'favorite' : undefined}
      className={cn(
        'rounded-full p-1.5 transition-colors hover:bg-ink-950/60 touch:p-2.5',
        active ? 'text-caliper' : 'text-film-100/80 hover:text-film-50',
        className,
      )}
    >
      <Star className={cn('h-4 w-4 drop-shadow', active && 'fill-caliper')} />
    </button>
  );
}

/** The primary action, named for what actually happens. */
export function LaunchButton({
  app,
  locked,
  onLaunch,
  onLocked,
  onIntent,
  className,
}: {
  app: SuiteApp;
  locked: boolean;
  onLaunch: () => void;
  onLocked: () => void;
  /** Hover/focus/touch: start fetching the generator before the click lands. */
  onIntent?: () => void;
  className?: string;
}) {
  const t = useT();
  if (locked) {
    return (
      <button
        type="button"
        onClick={onLocked}
        className={cn('btn border border-caliper/40 text-caliper hover:bg-caliper/10', className)}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        {t.app.proOnly}
      </button>
    );
  }
  if (app.kind === 'external') {
    return (
      <a
        href={app.externalUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('btn-quiet', className)}
      >
        {t.app.openAws}
        <ExternalLink className="flip-rtl h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onLaunch}
      onPointerEnter={onIntent}
      onTouchStart={onIntent}
      onFocus={onIntent}
      className={cn('btn-primary', className)}
    >
      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
      {t.app.launch}
    </button>
  );
}
