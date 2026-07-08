// Minimal-Deklaration — db-vendo-client liefert keine eigenen Typen.
// Die konkreten Rückgabe-Shapes werden in lib/bahn/format.ts + actions.ts
// lokal typisiert; hier reicht ein loses Interface, um `any`-Fehler zu vermeiden.
declare module 'db-vendo-client' {
  export interface BahnClientOptions {
    results?: number;
    stops?: boolean;
    addresses?: boolean;
    poi?: boolean;
    duration?: number;
    when?: Date;
    departure?: Date;
    arrival?: Date;
    stopovers?: boolean;
    [key: string]: unknown;
  }
  export interface Client {
    locations(query: string, opts?: BahnClientOptions): Promise<unknown[]>;
    departures(id: string, opts?: BahnClientOptions): Promise<{ departures?: unknown[] }>;
    arrivals(id: string, opts?: BahnClientOptions): Promise<{ arrivals?: unknown[] }>;
    journeys(
      from: string,
      to: string,
      opts?: BahnClientOptions,
    ): Promise<{ journeys?: unknown[] }>;
    trip(id: string, opts?: BahnClientOptions): Promise<unknown>;
  }
  export function createClient(profile: unknown, userAgent: string): Client;
}

declare module 'db-vendo-client/p/dbnav/index.js' {
  export const profile: unknown;
}
