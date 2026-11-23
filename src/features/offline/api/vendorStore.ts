import { isOnline } from '@/lib/network';

/*
 * Most generators load their styling and libraries from CDNs: Tailwind's Play CDN (which builds
 * the page's CSS in the browser), lucide icons, docx/JSZip for Word export, Chart.js and Google
 * Fonts. With no connection those requests fail and a generator opens unstyled. So the device
 * keeps one copy of each resource (Cache Storage, shared by every generator) and the suite writes
 * it into the generator's HTML before it renders: a generator looks and works the same offline,
 * opens without CDN round trips online, and "Save as file" writes a truly standalone page.
 *
 * Tailwind's CDN sends no CORS header, so the page can't read it: the suite ships that exact
 * file (public/vendor, precached by the service worker). Everything else is fetched with CORS.
 * These are public, versioned files: the cache is shared by accounts and kept on sign-out.
 */
const VENDOR_CACHE = 'radiology-vendor-v1';

/** Byte-identical copy of https://cdn.tailwindcss.com/3.4.17 (MIT). */
const TAILWIND_PLAY = 'vendor/tailwindcss-play-3.4.17.js';
const BUNDLED = new Map([
  ['https://cdn.tailwindcss.com/', TAILWIND_PLAY], // redirects to the latest 3.4, 3.4.17
  ['https://cdn.tailwindcss.com/3.4.17', TAILWIND_PLAY],
]);

const FETCH_TIMEOUT_MS = 5000;
// Google Fonts sends every script's subset; the generators are written in Latin script.
const DROPPED_FONT_SUBSETS = new Set([
  'cyrillic',
  'cyrillic-ext',
  'greek',
  'greek-ext',
  'vietnamese',
]);

