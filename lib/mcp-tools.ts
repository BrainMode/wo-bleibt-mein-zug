import { z } from 'zod';
import {
  searchStations,
  getDepartures,
  getArrivals,
  planJourney,
  trackTrain,
  nearbyStations,
} from './bahn/actions';

type McpServer = {
  registerTool: (
    name: string,
    config: { title: string; description: string; inputSchema: Record<string, z.ZodTypeAny> },
    handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>,
  ) => void;
};

const asText = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

// Registriert die 5 Bahn-Tools am MCP-Server. Nutzt dieselben puren Actions
// wie der Chat-Agent (lib/bahn/actions.ts) — keine Logik-Duplikation.
export function registerBahnMcpTools(server: McpServer) {
  server.registerTool(
    'searchStations',
    {
      title: 'Bahnhofssuche',
      description:
        'Sucht deutsche Bahnhöfe/Haltestellen nach Name und liefert deren IDs. Immer zuerst aufrufen, um die stationId für die anderen Tools zu erhalten.',
      inputSchema: { query: z.string().describe('Name des Bahnhofs/Orts, z.B. "Iserlohn"') },
    },
    async ({ query }) => asText(await searchStations(query as string)),
  );

  server.registerTool(
    'getDepartures',
    {
      title: 'Abfahrtstafel',
      description:
        'Abfahrten eines Bahnhofs (nächste ~60 Min) mit Verspätung, Gleis und Ausfällen. Optional per towards nach Zielrichtung filtern.',
      inputSchema: {
        stationId: z.string().describe('id aus searchStations'),
        towards: z.string().optional().describe('Optionaler Zielort-Filter, z.B. "Hagen"'),
        when: z.string().optional().describe('Optionaler ISO-Zeitpunkt'),
      },
    },
    async ({ stationId, towards, when }) =>
      asText(await getDepartures(stationId as string, { towards: towards as string, when: when as string })),
  );

  server.registerTool(
    'getArrivals',
    {
      title: 'Ankunftstafel',
      description: 'Ankünfte eines Bahnhofs (nächste ~60 Min) mit Verspätung und Herkunft.',
      inputSchema: {
        stationId: z.string().describe('id aus searchStations'),
        from: z.string().optional().describe('Optionaler Herkunfts-Filter'),
        when: z.string().optional().describe('Optionaler ISO-Zeitpunkt'),
      },
    },
    async ({ stationId, from, when }) =>
      asText(await getArrivals(stationId as string, { towards: from as string, when: when as string })),
  );

  server.registerTool(
    'planJourney',
    {
      title: 'Verbindungssuche',
      description:
        'Zugverbindungen von A nach B inkl. Umstiegen, Verspätungen und Warnungen. Benötigt die Bahnhofs-IDs aus searchStations.',
      inputSchema: {
        fromId: z.string().describe('id des Start-Bahnhofs'),
        toId: z.string().describe('id des Ziel-Bahnhofs'),
        departure: z.string().optional().describe('Abfahrtszeit als ISO-Zeitpunkt'),
        arrival: z.string().optional().describe('Ankunftszeit als ISO-Zeitpunkt'),
      },
    },
    async ({ fromId, toId, departure, arrival }) =>
      asText(
        await planJourney(fromId as string, toId as string, {
          departure: departure as string,
          arrival: arrival as string,
        }),
      ),
  );

  server.registerTool(
    'nearbyStations',
    {
      title: 'Umkreissuche',
      description:
        'Findet Bahnhöfe/Haltestellen im Umkreis eines Ortes oder einer Adresse.',
      inputSchema: { place: z.string().describe('Ort oder Adresse, z.B. "Kölner Dom"') },
    },
    async ({ place }) => asText(await nearbyStations(place as string)),
  );

  server.registerTool(
    'trackTrain',
    {
      title: 'Zugverfolgung',
      description:
        'Verfolgt einen konkreten Zug entlang seiner Route: alle Halte mit Ist-Zeiten, Verspätung pro Halt, Gleisen und Ausfällen. tripId stammt aus getDepartures oder planJourney.',
      inputSchema: { tripId: z.string().describe('tripId aus getDepartures oder planJourney') },
    },
    async ({ tripId }) => asText(await trackTrain(tripId as string)),
  );
}
