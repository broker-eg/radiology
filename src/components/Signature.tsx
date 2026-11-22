import { cn } from '@/lib/utils';

/** The editor's signature — the only place the serif and the gold appear together. */
export function Signature({ className, prefix = true }: { className?: string; prefix?: boolean }) {
  return (
    <p className={cn('font-serif italic text-caliper', className)}>
      {prefix && <span className="text-film-300">Edited by </span>}
      Dr. Yasser Shalaby, MD
    </p>
  );
}
