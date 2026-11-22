import { useMemo, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import { t as messages, useT } from '@/lib/i18n';
import { errorMessage, toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { AppDraft, AppKind, AppStatus, AppTier, Category, SuiteApp } from '@/types/domain';
import { useSaveApp } from '../hooks/useCatalog';
import { coverOf } from '../lib/cover';

interface AppFormProps {
  existing: SuiteApp | null;
  categories: Category[];
  modalities: string[];
  onClose: () => void;
  onSaved: (id: string) => void;
}

function initialDraft(app: SuiteApp | null, categories: Category[]): AppDraft {
  return {
    id: app?.id ?? null,
    name: app?.name ?? '',
    category: app?.category ?? categories[0]?.name ?? '',
    modality: app?.modality ?? 'CT / MRI',
    status: app?.status ?? 'Integrated',
    tier: app?.tier ?? 'pro',
    badge: app?.badge ?? '',
    description: app?.description ?? '',
    duplicateOf: app?.duplicateOf ?? '',
    kind: app?.kind ?? 'integrated',
    externalUrl: app?.externalUrl ?? '',
    html: null,
    coverFile: null,
  };
}

export function AppForm({ existing, categories, modalities, onClose, onSaved }: AppFormProps) {
  const t = useT();
  const [draft, setDraft] = useState<AppDraft>(() => initialDraft(existing, categories));
  const [htmlFileLabel, setHtmlFileLabel] = useState<string | null>(null);
  const save = useSaveApp();
  const set = (patch: Partial<AppDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const coverPreview = useMemo(
    () =>
      draft.coverFile ? URL.createObjectURL(draft.coverFile) : existing ? coverOf(existing) : null,
    [draft.coverFile, existing],
  );

  const onHtmlFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setHtmlFileLabel(messages().form.fileInfo(file.name, Math.round(text.length / 1024)));
    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(text)?.[1]?.trim();
    setDraft((d) => ({
      ...d,
      html: text,
      name: d.name.trim()
        ? d.name
        : (title ?? file.name.replace(/\.html?$/i, '').replace(/[_-]+/g, ' ')),
    }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      { draft, existing },
      {
        onSuccess: (id) => {
          const name = draft.name.trim();
          toast.info(existing ? messages().toast.saved(name) : messages().toast.added(name));
          onSaved(id);
        },
      },
    );
  };

  const kindOption = (kind: AppKind, label: string) => (
    <button
      type="button"
      aria-pressed={draft.kind === kind}
      onClick={() => set({ kind, status: kind === 'integrated' ? 'Integrated' : 'Published' })}
      className={cn(
        'flex-1 rounded px-3 py-2 text-sm transition-colors',
        draft.kind === kind
          ? 'bg-ink-700 font-medium text-film-50'
          : 'text-film-400 hover:text-film-100',
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? t.form.editTitle(existing.name) : t.form.addTitle}
      context={t.form.context}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex rounded-md border border-ink-600 p-1">
          {kindOption('integrated', t.form.kindIntegrated)}
          {kindOption('external', t.form.kindExternal)}
        </div>

        {draft.kind === 'integrated' ? (
          <div className="space-y-3 rounded-md border border-ink-700 p-3">
            <div>
              <label htmlFor="htmlFile" className="label">
                {t.form.htmlFile}
              </label>
              <input
                id="htmlFile"
                type="file"
                accept=".html,.htm,text/html"
                onChange={(e) => void onHtmlFile(e.target.files?.[0])}
                className="block w-full text-sm text-film-400 file:me-3 file:rounded file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-film-50"
              />
              <p className="mt-1 text-[13px] text-film-500">
                {htmlFileLabel ?? (existing?.htmlPath ? t.form.keepFile : t.form.singleFile)}
              </p>
            </div>
            <div>
              <label htmlFor="htmlPaste" className="label">
                {t.form.pasteHtml}
              </label>
              <textarea
                id="htmlPaste"
                rows={3}
                dir="ltr"
                className="field font-[ui-monospace,monospace] text-xs sm:text-xs"
                placeholder="<!doctype html>…"
                value={htmlFileLabel ? '' : (draft.html ?? '')}
                disabled={!!htmlFileLabel}
                onChange={(e) => set({ html: e.target.value || null })}
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="externalUrl" className="label">
              {t.form.link}
            </label>
            <input
              id="externalUrl"
              type="url"
              required
              dir="ltr"
              className="field"
              placeholder="https://quick.aws.com/…"
              value={draft.externalUrl}
              onChange={(e) => set({ externalUrl: e.target.value })}
            />
          </div>
        )}

        <div>
          <label htmlFor="appName" className="label">
            {t.form.name}
          </label>
          <input
            id="appName"
            required
            className="field"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t.form.namePlaceholder}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="appRegion" className="label">
              {t.form.region}
            </label>
            <select
              id="appRegion"
              className="field"
              value={draft.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="appModality" className="label">
              {t.form.modality}
            </label>
            <input
              id="appModality"
              required
              list="modality-options"
              className="field"
              value={draft.modality}
              onChange={(e) => set({ modality: e.target.value })}
            />
            <datalist id="modality-options">
              {modalities.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="appTier" className="label">
              {t.form.plan}
            </label>
            <select
              id="appTier"
              className="field"
              value={draft.tier}
              onChange={(e) => set({ tier: e.target.value as AppTier })}
            >
              <option value="free">{t.form.planFreeOption}</option>
              <option value="pro">{t.form.planProOption}</option>
            </select>
          </div>
          <div>
            <label htmlFor="appStatus" className="label">
              {t.form.status}
            </label>
            <select
              id="appStatus"
              className="field"
              value={draft.status}
              onChange={(e) => set({ status: e.target.value as AppStatus })}
            >
              <option value="Integrated">{t.form.statusIntegrated}</option>
              <option value="Published">{t.form.statusPublished}</option>
              <option value="Draft">{t.form.statusDraft}</option>
            </select>
          </div>
          <div>
            <label htmlFor="appBadge" className="label">
              {t.form.scoring}
            </label>
            <input
              id="appBadge"
              className="field"
              value={draft.badge}
              onChange={(e) => set({ badge: e.target.value })}
              placeholder={t.form.scoringPlaceholder}
            />
          </div>
          <div>
            <label htmlFor="appMirror" className="label">
              {t.form.mirrorOf}
            </label>
            <input
              id="appMirror"
              className="field"
              value={draft.duplicateOf}
              onChange={(e) => set({ duplicateOf: e.target.value })}
              placeholder={t.form.mirrorPlaceholder}
            />
          </div>
        </div>

        <div>
          <label htmlFor="appDescription" className="label">
            {t.form.description}
          </label>
          <textarea
            id="appDescription"
            required
            rows={3}
            className="field"
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder={t.form.descriptionPlaceholder}
          />
        </div>

        <div className="flex items-start gap-4">
          {coverPreview && (
            <img
              src={coverPreview}
              alt=""
              className="aspect-[16/10] w-36 shrink-0 rounded-sm border border-ink-700 object-cover"
            />
          )}
          <div className="flex-1">
            <label htmlFor="appCover" className="label">
              {t.form.cover}
            </label>
            <input
              id="appCover"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => set({ coverFile: e.target.files?.[0] ?? null })}
              className="block w-full text-sm text-film-400 file:me-3 file:rounded file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-film-50"
            />
            <p className="mt-1 text-[13px] text-film-500">{t.form.coverHint}</p>
          </div>
        </div>

        {save.isError && (
          <p role="alert" className="text-sm text-alert">
            {errorMessage(save.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? t.form.saveChanges : t.form.addGenerator}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
