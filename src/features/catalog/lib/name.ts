/**
 * Almost every generator's name ends in the same product words ("… Structured Report
 * Auto-Generator", "… Report Studio"). Splitting them off lets a list lead with what tells the
 * generators apart, the exam, while keeping the full name as written.
 */
const PRODUCT_WORDS = new Set([
  'structured',
  'report',
  'reporting',
  'reporter',
  'generator',
  'auto-generator',
  'auto-report',
  'auto-reporter',
  'studio',
]);

export function splitGeneratorName(name: string): { exam: string; kind: string } {
  const words = name.trim().split(/\s+/);
  const isProduct = (w: string) => PRODUCT_WORDS.has(w.toLowerCase());
  const isDash = (w: string) => /^[—–-]$/.test(w);
  let cut = words.length;
  while (cut > 1 && isProduct(words[cut - 1]!)) cut--;
  if (cut === words.length) return { exam: name, kind: '' };
  // A dash left dangling ("Brain Trauma —") goes with the product words, and so do product
  // words before it ("Sinuses Report Studio — Auto-Generator").
  while (cut > 1 && (isDash(words[cut - 1]!) || isProduct(words[cut - 1]!))) cut--;
  return { exam: words.slice(0, cut).join(' '), kind: words.slice(cut).join(' ') };
}
