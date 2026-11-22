import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';
import type { AppDraft, AppKind, AppStatus, AppTier, Category, SuiteApp } from '@/types/domain';

const HTML_BUCKET = 'app-html';
const COVER_BUCKET = 'app-covers';

function coverUrl(path: string | null, version: string): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  // Version query → a replaced cover is fetched fresh, an unchanged one stays cached.
  return `${data.publicUrl}?v=${encodeURIComponent(version)}`;
}

function toApp(row: Tables<'apps'>): SuiteApp {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    modality: row.modality,
    status: row.status as AppStatus,
    badge: row.badge,
    description: row.description,
    duplicateOf: row.duplicate_of,
    kind: row.kind as AppKind,
    externalUrl: row.external_url,
    htmlPath: row.html_path,
    coverPath: row.cover_path,
    coverUrl: coverUrl(row.cover_path, row.updated_at),
    tier: row.tier as AppTier,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data.map((c) => ({
    name: c.name,
    icon: c.icon,
    subtitle: c.subtitle,
    color: c.color,
    sortOrder: c.sort_order,
  }));
}

export async function listApps(): Promise<SuiteApp[]> {
  const { data, error } = await supabase.from('apps').select('*').order('sort_order').order('name');
  if (error) throw error;
  return data.map(toApp);
}

export async function listFavoriteIds(): Promise<string[]> {
  // RLS scopes favorites to the signed-in user.
  const { data, error } = await supabase.from('favorites').select('app_id');
  if (error) throw error;
  return data.map((f) => f.app_id);
}

export async function addFavorite(appId: string): Promise<void> {
  const { error } = await supabase.from('favorites').insert({ app_id: appId });
  if (error && error.code !== '23505') throw error; // already a favorite → fine
}

export async function removeFavorite(appId: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('app_id', appId);
  if (error) throw error;
}

export class LockedGeneratorError extends Error {
  constructor() {
    super('This generator is part of the Pro plan.');
    this.name = 'LockedGeneratorError';
  }
}

/** Downloads a generator's HTML. Storage RLS refuses pro-tier files to Free accounts. */
export async function fetchAppHtml(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(HTML_BUCKET).download(path);
  if (error) {
    // Storage answers "not found" for objects the caller's policy can't see.
    if (
      /not found|400|404/i.test(`${error.message} ${'status' in error ? String(error.status) : ''}`)
    ) {
      throw new LockedGeneratorError();
    }
    throw error;
  }
  return data.text();
}

function coverExtension(file: File): string {
  const fromType = file.type.split('/')[1];
  if (fromType && ['jpeg', 'png', 'webp', 'gif'].includes(fromType)) {
    return fromType === 'jpeg' ? 'jpg' : fromType;
  }
  return 'jpg';
}

/** Creates or updates a catalog entry, uploading its generator HTML and cover if given. */
export async function saveApp(draft: AppDraft, existing: SuiteApp | null): Promise<string> {
  const id = existing?.id ?? `app-${crypto.randomUUID()}`;
  const integrated = draft.kind === 'integrated';

  let htmlPath = integrated ? (existing?.htmlPath ?? null) : null;
  if (integrated && draft.html) {
    htmlPath = `${id}.html`;
    const { error } = await supabase.storage
      .from(HTML_BUCKET)
      .upload(htmlPath, new Blob([draft.html], { type: 'text/html' }), {
        upsert: true,
        contentType: 'text/html',
      });
    if (error) throw error;
  }
  if (integrated && !htmlPath)
    throw new Error('Upload the generator’s HTML file or paste its source.');

  let coverPath = existing?.coverPath ?? null;
  if (draft.coverFile) {
    const nextPath = `${id}.${coverExtension(draft.coverFile)}`;
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(nextPath, draft.coverFile, { upsert: true, contentType: draft.coverFile.type });
    if (error) throw error;
    if (coverPath && coverPath !== nextPath) {
      await supabase.storage.from(COVER_BUCKET).remove([coverPath]);
    }
    coverPath = nextPath;
  }

  const row: TablesInsert<'apps'> = {
    id,
    name: draft.name.trim(),
    category: draft.category,
    modality: draft.modality.trim(),
    status: draft.status,
    tier: draft.tier,
    badge: draft.badge.trim() || null,
    description: draft.description.trim(),
    duplicate_of: draft.duplicateOf.trim() || null,
    kind: draft.kind,
    external_url: integrated ? null : draft.externalUrl.trim(),
    html_path: htmlPath,
    cover_path: coverPath,
  };

  if (existing) {
    const { error } = await supabase.from('apps').update(row).eq('id', id);
    if (error) throw error;
    // Switched from a hosted generator to an external link → drop the orphaned HTML.
    if (!integrated && existing.htmlPath) {
      await supabase.storage.from(HTML_BUCKET).remove([existing.htmlPath]);
    }
  } else {
    // New entries lead the "recommended" order, as custom apps did in the legacy suite.
    const { error } = await supabase.from('apps').insert({ ...row, sort_order: 0 });
    if (error) throw error;
  }
  return id;
}

export async function deleteApp(app: SuiteApp): Promise<void> {
  const { error } = await supabase.from('apps').delete().eq('id', app.id);
  if (error) throw error;
  // Best-effort cleanup; favorites cascade and hero covers fall back in the database.
  if (app.htmlPath) await supabase.storage.from(HTML_BUCKET).remove([app.htmlPath]);
  if (app.coverPath) await supabase.storage.from(COVER_BUCKET).remove([app.coverPath]);
}
