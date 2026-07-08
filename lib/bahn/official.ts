// Offizielle DB-API-Marketplace-Integration (StaDa + FaSta).
// Anders als die inoffizielle db-vendo-Quelle sind das offizielle, lizenzsichere
// (CC BY 4.0), rate-limitierte APIs mit eigenem Key — sie blocken nicht unter Last.
//
// StaDa (Station Data): Bahnhofs-Ausstattung (Toiletten, DB Lounge, WLAN, Parken,
//   Schließfächer, stufenfreier Zugang …).
// FaSta (Facility Status): Live-Status von Aufzügen & Rolltreppen.
//
// Auth: Header DB-Client-Id + DB-Api-Key. Ohne Keys geben die Funktionen einen
// klaren Hinweis zurück (graceful degradation) — die App läuft trotzdem.
//
// HINWEIS: Response-Shapes nach Erhalt echter Keys verifizieren; der Code ist
// defensiv (Optional Chaining, tolerante Feldzugriffe).

import { cached } from '../cache';
import { searchStations } from './actions';

const MARKET = 'https://apis.deutschebahn.com/db-api-marketplace/apis';
const STADA_BASE = `${MARKET}/station-data/v2`;
const FASTA_BASE = `${MARKET}/fasta/v2`;

const NOT_CONFIGURED = {
  error: 'nicht_konfiguriert',
  hint:
    'Bahnhofs-Ausstattung und Aufzugsstatus sind noch nicht aktiviert — dafür fehlt der (kostenlose) DB-API-Key. Frag mich stattdessen nach Abfahrten, Verspätungen oder Verbindungen.',
};

function hasKeys(): boolean {
  return Boolean(process.env.DB_CLIENT_ID && process.env.DB_API_KEY);
}

async function dbFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'DB-Client-Id': process.env.DB_CLIENT_ID!,
      'DB-Api-Key': process.env.DB_API_KEY!,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`DB-API HTTP ${res.status}`);
  return (await res.json()) as T;
}

// StaDa-Ausstattungsfelder → deutsche Labels. Werte sind i.d.R. 'yes'/'no'.
const STADA_FEATURES: Array<[keys: string[], label: string]> = [
  [['hasPublicFacilities'], 'öffentliche Toiletten'],
  [['hasDBLounge'], 'DB Lounge'],
  [['hasWiFi'], 'WLAN'],
  [['hasParking'], 'Parkplätze'],
  [['hasBicycleParking'], 'Fahrradstellplätze'],
  [['hasLockerSystem'], 'Schließfächer'],
  [['hasTaxiRank'], 'Taxistand'],
  [['hasSteplessAccess', 'hasStepFreeAccess'], 'stufenfreier Zugang'],
  [['hasTravelCenter'], 'Reisezentrum'],
  [['hasTravelNecessities'], 'Reisebedarf/Kiosk'],
  [['hasRailwayMission'], 'Bahnhofsmission'],
  [['hasLostAndFound'], 'Fundbüro'],
  [['hasCarRental'], 'Mietwagen'],
];

function truthy(v: unknown): boolean {
  return v === 'yes' || v === true || v === 'true';
}

type StadaStation = {
  number?: number;
  name?: string;
  evaNumbers?: Array<{ number?: number }>;
  [key: string]: unknown;
};

async function stadaSearch(term: string): Promise<StadaStation[]> {
  // StaDa verlangt Wildcards (*Begriff*) und strikte Teilstring-Treffer.
  const data = await dbFetch<{ result?: StadaStation[] }>(
    `${STADA_BASE}/stations?searchstring=${encodeURIComponent(`*${term}*`)}`,
  ).catch(() => ({ result: [] as StadaStation[] }));
  return data.result ?? [];
}

/**
 * Findet einen StaDa-Bahnhof robust gegen Schreibweisen (Umlaute, Klammern wie
 * „Frankfurt(Main)Hbf", Abkürzungen). Strategie: Namen zuerst über db-vendo
 * kanonisieren (fuzzy → liefert EVA-Nummer), dann den StaDa-Treffer per EVA
 * matchen. Fällt db-vendo aus, direkte StaDa-Suche als Fallback.
 */
