// Wandelt die (großen, verschachtelten) db-vendo-Antworten in kompakte,
// LLM-freundliche Objekte um. Ziele:
//  - Zeiten als "HH:mm" (Europe/Berlin) statt ISO+Offset → weniger Tokens,
//    und das Modell rechnet Verspätungen nicht selbst falsch aus.
//  - Verspätung explizit als delayMin (Minuten, gerundet).
//  - Nur Felder, die der Chatbot für eine Antwort braucht.

const TZ = 'Europe/Berlin';

// Interpretiert einen (evtl. offset-losen) ISO-Zeitstring als Europe/Berlin —
// UNABHÄNGIG von der Server-Zeitzone. Das Modell liefert Zeiten wie
// "2026-07-14T11:53:00" ohne Offset; new Date() würde das in der Server-TZ lesen.
// Auf Vercel läuft Node in UTC → „11:53" läge sonst 1–2 h daneben (DST-korrekt).
export function parseBerlin(s: string): Date {
  if (/([+-]\d{2}:?\d{2}|Z)$/.test(s)) return new Date(s); // hat bereits einen Offset
  const asUtc = new Date(`${s}Z`);
  if (Number.isNaN(asUtc.getTime())) return new Date(s);
  const berlinWall = new Date(
    `${asUtc.toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T')}Z`,
  );
  const offsetMs = berlinWall.getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offsetMs);
}

/**
 * Tolerantes Parsen von Nutzer-/Modell-Zeitangaben: ISO (mit/ohne Offset),
 * blosse Uhrzeit "17:00" (→ heute, Berlin), deutsches Datum "15.07.2026 17:00".
 * null = nicht verstanden (Aufrufer gibt dann einen klaren Hinweis statt eines
 * irreführenden „API antwortet nicht").
 */
export function parseTimeInput(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
    const d = parseBerlin(`${today}T${t.length === 4 ? '0' + t : t}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dm = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[T ](\d{1,2}:\d{2}(?::\d{2})?))?$/.exec(t);
  if (dm) {
    const time = dm[4] ? (dm[4].length === 4 ? '0' + dm[4] : dm[4]) : '00:00';
    const d = parseBerlin(`${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}T${time}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = parseBerlin(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hhmm(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

/** delay ist in Sekunden; wir liefern gerundete Minuten (null wenn unbekannt). */
export function delayMin(delaySeconds: number | null | undefined): number | null {
  if (delaySeconds == null) return null;
  return Math.round(delaySeconds / 60);
}

type Remark = { type?: string; code?: string; text?: string; summary?: string };

/** Extrahiert Warnungen/Störungen (Verspätungsgründe, Ausfälle, Ersatzverkehr). */
export function remarkTexts(remarks: unknown, max = 3): string[] {
  if (!Array.isArray(remarks)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of remarks as Remark[]) {
    // Nur echte Störungs-/Statusmeldungen — Ausstattung wird separat behandelt.
    if (r.type && !['warning', 'status'].includes(r.type)) continue;
    const text = (r.summary || r.text || '').trim();
    if (text && !seen.has(text)) {
      seen.add(text);
      out.push(text);
      if (out.length >= max) break;
    }
  }
  return out;
}

// Ausstattungs-Codes (type: 'hint') → saubere deutsche Labels. Diese stecken in
// den remarks der Züge/Verbindungen und beantworten Fragen wie „Gibt es ein
// Bordrestaurant?" oder „Kann ich mein Fahrrad mitnehmen?".
const AMENITY_LABELS: Record<string, string> = {
  'on-board-restaurant': 'Bordrestaurant',
  'board-restaurant': 'Bordrestaurant',
  'on-board-bistro': 'Bordbistro',
  'board-bistro': 'Bordbistro',
  'on-board-service': 'Bordservice am Platz',
  'komfort-checkin': 'Komfort Check-in',
  'bicycle-conveyance': 'Fahrradmitnahme möglich',
  'bicycle-conveyance-reservation': 'Fahrradmitnahme (reservierungspflichtig)',
  'bicycle-conveyance-required-reservation': 'Fahrradmitnahme (reservierungspflichtig)',
  'air-conditioned': 'Klimaanlage',
  'air-conditioning': 'Klimaanlage',
  wifi: 'WLAN',
  wlan: 'WLAN',
  'power-sockets': 'Steckdosen am Platz',
  'wheelchair-accessible': 'Rollstuhlgerecht',
  'boarding-aid': 'Ein-/Ausstiegshilfe',
  'barrier-free': 'Barrierefrei',
  'quiet-zone': 'Ruhebereich',
  'family-zone': 'Familienbereich',
  'family-area': 'Familienbereich',
};

/** Extrahiert Ausstattungs-Merkmale eines Zuges (Bordrestaurant, Fahrrad, WLAN …). */
export function amenityTexts(remarks: unknown): string[] {
  if (!Array.isArray(remarks)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of remarks as Remark[]) {
    if (r.type !== 'hint' || !r.code) continue;
    const label = AMENITY_LABELS[r.code];
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}


type StationLike = { id?: string; name?: string; products?: unknown };

/** products kommt als Objekt-Map ({regional:true,…}) oder Array — normalisieren. */
export function productList(products: unknown): string[] {
  if (!products) return [];
  if (Array.isArray(products)) return products as string[];
  return Object.entries(products as Record<string, unknown>)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

export function formatStation(s: StationLike) {
  return {
    id: s.id ?? '',
    name: s.name ?? '',
    products: productList(s.products),
  };
}

type Arrival = {
  line?: { name?: string };
  direction?: string;
  provenance?: string;
  when?: string;
  plannedWhen?: string;
  delay?: number | null;
  platform?: string | null;
  plannedPlatform?: string | null;
  cancelled?: boolean;
  tripId?: string;
  remarks?: unknown;
};

export type BoardEntry = {
  line: string;
  direction?: string;
  origin?: string;
  plannedTime: string | null;
  time: string | null;
  delayMin: number | null;
  platform: string | null;
  platformChanged: boolean;
  cancelled: boolean;
  tripId: string | null;
  remarks: string[];
};

/** Gemeinsame Formatierung für Abfahrten und Ankünfte. */
export function formatBoardEntry(d: Arrival, kind: 'departure' | 'arrival'): BoardEntry {
  return {
    line: d.line?.name ?? '?',
    // Bei Abfahrten: wohin. Bei Ankünften: woher (provenance).
    ...(kind === 'departure'
      ? { direction: d.direction ?? '?' }
      : { origin: d.provenance ?? '?' }),
    plannedTime: hhmm(d.plannedWhen),
    time: hhmm(d.when),
    delayMin: delayMin(d.delay),
    platform: d.platform ?? null,
    platformChanged:
      d.plannedPlatform != null && d.platform != null && d.plannedPlatform !== d.platform,
    cancelled: Boolean(d.cancelled),
    tripId: d.tripId ?? null,
    remarks: remarkTexts(d.remarks),
  };
}