const SCRIPT_TAG =
  /<script\b([^>]*?)\ssrc\s*=\s*(["'])(https:\/\/[^"']+)\2([^>]*)>\s*<\/script\s*>/gi;
const LINK_TAG = /<link\b[^>]*>/gi;
const FONT_IMPORT =
  /@import\s+(?:url\(\s*)?(["']?)(https:\/\/fonts\.googleapis\.com\/[^"')\s]+)\1\s*\)?\s*;?/gi;
const FONT_FILE = /https:\/\/fonts\.gstatic\.com\/[^)"'\s]+/g;
// Scripts whose timing depends on being external: inlining would change when they run.
const KEEP_EXTERNAL = /\b(?:defer|async|nomodule)\b|\btype\s*=\s*["']?module/i;
// Text the HTML parser treats specially inside <script>: such files go in as data: URLs.
const UNSAFE_INLINE = /<\/script|<!--|<script/i;

type Kind = 'script' | 'style';

const decodeAttr = (value: string) => value.replace(/&amp;/g, '&');

function stylesheetHref(tag: string): string | null {
  if (!/\srel\s*=\s*["']?[^"'>]*\bstylesheet\b/i.test(tag)) return null;
  const href = /\shref\s*=\s*(["'])(https:\/\/[^"']+)\1/i.exec(tag);
  return href?.[2] ? decodeAttr(href[2]) : null;
}

/** The CDN files a generator's HTML loads, by URL. */
function findResources(html: string): Map<string, Kind> {
  const found = new Map<string, Kind>();
  for (const m of html.matchAll(SCRIPT_TAG)) {
    if (!KEEP_EXTERNAL.test(`${m[1]} ${m[4]}`)) found.set(decodeAttr(m[3]!), 'script');
  }
  for (const m of html.matchAll(LINK_TAG)) {
    const href = stylesheetHref(m[0]);
    if (href) found.set(href, 'style');
  }
  for (const m of html.matchAll(FONT_IMPORT)) found.set(decodeAttr(m[2]!), 'style');
  return found;
}

async function openCache(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(VENDOR_CACHE) : null;
  } catch {
    return null; // private mode / storage disabled
  }
}

function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: abort.signal }).finally(() => clearTimeout(timer));
}

const corsFetch = (url: string) => timedFetch(url, { mode: 'cors', credentials: 'omit' });

function trimFontSubsets(css: string): string {
  return css.replace(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{[^}]*\}\s*/g, (block, subset) =>
    DROPPED_FONT_SUBSETS.has(subset as string) ? '' : block,
  );
}

/** Relative url() in a CDN stylesheet would resolve against the generator once inlined. */
function absoluteCssUrls(css: string, base: string): string {
  return css.replace(/url\(\s*(["']?)(?!data:|https?:|#)([^"')]+)\1\s*\)/gi, (_m, q, path) => {
    try {
      return `url(${q}${new URL(path as string, base).href}${q})`;
    } catch {
      return _m;
    }
  });
}

async function cacheFonts(cache: Cache, css: string): Promise<void> {
  const files = [...new Set(css.match(FONT_FILE) ?? [])];
  await Promise.all(
    files.map(async (url) => {
      if (await cache.match(url)) return;
      if (!isOnline()) return;
      const res = await corsFetch(url);
      if (res.ok) await cache.put(url, res);
    }),
  );
}

const inflight = new Map<string, Promise<boolean>>();

/** Puts one resource (and a stylesheet's font files) on the device. True when it's there. */
function ensureCached(cache: Cache, url: string, kind: Kind): Promise<boolean> {
  const running = inflight.get(url);
  if (running) return running;
  const job = (async () => {
    const hit = await cache.match(url);
    if (hit) {
      if (kind === 'style') await cacheFonts(cache, await hit.text());
      return true;
    }
    const bundled = BUNDLED.get(url);
    // The bundled copy is precached by the service worker: it loads with no connection too.
    if (!bundled && !isOnline()) return false;
    const res = bundled
      ? await timedFetch(new URL(bundled, document.baseURI).href)
      : await corsFetch(url);
    if (!res.ok) return false;
    let text = await res.text();
    if (kind === 'style') {
      text = url.startsWith('https://fonts.googleapis.com/')
        ? trimFontSubsets(text)
        : absoluteCssUrls(text, url);
      await cacheFonts(cache, text);
    }
    await cache.put(
      url,
      new Response(text, {
        headers: { 'content-type': kind === 'script' ? 'text/javascript' : 'text/css' },
      }),
    );
    return true;
  })()
    .catch(() => false)
    .finally(() => inflight.delete(url));
  inflight.set(url, job);
  return job;
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** The stylesheet with its font files written in, so the type is the same offline. */
async function cssWithFonts(cache: Cache, css: string): Promise<string> {
  const files = [...new Set(css.match(FONT_FILE) ?? [])];
  const inlined = await Promise.all(
    files.map(async (url) => {
      const res = await cache.match(url);
      return res ? ([url, await dataUrl(await res.blob())] as const) : null;
    }),
  );
  return inlined.reduce((out, pair) => (pair ? out.split(pair[0]).join(pair[1]) : out), css);
}

type Inline =
  | { kind: 'script'; text: string }
  | { kind: 'script-src'; src: string }
  | { kind: 'style'; css: string };

async function prepare(cache: Cache, url: string, kind: Kind): Promise<Inline | null> {
  if (!(await ensureCached(cache, url, kind))) return null;
  const res = await cache.match(url);
  if (!res) return null;
  const text = await res.text();
  if (kind === 'style') return { kind: 'style', css: await cssWithFonts(cache, text) };
  return UNSAFE_INLINE.test(text)
    ? { kind: 'script-src', src: await dataUrl(new Blob([text], { type: 'text/javascript' })) }
    : { kind: 'script', text };
}

/**
 * Keeps the CDN files this generator loads on the device (downloads them when missing and
 * online). True when every one of them is there.
 */
export async function cacheVendorResources(html: string): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  const results = await Promise.all(
    [...findResources(html)].map(([url, kind]) => ensureCached(cache, url, kind)),
  );
  return results.every(Boolean);
}

/**
 * The generator's HTML with the CDN files it loads written in (fetched and kept first when
 * missing and online). A file that isn't available stays a CDN link, exactly as written.
 */
export async function inlineVendorResources(html: string): Promise<string> {
  try {
    const resources = findResources(html);
    if (!resources.size) return html;
    const cache = await openCache();
    if (!cache) return html;
    const ready = new Map<string, Inline>();
    await Promise.all(
      [...resources].map(async ([url, kind]) => {
        const inline = await prepare(cache, url, kind).catch(() => null);
        if (inline) ready.set(url, inline);
      }),
    );
    if (!ready.size) return html;

    const style = (css: string, media?: string) =>
      `<style${media ? ` media="${media}"` : ''}>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
    return html
      .replace(
        SCRIPT_TAG,
        (tag: string, before: string, _q: string, src: string, after: string) => {
          const inline = ready.get(decodeAttr(src));
          if (!inline || KEEP_EXTERNAL.test(`${before} ${after}`)) return tag;
          const attrs = `${before}${after}`.replace(
            /\s(?:integrity|crossorigin|referrerpolicy)(?:\s*=\s*(["'])[^"']*\1)?/gi,
            '',
          );
          if (inline.kind === 'script-src') return `<script${attrs} src="${inline.src}"></script>`;
          return inline.kind === 'script' ? `<script${attrs}>${inline.text}</script>` : tag;
        },
      )
      .replace(LINK_TAG, (tag: string) => {
        const href = stylesheetHref(tag);
        const inline = href ? ready.get(href) : undefined;
        if (inline?.kind !== 'style') return tag;
        const media = /\smedia\s*=\s*(["'])([^"']*)\1/i.exec(tag)?.[2];
        return style(inline.css, media);
      })
      .replace(FONT_IMPORT, (rule: string, _q: string, url: string) => {
        const inline = ready.get(decodeAttr(url));
        return inline?.kind === 'style' ? inline.css : rule;
      });
  } catch {
    return html; // never stand between the person and their generator
  }
}