async function findStadaStation(name: string): Promise<StadaStation | null> {
  const q = name.trim();

  // 1) Kanonisieren über db-vendo → EVA + sauberer Name.
  let eva: number | null = null;
  let canon = q;
  try {
    const sr = await searchStations(q);
    const st0 = 'stations' in sr ? sr.stations[0] : undefined;
    if (st0) {
      eva = Number(st0.id) || null;
      canon = st0.name || q;
    }
  } catch {
    // db-vendo nicht erreichbar → direkter StaDa-Weg unten.
  }

  // 2) StaDa mit dem Kernbegriff (erstes Wort, Klammern entfernt) suchen …
  const token = canon.replace(/\(.*?\)/g, ' ').split(/[\s,]+/)[0] || q;
  const results = await stadaSearch(token);

  // … und per EVA-Nummer den exakten Bahnhof herauspicken.
  if (eva && results.length) {
    const byEva = results.find((r) => (r.evaNumbers ?? []).some((e) => e.number === eva));
    if (byEva) return byEva;
  }

  // 3) Fallbacks ohne EVA-Match: exakter Name, sonst kürzester Name.
  const pool = results.length ? results : await stadaSearch(q);
  if (!pool.length) return null;
  const lower = canon.toLowerCase();
  const exact = pool.find((r) => (r.name ?? '').toLowerCase() === lower);
  if (exact) return exact;
  return [...pool].sort((a, b) => (a.name?.length ?? 99) - (b.name?.length ?? 99))[0];
}

/**
 * Bahnhofs-Ausstattung per StaDa. Liefert, was ein Bahnhof bietet
 * (Toiletten, DB Lounge, WLAN, Parken …) und die stationNumber für FaSta.
 */
export async function stationFacilities(name: string) {
  if (!hasKeys()) return NOT_CONFIGURED;
  return cached(`stada:${name.trim().toLowerCase()}`, 86_400, async () => {
    try {
      const st = await findStadaStation(name);
      if (!st) return { found: false, hint: `Kein Bahnhof namens "${name}" gefunden.` };
      const features = STADA_FEATURES.filter(([keys]) => keys.some((k) => truthy(st[k]))).map(
        ([, label]) => label,
      );
      return {
        name: st.name ?? name,
        stationNumber: st.number ?? null,
        eva: st.evaNumbers?.[0]?.number ?? null,
        features,
      };
    } catch (err) {
      console.warn('[official:stationFacilities]', err instanceof Error ? err.message : err);
      return {
        error: 'api',
        hint: 'Die offizielle DB-Bahnhofs-API antwortet gerade nicht.',
      };
    }
  });
}

type FastaFacility = {
  type?: string; // ELEVATOR | ESCALATOR
  state?: string; // ACTIVE | INACTIVE | UNKNOWN
  description?: string;
  stationnumber?: number;
};

/**
 * Live-Status der Aufzüge & Rolltreppen eines Bahnhofs per FaSta.
 * Ermittelt zunächst die stationNumber über StaDa.
 */
export async function facilityStatus(name: string) {
  if (!hasKeys()) return NOT_CONFIGURED;
  return cached(`fasta:${name.trim().toLowerCase()}`, 120, async () => {
    try {
      // stationNumber über StaDa besorgen (FaSta nutzt die Bahnhofs-Nr, nicht EVA).
      const stada = await stationFacilities(name);
      const stationNumber = (stada as { stationNumber?: number }).stationNumber;
      if (!stationNumber) return { found: false, hint: `Kein Bahnhof namens "${name}" gefunden.` };

      const data = await dbFetch<{ facilities?: FastaFacility[] } | FastaFacility[]>(
        `${FASTA_BASE}/stations/${stationNumber}`,
      );
      const list: FastaFacility[] = Array.isArray(data) ? data : (data.facilities ?? []);
      const map = (f: FastaFacility) => ({
        art: f.type === 'ELEVATOR' ? 'Aufzug' : f.type === 'ESCALATOR' ? 'Rolltreppe' : f.type ?? '?',
        ort: f.description ?? '',
        status:
          f.state === 'ACTIVE'
            ? 'in Betrieb'
            : f.state === 'INACTIVE'
              ? 'außer Betrieb'
              : 'unbekannt',
      });
      const facilities = list.map(map);
      const defekt = facilities.filter((f) => f.status === 'außer Betrieb');
      return {
        name,
        anzahl: facilities.length,
        ausserBetrieb: defekt,
        alle: facilities,
      };
    } catch (err) {
      console.warn('[official:facilityStatus]', err instanceof Error ? err.message : err);
      return { error: 'api', hint: 'Die offizielle DB-Aufzug-API (FaSta) antwortet gerade nicht.' };
    }
  });
}
