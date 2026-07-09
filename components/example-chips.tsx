'use client';

import type { Lang } from '@/lib/i18n';
import { STRINGS } from '@/lib/i18n';

export function ExampleChips({ lang, onPick }: { lang: Lang; onPick: (text: string) => void }) {
  const s = STRINGS[lang];
  return (
    <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2">
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {s.examplesLabel}
      </p>
      {s.examples.map((ex) => (
        <button
          key={ex}
          onClick={() => onPick(ex)}
          className="group rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-left text-sm text-[var(--ink)] transition hover:border-[var(--wbmz-red)] hover:bg-[var(--panel)]"
        >
          <span className="mr-2 text-[var(--wbmz-red)]">🚆</span>
          {ex}
        </button>
      ))}
    </div>
  );
}
