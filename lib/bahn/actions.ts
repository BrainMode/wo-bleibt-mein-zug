// Die 5 Kern-Funktionen der Bahn-Auskunft. Reine Funktionen ohne Framework-
// Bezug — werden identisch vom Chat-Agent (lib/tools.ts) UND vom MCP-Server
// (app/api/[transport]/route.ts) genutzt.
//
// Jede Funktion fängt db-vendo-Fehler ab und gibt im Fehlerfall { error }
// zurück, damit ein API-Ausfall nicht den Antwort-Stream crasht — das Modell
// kann die Fehlermeldung dem Nutzer erklären.
import { bahn } from './client';
import { formatStation, formatBoardEntry, hhmm, delayMin, remarkTexts, amenityTexts } from './format';

const API_ERROR = {
  error:
    'Die Bahn-Datenquelle antwortet gerade nicht (die verwendete inoffizielle API ist zeitweise nicht erreichbar). Bitte in einer Minute erneut versuchen.',
};

function logError(fn: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[bahn:${fn}]`, msg);
}

export type StationResult = { stations: ReturnType<typeof formatStation>[] } | typeof API_ERROR;

/** Sucht Bahnhöfe/Haltestellen nach Name. Liefert IDs für alle anderen Tools. */
export async function searchStations(query: string): Promise<StationResult> {
  try {
    const results = await bahn.locations(query, {
      results: 6,
      stops: true,
      addresses: false,
      poi: false,
    });
    return { stations: (results as unknown[]).map((s) => formatStation(s as never)) };
  } catch (err) {
    logError('searchStations', err);
    return API_ERROR;
  }
}

type BoardOpts = { when?: string; towards?: string };

/** Abfahrtstafel eines Bahnhofs. `towards` filtert client-seitig nach Richtung. */
export async function getDepartures(stationId: string, opts: BoardOpts = {}) {
  try {
    const res = await bahn.departures(stationId, {
      duration: 60,
      results: 14,
      when: opts.when ? new Date(opts.when) : undefined,
    });
    let entries = (res.departures ?? []).map((d: unknown) => formatBoardEntry(d as never, 'departure'));
    if (opts.towards) {
      const needle = opts.towards.toLowerCase();
      const filtered = entries.filter((e) => e.direction?.toLowerCase().includes(needle));
      // Nur filtern, wenn dadurch nicht alles wegfällt (Richtung evtl. Zwischenziel).
      if (filtered.length > 0) entries = filtered;
    }
    return { station: stationId, departures: entries.slice(0, 10) };
  } catch (err) {
    logError('getDepartures', err);
    return API_ERROR;
  }
}

/** Ankunftstafel eines Bahnhofs. */
export async function getArrivals(stationId: string, opts: BoardOpts = {}) {
  try {
    const res = await bahn.arrivals(stationId, {
      duration: 60,
      results: 14,
      when: opts.when ? new Date(opts.when) : undefined,
    });
    let entries = (res.arrivals ?? []).map((d: unknown) => formatBoardEntry(d as never, 'arrival'));
    if (opts.towards) {
      const needle = opts.towards.toLowerCase();
      const filtered = entries.filter((e) => e.origin?.toLowerCase().includes(needle));
      if (filtered.length > 0) entries = filtered;
    }
    return { station: stationId, arrivals: entries.slice(0, 10) };
  } catch (err) {
    logError('getArrivals', err);
    return API_ERROR;
  }
}

type JourneyOpts = { departure?: string; arrival?: string };

type Leg = {
  walking?: boolean;
  line?: { name?: string };
  direction?: string;
  origin?: { name?: string };
  destination?: { name?: string };
  departure?: string;
  departureDelay?: number | null;
  departurePlatform?: string | null;
  arrival?: string;
  arrivalDelay?: number | null;
  arrivalPlatform?: string | null;
  tripId?: string;
  remarks?: unknown;
};

/** Verbindungssuche A→B mit Umstiegen. */
export async function planJourney(fromId: string, toId: string, opts: JourneyOpts = {}) {
  try {
    const res = await bahn.journeys(fromId, toId, {
      results: 3,
      stopovers: false,
      departure: opts.departure ? new Date(opts.departure) : undefined,
      arrival: opts.arrival ? new Date(opts.arrival) : undefined,
    });
    const journeys = (res.journeys ?? []).map((raw: unknown) => {
      const j = raw as { legs?: Leg[]; remarks?: unknown };
      const legs = (j.legs ?? []).filter((l) => !l.walking);
      const first = legs[0];
      const last = legs[legs.length - 1];
      return {
        departure: hhmm(first?.departure),
        departureDelayMin: delayMin(first?.departureDelay),
        arrival: hhmm(last?.arrival),
        arrivalDelayMin: delayMin(last?.arrivalDelay),
        transfers: Math.max(0, legs.length - 1),
        legs: legs.map((l) => ({
          line: l.line?.name ?? '?',
          direction: l.direction ?? '?',
          from: l.origin?.name ?? '?',
          fromPlatform: l.departurePlatform ?? null,
          dep: hhmm(l.departure),
          depDelayMin: delayMin(l.departureDelay),
          to: l.destination?.name ?? '?',
          toPlatform: l.arrivalPlatform ?? null,
          arr: hhmm(l.arrival),
          arrDelayMin: delayMin(l.arrivalDelay),
          tripId: l.tripId ?? null,
          amenities: amenityTexts(l.remarks),
        })),
        warnings: remarkTexts(j.remarks, 3),
      };
    });
    return { journeys };
  } catch (err) {
    logError('planJourney', err);
    return API_ERROR;
  }
}

type Stopover = {
  stop?: { name?: string };
  arrival?: string;
  plannedArrival?: string;
  arrivalDelay?: number | null;
  arrivalPlatform?: string | null;
  departure?: string;
  plannedDeparture?: string;
  departureDelay?: number | null;
  departurePlatform?: string | null;
  cancelled?: boolean;
};

/** Live-Fahrtverlauf eines konkreten Zuges (Kern-Feature: „Wo bleibt mein Zug?"). */
export async function trackTrain(tripId: string) {
  try {
    const res = await bahn.trip(tripId, { stopovers: true });
    const t = (res as { trip?: unknown }).trip ?? res;
    const trip = t as {
      line?: { name?: string };
      direction?: string;
      arrivalDelay?: number | null;
      departureDelay?: number | null;
      cancelled?: boolean;
      stopovers?: Stopover[];
      remarks?: unknown;
    };
    return {
      line: trip.line?.name ?? '?',
      direction: trip.direction ?? '?',
      currentDelayMin: delayMin(trip.departureDelay ?? trip.arrivalDelay),
      cancelled: Boolean(trip.cancelled),
      amenities: amenityTexts(trip.remarks),
      stops: (trip.stopovers ?? []).map((s) => ({
        name: s.stop?.name ?? '?',
        arr: hhmm(s.arrival ?? s.plannedArrival),
        arrDelayMin: delayMin(s.arrivalDelay),
        dep: hhmm(s.departure ?? s.plannedDeparture),
        depDelayMin: delayMin(s.departureDelay),
        platform: s.arrivalPlatform ?? s.departurePlatform ?? null,
        cancelled: Boolean(s.cancelled),
      })),
      remarks: remarkTexts(trip.remarks, 3),
    };
  } catch (err) {
    logError('trackTrain', err);
    return API_ERROR;
  }
}
