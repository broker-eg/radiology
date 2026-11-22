import type { SuiteApp } from '@/types/domain';

// Ported from the legacy suite's smart search: every token must match somewhere; matches
// in the name weigh most, then scoring badge/modality, region, description, synonyms.

export const DUPLICATES_REGION = 'Duplicates & Cloud Mirrors';

export const MODALITIES = [
  'CT',
  'MRI',
  'Ultrasound',
  'X-Ray',
  'Fluoroscopy',
  'Mammography',
] as const;
export type ModalityFilter = 'All' | (typeof MODALITIES)[number];
export type SourceFilter = 'all' | 'integrated' | 'external';
export type SortKey = 'recommended' | 'az' | 'za' | 'integrated';
export type ViewMode = 'regions' | 'grid' | 'worklist';

/** Scoring systems and frequent exams — the vocabulary radiologists actually search by. */
export const QUICK_FINDS = [
  'LI-RADS',
  'PI-RADS',
  'BI-RADS',
  'O-RADS',
  'TI-RADS',
  'Trauma',
  'Stroke',
  'Doppler',
  'PNS',
  'Adrenal',
] as const;

const SYNONYMS: Record<string, string[]> = {
  pns: ['sinus', 'sinuses', 'paranasal', 'lund-mackay', 'omc', 'maxillary', 'ethmoid', 'sphenoid'],
  sinus: ['pns', 'paranasal', 'lund-mackay'],
  ent: ['pns', 'sinus', 'orbit', 'petrous', 'cpa', 'ear', 'neck', 'facial'],
  tbi: ['brain trauma', 'head trauma', 'rotterdam', 'marshall', 'edh', 'sdh', 'dai', 'contusion'],
  cmr: ['cardiac', 'heart', 'myocarditis', 'scmr', 'cardiomyopathy'],
  cardiac: ['cmr', 'coronary', 'heart'],
  gyn: [
    'gynecology',
    'female genital',
    'ovarian',
    'o-rads',
    'figo',
    'enzian',
    'uterus',
    'endometriosis',
    'pelvis',
  ],
  gyne: ['gynecology', 'female genital', 'ovarian', 'o-rads', 'figo'],
  gu: [
    'genitourinary',
    'renal',
    'urography',
    'mru',
    'prostate',
    'testis',
    'scrotum',
    'vi-rads',
    'bladder',
  ],
  uro: ['urography', 'mru', 'renal', 'genitourinary', 'bladder', 'prostate'],
  gi: [
    'git',
    'bowel',
    'enterography',
    'barium',
    'colonography',
    'rectal',
    'perianal',
    'defecography',
  ],
  liver: ['hcc', 'cirrhosis', 'li-rads', 'dynamic mri abdomen', 'triphasic'],
  hcc: ['liver', 'cirrhosis', 'li-rads', 'triphasic'],
  adrenal: ['washout', 'apw', 'rpw', 'csi', 'ensat', 'pheochromocytoma', 'adenoma'],
  msk: [
    'shoulder',
    'hip',
    'sij',
    'ankle',
    'foot',
    'wrist',
    'hand',
    'elbow',
    'knee',
    'bone',
    'joint',
    'spine',
  ],
  us: ['ultrasound', 'doppler', 'duplex', 'tcd', 'ius', 'tvs', 'trus', 'tpus'],
  usg: ['ultrasound', 'doppler', 'duplex'],
  xr: ['x-ray', 'plain film', 'radiograph', 'kub', 'cxr'],
  cxr: ['chest x-ray', 'x-ray', 'icu'],
  kub: ['abdominal', 'x-ray'],
  pe: ['ct pa', 'pe rad', 'pulmonary embolism'],
  ctpa: ['ct pa', 'pe rad', 'pulmonary embolism'],
  nf1: ['phakomatoses', 'neurocutaneous'],
  nf2: ['phakomatoses', 'neurocutaneous'],
  tsc: ['phakomatoses', 'neurocutaneous'],
  vhl: ['phakomatoses', 'neurocutaneous'],
  dup: ['duplicates', 'cloud mirror', 'mirror', 'alternate', 'legacy'],
  duplicate: ['duplicates', 'cloud mirror', 'mirror', 'alternate', 'legacy'],
  duplicates: ['duplicates', 'cloud mirror', 'mirror', 'alternate', 'legacy'],
  mirror: ['duplicates', 'cloud mirror'],
  offline: ['integrated'],
  aws: ['published', 'cloud'],
  free: ['tier-free'],
  pro: ['tier-pro'],
};

