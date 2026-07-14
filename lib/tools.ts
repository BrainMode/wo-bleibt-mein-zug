import { tool } from 'ai';
import { z } from 'zod';
import {
  searchStations,
  getDepartures,
  getArrivals,
  planJourney,
  trackTrain,
  nearbyStations,
} from './bahn/actions';
import { stationFacilities, facilityStatus } from './bahn/official';

// AI-SDK-v7-Tools. WICHTIG: `inputSchema` (nicht mehr `parameters` wie in v4).
// Alle execute-Funktionen delegieren an die puren Actions in lib/bahn/actions.ts,
// die dieselbe Logik dem MCP-Server bereitstellen.
export const bahnTools = {
  searchStations: tool({
    description:
      'Sucht Bahnhöfe und Haltestellen nach Name und liefert deren IDs. Rufe dies IMMER zuerst auf, um die stationId für die anderen Tools zu bekommen.',
    inputSchema: z.object({
      query: z.string().describe('Name des Bahnhofs/Orts, z.B. "Iserlohn" oder "Berlin Hbf"'),
    }),
    execute: async ({ query }) => searchStations(query),
  }),

  getDepartures: tool({
    description:
      'Abfahrtstafel eines Bahnhofs (nächste ~60 Min) mit Verspätungen, Gleisen, Ausfällen. NUR verwenden, wenn KEIN Zielbahnhof genannt ist (z.B. „was fährt als Nächstes ab Köln?"). Wenn Start UND Ziel genannt sind — auch bei „wann fährt der Zug von X nach Y" oder „von X nach Y ab 16 Uhr" — NICHT dieses Tool nehmen, sondern planJourney (nur planJourney weiß, ob ein Zug ein bestimmtes Ziel/einen Zwischenhalt erreicht; die „Richtung" hier ist nur der Endbahnhof).',
    inputSchema: z.object({
      stationId: z.string().describe('Die id aus searchStations'),
      towards: z
        .string()
        .optional()
        .describe('Optionaler Zielort-Filter, z.B. "Hagen" — zeigt nur Züge in diese Richtung'),
      line: z
        .string()
        .optional()
        .describe(
          'Optionaler Linien-/Zugnummer-Filter, z.B. "ICE 627" oder "RE 96" — liefert deterministisch nur diesen Zug. Nutze das, um einen per Nummer genannten Zug zu finden (dann tripId für trackTrain nehmen).',
        ),
      when: z
        .string()
        .optional()
        .describe('Optionaler ISO-Zeitpunkt; ohne Angabe = jetzt'),
    }),
    execute: async ({ stationId, towards, line, when }) => getDepartures(stationId, { towards, line, when }),
  }),

  getArrivals: tool({
    description:
      'Liefert die Ankunftstafel eines Bahnhofs (nächste ~60 Minuten) mit Verspätungen und Herkunft.',
    inputSchema: z.object({
      stationId: z.string().describe('Die id aus searchStations'),
      from: z.string().optional().describe('Optionaler Herkunfts-Filter'),
      when: z.string().optional().describe('Optionaler ISO-Zeitpunkt; ohne Angabe = jetzt'),
    }),
    execute: async ({ stationId, from, when }) => getArrivals(stationId, { towards: from, when }),
  }),

  planJourney: tool({
    description:
      'Sucht Zugverbindungen von A nach B inkl. Umstiegen, Verspätungen, Warnungen, Sparpreis (priceFrom) und Ausstattung (amenities). DAS Standard-Tool für JEDE Anfrage mit Start UND Ziel — auch wenn sie wie eine Abfahrtsfrage klingt („wann fährt der Zug von X nach Y", „nächster Zug von X nach Y ab 16 Uhr"). Findet auch Direktverbindungen, bei denen das Ziel nur ein Zwischenhalt ist. Benötigt die Bahnhofs-IDs aus searchStations; departure/arrival als ISO-Zeitpunkt für konkrete Zeiten.',
    inputSchema: z.object({
      fromId: z.string().describe('id des Start-Bahnhofs'),
      toId: z.string().describe('id des Ziel-Bahnhofs'),
      departure: z.string().optional().describe('Gewünschte Abfahrtszeit als ISO-Zeitpunkt'),
      arrival: z.string().optional().describe('Gewünschte Ankunftszeit als ISO-Zeitpunkt'),
    }),
    execute: async ({ fromId, toId, departure, arrival }) =>
      planJourney(fromId, toId, { departure, arrival }),
  }),

  nearbyStations: tool({
    description:
      'Findet Bahnhöfe und Haltestellen im Umkreis eines Ortes oder einer Adresse. Für Fragen wie „Welche Bahnhöfe sind in der Nähe von <Ort/Adresse>?".',
    inputSchema: z.object({
      place: z.string().describe('Ort oder Adresse, z.B. "Kölner Dom" oder "Marienplatz München"'),
    }),
    execute: async ({ place }) => nearbyStations(place),
  }),

  trackTrain: tool({
    description:
      'Verfolgt einen konkreten Zug entlang seiner Route: alle Halte mit Ist-Zeiten, Verspätung pro Halt, Gleisen, Ausfällen und der Ausstattung (amenities: Bordrestaurant, Fahrradmitnahme, WLAN …). Nutzt die tripId aus getDepartures oder planJourney. Ideal für "Wo bleibt mein Zug?" und "Gibt es ein Bordrestaurant?".',
    inputSchema: z.object({
      tripId: z.string().describe('Die tripId eines Zuges aus getDepartures oder planJourney'),
    }),
    execute: async ({ tripId }) => trackTrain(tripId),
  }),

  stationFacilities: tool({
    description:
      'Ausstattung eines Bahnhofs (offizielle DB-Daten): öffentliche Toiletten, DB Lounge, WLAN, Parken, Schließfächer, stufenfreier Zugang, Reisezentrum usw. Für Fragen wie „Gibt es am Bahnhof X Toiletten / eine DB Lounge / Parkplätze?".',
    inputSchema: z.object({
      name: z.string().describe('Name des Bahnhofs, z.B. "Köln Hbf"'),
    }),
    execute: async ({ name }) => stationFacilities(name),
  }),

  facilityStatus: tool({
    description:
      'Live-Status der Aufzüge und Rolltreppen eines Bahnhofs (offizielle DB-FaSta-Daten): welche sind in Betrieb, welche außer Betrieb. Für Fragen wie „Funktioniert der Aufzug am Bahnhof X?".',
    inputSchema: z.object({
      name: z.string().describe('Name des Bahnhofs, z.B. "Hagen Hbf"'),
    }),
    execute: async ({ name }) => facilityStatus(name),
  }),
};

export type BahnTools = typeof bahnTools;
