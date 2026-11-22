import { useMemo } from 'react';

/** Marks search-token matches inside a string (case-insensitive, tokens ≥ 2 chars). */
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  const parts = useMemo(() => {
    const usable = tokens
      .filter((t) => t.length >= 2)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!usable.length) return [text];
    return text.split(new RegExp(`(${usable.join('|')})`, 'gi'));
  }, [text, tokens]);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-localizer/20 px-0.5 text-localizer-300">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
