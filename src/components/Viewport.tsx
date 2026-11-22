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
}

/**
 * The suite's signature device: an image framed like a PACS viewport, with metadata in
 * the four corners (DICOM corner annotations) instead of badges stacked on the image.
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
}: ViewportProps) {
  return (
    <div className={cn('relative isolate overflow-hidden bg-ink-950', className)}>
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
      {topLeft && <div className="absolute left-2.5 top-2 max-w-[70%]">{topLeft}</div>}
      {topRight && <div className="absolute right-2 top-2">{topRight}</div>}
      {bottomLeft && <div className="absolute bottom-2 left-2.5 max-w-[65%]">{bottomLeft}</div>}
      {bottomRight && <div className="absolute bottom-2 right-2.5 text-right">{bottomRight}</div>}
      {children}
    </div>
  );
}
