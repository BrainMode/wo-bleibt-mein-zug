// Übersetzt Tool-Aufrufe in freundliche deutsche Statuszeilen mit Spinner,
// die während der Ausführung eingeblendet werden.

const TOOL_LABELS: Record<string, { running: string; done: string; icon: string }> = {
  searchStations: { running: 'Suche Bahnhof …', done: 'Bahnhof gefunden', icon: '🔍' },
  getDepartures: { running: 'Lade Abfahrtstafel …', done: 'Abfahrten geladen', icon: '🚉' },
  getArrivals: { running: 'Lade Ankunftstafel …', done: 'Ankünfte geladen', icon: '🚉' },
  planJourney: { running: 'Suche Verbindungen …', done: 'Verbindungen gefunden', icon: '🗺️' },
  trackTrain: { running: 'Verfolge Zug …', done: 'Zug verfolgt', icon: '📍' },
};

export function ToolStatus({
  toolName,
  state,
}: {
  toolName: string;
  state: string;
}) {
  const label = TOOL_LABELS[toolName];
  if (!label) return null;

  const done = state === 'output-available';
  const error = state === 'output-error';

  return (
    <div className="my-1.5 flex items-center gap-2 text-sm text-emerald-300/70">
      <span aria-hidden>{label.icon}</span>
      {error ? (
        <span className="text-amber-300/80">Bahn-API nicht erreichbar</span>
      ) : done ? (
        <span className="text-emerald-300/60">✓ {label.done}</span>
      ) : (
        <span className="flex items-center gap-2">
          {label.running}
          <span className="inline-flex gap-0.5">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </span>
        </span>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1 w-1 animate-bounce rounded-full bg-emerald-400"
      style={{ animationDelay: delay }}
    />
  );
}
