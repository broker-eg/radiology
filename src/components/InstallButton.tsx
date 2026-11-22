import { Download } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { startInstall, useInstallState } from '@/lib/pwa';
import { cn } from '@/lib/utils';

/** "Install app": the native prompt where the browser offers one, otherwise the steps sheet. */
export function InstallButton({
  className,
  label = true,
}: {
  className?: string;
  label?: boolean;
}) {
  const t = useT();
  const state = useInstallState();
  if (state.kind === 'installed' || state.kind === 'unavailable') return null;
  return (
    <button
      type="button"
      data-tour="install"
      className={cn('btn-ghost px-2.5', className)}
      onClick={() => startInstall(state)}
      aria-label={label ? undefined : t.header.installApp}
      title={label ? undefined : t.header.installApp}
    >
      <Download className="h-4 w-4" aria-hidden />
      {label && <span>{t.header.installApp}</span>}
    </button>
  );
}
