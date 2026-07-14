// Wandelt die (großen, verschachtelten) db-vendo-Antworten in kompakte,
// LLM-freundliche Objekte um. Ziele:
//  - Zeiten als "HH:mm" (Europe/Berlin) statt ISO+Offset → weniger Tokens,
//    und das Modell rechnet Verspätungen nicht selbst falsch aus.
//  - Verspätung explizit als delayMin (Minuten, gerundet).
//  - Nur Felder, die der Chatbot für eine Antwort braucht.

const TZ = 'Europe/Berlin';

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

// Die bahn.de-Daten führen WLAN NICHT als Ausstattungs-Code — obwohl alle ICE
// kostenloses WLAN haben. Wir leiten es deterministisch aus dem Produkttyp ab
// (echtes API-Feld line.product), statt es zu erfinden oder in den Prompt zu
// schreiben. Nur wo es faktisch stimmt: ICE (nationalExpress).
function wifiFromProduct(product?: string): string | null {
  if (product === 'nationalExpress') return 'WLAN (kostenlos)';
  return null;
}

/** Ausstattung eines Zug-Abschnitts: Remark-Merkmale + aus dem Produkttyp
 *  abgeleitetes WLAN (dedupliziert). */
export function trainAmenities(remarks: unknown, product?: string): string[] {
  const list = amenityTexts(remarks);
  const wifi = wifiFromProduct(product);
  if (wifi && !list.some((a) => /wlan/i.test(a))) list.push(wifi);
  return list;
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
