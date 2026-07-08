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
      'Liefert die Abfahrtstafel eines Bahnhofs (nächste ~60 Minuten) mit Verspätungen, Gleisen und Ausfällen. Optional nach Richtung filtern.',
    inputSchema: z.object({
      stationId: z.string().describe('Die id aus searchStations'),
      towards: z
        .string()
        .optional()
        .describe('Optionaler Zielort-Filter, z.B. "Hagen" — zeigt nur Züge in diese Richtung'),
      when: z
        .string()
        .optional()
        .describe('Optionaler ISO-Zeitpunkt; ohne Angabe = jetzt'),
    }),
    execute: async ({ stationId, towards, when }) => getDepartures(stationId, { towards, when }),
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
      'Sucht Zugverbindungen von A nach B inklusive Umstiegen, Verspätungen, Warnungen, Sparpreis (priceFrom, „ab X EUR") und Ausstattung pro Zug (amenities: Bordrestaurant, Fahrradmitnahme, WLAN …). Benötigt die Bahnhofs-IDs aus searchStations. Für eine bestimmte Reisezeit departure/arrival als ISO-Zeitpunkt setzen.',
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
};

export type BahnTools = typeof bahnTools;
