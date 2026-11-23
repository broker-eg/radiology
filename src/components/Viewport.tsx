import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ViewportProps {
  src: string;
  alt: string;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  className?: string;
  imgClassName?: string;
  children?: ReactNode;
  loading?: 'lazy' | 'eager';
  /** Calibration scale on the trailing edge, as on a reading-room monitor (large viewports). */
  scale?: boolean;
}

/**
 * Ten-division calibration ruler with longer ticks at the ends and the midpoint. The ticks point
 * into the image from the trailing edge, so the ruler mirrors in Arabic.
 */
function ScaleBar() {
  const ticks = Array.from({ length: 11 }, (_, i) => `M${i % 5 === 0 ? 0 : 5} ${i * 10}H10`);
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute end-3 top-1/2 h-28 w-2.5 -translate-y-1/2 text-film-100/50 max-sm:hidden sm:end-4 sm:h-36 rtl:-scale-x-100"
    >
      <path
        d={`M10 0V100${ticks.join('')}`}
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
    </svg>
  );
}

/**
 * The suite's signature device: an image framed like a PACS viewport, with metadata in
 * the four corners (DICOM corner annotations) instead of badges stacked on the image.
 * A viewport is always a dark monitor (`scheme-dark`), in the light theme too — films on
 * a lightbox. Corners follow the reading direction, so they mirror in Arabic.
 */
export function Viewport({
  src,
  alt,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  className,
  imgClassName,
  children,
  loading = 'lazy',
  scale = false,
}: ViewportProps) {
  return (
    <div className={cn('scheme-dark relative isolate overflow-hidden bg-ink-950', className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={cn('absolute inset-0 -z-10 h-full w-full object-cover', imgClassName)}
      />
      {/* Corner vignette keeps annotations legible over bright covers. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(6_11_21/0.75)_100%)]"
      />
      {scale && <ScaleBar />}
      {topLeft && <div className="absolute start-2.5 top-2 max-w-[70%]">{topLeft}</div>}
      {topRight && <div className="absolute end-2 top-2">{topRight}</div>}
      {bottomLeft && <div className="absolute bottom-2 start-2.5 max-w-[65%]">{bottomLeft}</div>}
      {bottomRight && <div className="absolute bottom-2 end-2.5 text-end">{bottomRight}</div>}
      {children}
    </div>
  );
}
