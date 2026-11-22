import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { useInstallState } from '@/lib/pwa';
import { Dialog } from './Dialog';

/** "Install app": the native prompt on Android/desktop, instructions on iOS Safari. */
export function InstallButton() {
  const state = useInstallState();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (state.kind === 'installed' || state.kind === 'unavailable') return null;

  return (
    <>
      <button
        type="button"
        className="btn-ghost px-2.5"
        onClick={() => (state.kind === 'prompt' ? void state.install() : setShowIosHelp(true))}
      >
        <Download className="h-4 w-4" aria-hidden />
        <span className="hidden md:inline">Install app</span>
        <span className="sr-only md:hidden">Install app</span>
      </button>
      <Dialog
        open={showIosHelp}
        onClose={() => setShowIosHelp(false)}
        title="Install on iPhone or iPad"
        size="md"
      >
        <ol className="space-y-4 text-film-300">
          <li className="flex gap-3">
            <Share className="mt-0.5 h-5 w-5 shrink-0 text-localizer" aria-hidden />
            <span>
              In Safari, tap <strong className="text-film-50">Share</strong> in the toolbar.
            </span>
          </li>
          <li className="flex gap-3">
            <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-localizer" aria-hidden />
            <span>
              Choose <strong className="text-film-50">Add to Home Screen</strong>, then tap{' '}
              <strong className="text-film-50">Add</strong>.
            </span>
          </li>
        </ol>
        <p className="mt-5 text-sm text-film-500">
          The suite then opens full screen from its own icon, like an app.
        </p>
      </Dialog>
    </>
  );
}
