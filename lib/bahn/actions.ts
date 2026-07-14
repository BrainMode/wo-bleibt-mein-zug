// Die 5 Kern-Funktionen der Bahn-Auskunft. Reine Funktionen ohne Framework-
// Bezug — werden identisch vom Chat-Agent (lib/tools.ts) UND vom MCP-Server
// (app/api/[transport]/route.ts) genutzt.
//
// Jede Funktion fängt db-vendo-Fehler ab und gibt im Fehlerfall { error }
// zurück, damit ein API-Ausfall nicht den Antwort-Stream crasht — das Modell
// kann die Fehlermeldung dem Nutzer erklären.
import { getClient, rotateClient } from './client';
import { cached } from '../cache';
import { formatStation, formatBoardEntry, hhmm, delayMin, remarkTexts, trainAmenities } from './format';

const API_ERROR = {
  error:
    'Die Bahn-Datenquelle antwortet gerade nicht (die verwendete inoffizielle API ist zeitweise nicht erreichbar). Bitte in einer Minute erneut versuchen.',
};

function logError(fn: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[bahn:${fn}]`, msg);
}

function isBlockError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /ops_blocked|forbidden|403|452|unknown|timeout|network/.test(msg);
}

type BahnClient = ReturnType<typeof getClient>;

/**
 * Führt einen db-vendo-Aufruf aus und wiederholt ihn bei einem Fingerprint-/
 * Block-Fehler auf einer ANDEREN Cipher-Variante (anderer TLS-Fingerprint).
 * Das entblockt in der Praxis Requests aus geflaggten (Datacenter-)IPs.
 */
async function withRetry<T>(fn: string, call: (c: BahnClient) => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await call(i === 0 ? getClient() : rotateClient());
    } catch (err) {
      lastErr = err;
      if (!isBlockError(err)) throw err;
      logError(`${fn}:retry${i}`, err);
    }
  }
  throw lastErr;
}

export type StationResult = { stations: ReturnType<typeof formatStation>[] } | typeof API_ERROR;

/** Sucht Bahnhöfe/Haltestellen nach Name. Liefert IDs für alle anderen Tools. */
export async function searchStations(query: string): Promise<StationResult> {
  // Bahnhofs-IDs ändern sich praktisch nie → 24 h cachen.
  return cached(`stations:${query.trim().toLowerCase()}`, 86_400, async () => {
    try {
      const results = await withRetry('searchStations', (c) =>
        c.locations(query, {
          results: 6,
          stops: true,
          addresses: false,
          poi: false,
        }),
      );
      return { stations: (results as unknown[]).map((s) => formatStation(s as never)) };
    } catch (err) {
      logError('searchStations', err);
      return API_ERROR;
    }
  });
}

type BoardOpts = { when?: string; towards?: string };

/** Abfahrtstafel eines Bahnhofs. `towards` filtert client-seitig nach Richtung. */
export async function getDepartures(stationId: string, opts: BoardOpts = {}) {
  const key = `dep:${stationId}:${opts.when ?? 'now'}:${opts.towards ?? ''}`;
  return cached(key, 30, async () => {
    try {
      const res = await withRetry('getDepartures', (c) =>
        c.departures(stationId, {
          duration: 60,
          results: 14,
          when: opts.when ? new Date(opts.when) : undefined,
        }),
      );
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
  });
}

/** Ankunftstafel eines Bahnhofs. */
export async function getArrivals(stationId: string, opts: BoardOpts = {}) {
  const key = `arr:${stationId}:${opts.when ?? 'now'}:${opts.towards ?? ''}`;
  return cached(key, 30, async () => {
    try {
      const res = await withRetry('getArrivals', (c) =>
        c.arrivals(stationId, {
          duration: 60,
          results: 14,
          when: opts.when ? new Date(opts.when) : undefined,
        }),
      );
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
  });
}

type JourneyOpts = { departure?: string; arrival?: string };

type Leg = {
  walking?: boolean;
  line?: { name?: string; product?: string };
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
  const key = `journey:${fromId}:${toId}:${opts.departure ?? ''}:${opts.arrival ?? 'now'}`;
  // Konkrete Zeit/Datum → 5 Min cachen; "jetzt" → 45 s.
  const ttl = opts.departure || opts.arrival ? 300 : 45;
  return cached(key, ttl, async () => {
  try {
    // db-vendo behandelt departure und arrival als sich gegenseitig ausschließend
    // — schon das bloße Vorhandensein beider Schlüssel (auch als undefined) löst
    // einen Fehler aus. Deshalb genau EINEN Zeitparameter setzen (departure hat
    // Vorrang), sonst keinen.
    const journeyOpts: Record<string, unknown> = { results: 3, stopovers: false };
    if (opts.departure) journeyOpts.departure = new Date(opts.departure);
    else if (opts.arrival) journeyOpts.arrival = new Date(opts.arrival);

    const res = await withRetry('planJourney', (c) => c.journeys(fromId, toId, journeyOpts));
    const journeys = (res.journeys ?? []).map((raw: unknown) => {
      const j = raw as { legs?: Leg[]; remarks?: unknown; price?: { amount?: number; currency?: string } };
      const legs = (j.legs ?? []).filter((l) => !l.walking);
      const first = legs[0];
      const last = legs[legs.length - 1];
      return {
        departure: hhmm(first?.departure),
        departureDelayMin: delayMin(first?.departureDelay),
        arrival: hhmm(last?.arrival),
        arrivalDelayMin: delayMin(last?.arrivalDelay),
        transfers: Math.max(0, legs.length - 1),
        priceFrom: j.price?.amount != null ? `${j.price.amount.toFixed(2)} ${j.price.currency ?? 'EUR'}` : null,
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
          amenities: trainAmenities(l.remarks, l.line?.product),
        })),
        warnings: remarkTexts(j.remarks, 3),
      };
    });
    return { journeys };
  } catch (err) {
    logError('planJourney', err);
    return API_ERROR;
  }
  });
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
  // Live-Daten, aber 20 s Cache fängt Mehrfachanfragen ohne spürbaren Frischeverlust.
  return cached(`trip:${tripId}`, 20, async () => {
  try {
    const res = await withRetry('trackTrain', (c) => c.trip(tripId, { stopovers: true }));
    const t = (res as { trip?: unknown }).trip ?? res;
    const trip = t as {
      line?: { name?: string; product?: string };
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
      amenities: trainAmenities(trip.remarks, trip.line?.product),
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
  });
}

/** Findet Bahnhöfe/Haltestellen im Umkreis eines Ortes/einer Adresse. */
export async function nearbyStations(place: string) {
  return cached(`nearby:${place.trim().toLowerCase()}`, 86_400, async () => {
    try {
      // 1) Ort/Adresse geocoden (locations liefert lat/lon, auch für Adressen/POIs).
      const geo = (await withRetry('nearbyStations:geo', (c) =>
        c.locations(place, { results: 1, stops: true, addresses: true, poi: true }),
      )) as Array<{ location?: { latitude?: number; longitude?: number }; latitude?: number; longitude?: number }>;
      const first = geo[0];
      const lat = first?.location?.latitude ?? first?.latitude;
      const lon = first?.location?.longitude ?? first?.longitude;
      if (lat == null || lon == null) {
        return { stations: [], hint: `Kein Ort namens "${place}" gefunden.` };
      }
      // 2) Haltestellen im Umkreis (3 km).
      const results = await withRetry('nearbyStations', (c) =>
        // @ts-expect-error — nearby ist im Minimal-Typ nicht deklariert
        c.nearby({ type: 'location', latitude: lat, longitude: lon }, { results: 6, distance: 3000 }),
      );
      return {
        stations: (results as unknown[]).map((s) => {
          const st = s as { id?: string; name?: string; distance?: number; products?: unknown };
          return { ...formatStation(st), distanceMeters: st.distance ?? null };
        }),
      };
    } catch (err) {
      logError('nearbyStations', err);
      return API_ERROR;
    }
  });
}
