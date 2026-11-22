// Maps the extracted legacy catalog (scripts/extract-legacy.mjs) to database rows.

// Folders whose generators are available on the Free plan; everything else is Pro.
export const FREE_CATEGORIES = new Set(['General & Normal Studios', 'X-Ray & Plain Film']);

function colorOf(name, meta) {
  if (name === 'Duplicates & Cloud Mirrors') return 'gold';
  const m = /bg-([a-z]+)-\d+/.exec(meta?.dot ?? '');
  return m ? m[1] : 'slate';
}

export function toRows({ apps, folderMeta, categories }) {
  const categoryRows = categories
    .filter((c) => c !== 'All')
    .map((name, i) => {
      const meta = folderMeta[name] ?? {};
      return {
        name,
        icon: meta.icon ?? '📁',
        subtitle: meta.subtitle ?? '',
        color: colorOf(name, meta),
        sort_order: i + 1,
      };
    });

  const appRows = apps.map((a) => {
    const integrated = !!a.isIntegrated;
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      modality: a.modality,
      status: a.status,
      badge: a.badge || null,
      description: a.desc ?? '',
      duplicate_of: a.duplicateOf ?? null,
      kind: integrated ? 'integrated' : 'external',
      external_url: integrated ? null : a.url,
      html_path: integrated ? a.htmlFile : null,
      cover_path: a.coverFile ?? null,
      tier: FREE_CATEGORIES.has(a.category) ? 'free' : 'pro',
      sort_order: (a.sortOrder + 1) * 10,
    };
  });

  return { categoryRows, appRows };
}