export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesModality(app: SuiteApp, mod: ModalityFilter): boolean {
  if (mod === 'All') return true;
  const m = app.modality.toLowerCase();
  switch (mod) {
    case 'CT':
      return m.includes('ct');
    case 'MRI':
      return m.includes('mri') || m.includes('mra') || m.includes('mr ');
    case 'Ultrasound':
      return m.includes('ultrasound') || m.includes('doppler') || /\bus\b/.test(m);
    case 'X-Ray':
      return m.includes('x-ray');
    case 'Fluoroscopy':
      return m.includes('fluoroscopy');
    case 'Mammography':
      return m.includes('mammography');
  }
}

export function scoreApp(app: SuiteApp, tokens: string[]): number {
  if (!tokens.length) return 1;
  const name = app.name.toLowerCase();
  const region = app.category.toLowerCase();
  const modality = app.modality.toLowerCase();
  const badge = (app.badge ?? '').toLowerCase();
  const desc = app.description.toLowerCase();
  const dup = (app.duplicateOf ?? '').toLowerCase();
  const source =
    app.kind === 'integrated' ? 'integrated offline local suite' : 'aws cloud external quick';
  const tier = `tier-${app.tier}`;
  const hay = `${name} ${region} ${modality} ${badge} ${desc} ${dup} ${source} ${tier}`;

  let total = 0;
  for (const tok of tokens) {
    let s = 0;
    if (name.includes(tok)) s = 10;
    else if (badge.includes(tok) || modality.includes(tok)) s = 7;
    else if (region.includes(tok) || dup.includes(tok)) s = 6;
    else if (desc.includes(tok) || source.includes(tok)) s = 4;
    else if ((SYNONYMS[tok] ?? []).some((syn) => hay.includes(syn))) s = 3;
    if (s === 0) return 0;
    total += s;
  }
  // On ties, prefer primary generators over mirrors.
  return app.category === DUPLICATES_REGION ? total : total + 0.5;
}

export interface Filters {
  query: string;
  region: string | null;
  modality: ModalityFilter;
  source: SourceFilter;
  favoritesOnly: boolean;
  unlockedOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  region: null,
  modality: 'All',
  source: 'all',
  favoritesOnly: false,
  unlockedOnly: false,
  sort: 'recommended',
};

interface FilterContext {
  favorites: Set<string>;
  canLaunch: (app: SuiteApp) => boolean;
}

/** Everything except the region filter — used for the per-region counts. */
function passesNonRegion(app: SuiteApp, f: Filters, ctx: FilterContext, tokens: string[]): number {
  if (f.favoritesOnly && !ctx.favorites.has(app.id)) return 0;
  if (f.unlockedOnly && !ctx.canLaunch(app)) return 0;
  if (!matchesModality(app, f.modality)) return 0;
  if (f.source !== 'all' && app.kind !== f.source) return 0;
  return scoreApp(app, tokens);
}

export function filterApps(apps: SuiteApp[], f: Filters, ctx: FilterContext): SuiteApp[] {
  const tokens = tokenize(f.query);
  const scored: { app: SuiteApp; score: number }[] = [];
  for (const app of apps) {
    if (f.region && app.category !== f.region) continue;
    const score = passesNonRegion(app, f, ctx, tokens);
    if (score > 0) scored.push({ app, score });
  }
  if (tokens.length) scored.sort((a, b) => b.score - a.score);
  else if (f.sort === 'az') scored.sort((a, b) => a.app.name.localeCompare(b.app.name));
  else if (f.sort === 'za') scored.sort((a, b) => b.app.name.localeCompare(a.app.name));
  else if (f.sort === 'integrated')
    scored.sort(
      (a, b) => Number(b.app.kind === 'integrated') - Number(a.app.kind === 'integrated'),
    );
  return scored.map((s) => s.app);
}

export function countByRegion(
  apps: SuiteApp[],
  f: Filters,
  ctx: FilterContext,
): Map<string, number> {
  const tokens = tokenize(f.query);
  const counts = new Map<string, number>();
  for (const app of apps) {
    if (passesNonRegion(app, f, ctx, tokens) > 0) {
      counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
    }
  }
  return counts;
}
