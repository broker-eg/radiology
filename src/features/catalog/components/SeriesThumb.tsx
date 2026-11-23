import { cn } from '@/lib/utils';

/**
 * A body region's series thumbnail, as in a PACS series browser: a crop of its first
 * generator's cover, grey like film until its row is hovered or selected. A region with no
 * generators falls back to its catalog icon.
 */
export function SeriesThumb({
  src,
  icon,
  active = false,
  className,
}: {
  src: string | undefined;
  icon?: string | null;
  active?: boolean;
  className?: string;
}) {
  if (!src) {
    return icon ? (
      <span aria-hidden className={cn('grid shrink-0 place-items-center leading-none', className)}>
        {icon}
      </span>
    ) : null;
  }
  return (
    <span
      aria-hidden
      className={cn(
        'scheme-dark block shrink-0 overflow-hidden rounded-[3px] bg-ink-950 ring-1',
        active ? 'ring-localizer/80' : 'ring-ink-600',
        className,
      )}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover', !active && 'film-tone')}
      />
    </span>
  );
}
