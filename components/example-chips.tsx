'use client';

export const EXAMPLES = [
  'Mein Zug nach Hagen hat Verspätung, ich stehe in Iserlohn — wo bleibt er?',
  'Nächste Verbindung von Berlin Hbf nach München Hbf',
  'Welche Züge fahren in der nächsten Stunde ab Köln Hbf Richtung Düsseldorf?',
];

export function ExampleChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2">
      <p className="mb-1 text-center text-xs uppercase tracking-wider text-emerald-400/50">
        Probier eine Frage
      </p>
      {EXAMPLES.map((ex) => (
        <button
          key={ex}
          onClick={() => onPick(ex)}
          className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-emerald-50/80 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-50"
        >
          <span className="mr-2 text-emerald-400/70 group-hover:text-emerald-300">🚆</span>
          {ex}
        </button>
      ))}
    </div>
  );
}
