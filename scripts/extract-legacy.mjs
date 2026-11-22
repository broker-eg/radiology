#!/usr/bin/env node
// Extracts data from the legacy single-file offline suite HTML into plain files.
//
// Usage: node scripts/extract-legacy.mjs <legacy.html> <outDir> <brandingAssetsDir>
//
// Produces:
//   <outDir>/catalog.json        app metadata (no base64 blobs)
//   <outDir>/html/<id>.html      decoded integrated report generators
//   <outDir>/covers/<id>.jpg     app cover images
//   <brandingAssetsDir>/portrait.jpg, hero.jpg, fallback-cover.jpg

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const [legacyPath, outDir, brandDir] = process.argv.slice(2);
if (!legacyPath || !outDir || !brandDir) {
  console.error('usage: extract-legacy.mjs <legacy.html> <outDir> <brandingAssetsDir>');
  process.exit(1);
}

const src = fs.readFileSync(legacyPath, 'utf8');

/** Returns the source text of a JS literal starting at `startToken`, balanced on brackets. */
function sliceLiteral(startToken) {
  const at = src.indexOf(startToken);
  if (at < 0) throw new Error(`token not found: ${startToken}`);
  let i = at + startToken.length - 1; // points to the opening bracket
  const open = src[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return src.slice(at + startToken.length - 1, i + 1);
    }
  }
  throw new Error(`unbalanced literal: ${startToken}`);
}

function evalLiteral(text) {
  // The legacy literals are plain data (strings, arrays, objects); evaluate in an empty context.
  return vm.runInNewContext(`(${text})`, Object.create(null), { timeout: 20000 });
}

function stringConst(name) {
  const m = src.match(new RegExp(`const ${name} = '(data:image\\/jpeg;base64,[A-Za-z0-9+/=]+)'`));
  if (!m) throw new Error(`const not found: ${name}`);
  return m[1];
}

function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('not a base64 data url');
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

const embedded = evalLiteral(sliceLiteral('const EMBEDDED_HTML_B64 = {'));
const apps = evalLiteral(sliceLiteral('const DEFAULT_APPS = ['));
const folderMeta = evalLiteral(sliceLiteral('const FOLDER_META = {'));
const categories = evalLiteral(sliceLiteral('const CATEGORIES = ['));
const synonyms = evalLiteral(sliceLiteral('const SEARCH_SYNONYMS = {'));

fs.mkdirSync(path.join(outDir, 'html'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'covers'), { recursive: true });
fs.mkdirSync(brandDir, { recursive: true });

const catalog = [];
let htmlCount = 0;
apps.forEach((app, index) => {
  const { cover, ...meta } = app;
  const entry = { ...meta, sortOrder: index };
  if (cover) {
    const { mime, buf } = dataUrlToBuffer(cover);
    if (mime !== 'image/jpeg') throw new Error(`unexpected cover mime ${mime} for ${app.id}`);
    fs.writeFileSync(path.join(outDir, 'covers', `${app.id}.jpg`), buf);
    entry.coverFile = `${app.id}.jpg`;
  }
  if (app.isIntegrated) {
    const b64 = embedded[app.id];
    if (!b64) throw new Error(`integrated app without embedded html: ${app.id}`);
    const html = Buffer.from(b64, 'base64').toString('utf8');
    fs.writeFileSync(path.join(outDir, 'html', `${app.id}.html`), html);
    entry.htmlFile = `${app.id}.html`;
    htmlCount++;
  }
  catalog.push(entry);
});

const orphanHtml = Object.keys(embedded).filter((id) => !apps.some((a) => a.id === id));

fs.writeFileSync(
  path.join(outDir, 'catalog.json'),
  JSON.stringify({ apps: catalog, folderMeta, categories, synonyms, orphanHtml }, null, 2),
);

// Branding images: the portrait appears in the entry gate <img>, the hero/fallback are consts.
const portrait = src.match(
  /<img src="(data:image\/jpeg;base64,[A-Za-z0-9+/=]+)" alt="Dr\. Yasser Shalaby, MD"/,
);
if (!portrait) throw new Error('portrait not found');
fs.writeFileSync(path.join(brandDir, 'portrait.jpg'), dataUrlToBuffer(portrait[1]).buf);
fs.writeFileSync(
  path.join(brandDir, 'hero.jpg'),
  dataUrlToBuffer(stringConst('DEFAULT_HERO_COVER')).buf,
);
fs.writeFileSync(
  path.join(brandDir, 'fallback-cover.jpg'),
  dataUrlToBuffer(stringConst('FALLBACK_CUSTOM_COVER')).buf,
);

console.log(
  JSON.stringify(
    {
      apps: apps.length,
      integrated: apps.filter((a) => a.isIntegrated).length,
      external: apps.filter((a) => !a.isIntegrated).length,
      htmlWritten: htmlCount,
      embeddedKeys: Object.keys(embedded).length,
      orphanHtml,
      categories: categories.length,
    },
    null,
    2,
  ),
);
