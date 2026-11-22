import { t } from '@/lib/i18n';

// Generators run in a sandboxed iframe WITHOUT allow-same-origin: they get an opaque
// origin, so uploaded HTML can never read this site's storage (the Supabase session).
// Everything the generators need still works: scripts, forms, print (modals), copy, and
// Word/PDF downloads.
export const GENERATOR_SANDBOX =
  'allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads';
export const GENERATOR_ALLOW = 'clipboard-write; fullscreen';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * Opens a generator in its own tab. The tab is opened synchronously (inside the click, so
 * pop-up blockers allow it) and filled once the HTML has loaded.
 */
export function openGeneratorTab(title: string, loadHtml: () => Promise<string>): Promise<void> {
  const tab = window.open('', '_blank');
  if (!tab) return Promise.reject(new Error(t().workspace.popupBlocked));
  tab.document.title = title;
  tab.document.body.style.cssText =
    'margin:0;background:#0A1220;color:#AEB9C8;font:14px system-ui;display:grid;place-items:center;height:100vh';
  tab.document.body.textContent = t().workspace.tabLoading;

  return loadHtml().then(
    (html) => {
      const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(title)}</title><style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe sandbox="${GENERATOR_SANDBOX}" allow="${GENERATOR_ALLOW}" srcdoc="${escapeAttr(html)}"></iframe></body></html>`;
      const url = URL.createObjectURL(new Blob([page], { type: 'text/html' }));
      tab.location.replace(url);
      tab.opener = null;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    (error: unknown) => {
      tab.close();
      throw error;
    },
  );
}
