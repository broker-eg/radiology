import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The editor's signature — the only place the serif and the gold appear together. The name is
 * a signature, so it stays in its Latin hand in Arabic too; only the "Edited by" is translated
 * (set upright in the sans: Arabic has no true italic).
 */
export function Signature({
  className,
  prefix = true,
  prefixText,
}: {
  className?: string;
  prefix?: boolean;
  /** Overrides the "Edited by " lead-in (the footer uses a lower-case one). */
  prefixText?: string;
}) {
  const t = useT();
  return (
    <p className={cn('font-serif italic text-caliper', className)}>
      {prefix && (
        <span className="text-film-300 rtl:font-sans rtl:not-italic">
          {prefixText ?? t.brand.editedBy}
        </span>
      )}
      <span dir="ltr">Dr. Yasser Shalaby, MD</span>
    </p>
  );
}
