import tls from 'node:tls';
import { createClient } from 'db-vendo-client';
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

// ── Akamai-/TLS-Fingerprint-Umgehung ──────────────────────────────────────
// bahn.de sitzt hinter Akamai Bot-Protection, die Requests anhand des
// TLS-/JA3-Fingerprints blockt. Node's Standard-Cipher-Reihenfolge löst
// `OPS_BLOCKED` (HTTP 403/452) aus. Eine geänderte Cipher-Reihenfolge ändert
// den Fingerprint. Zusätzlich beobachtet: Aus geteilten Datacenter-IPs (Vercel)
// wird der schwerere journeys-Endpunkt unter Last pro Fingerprint geblockt.
// Deshalb halten wir MEHRERE Cipher-Varianten vor und rotieren bei einem Block
// auf die nächste (siehe rotateClient) — das präsentiert uns als anderer Client.
//
// tls.DEFAULT_CIPHERS ist prozessweit; wir merken uns die Originalliste einmal.
const globalTls = globalThis as unknown as { __bahnCiphers?: string[] };
const cipherList = (globalTls.__bahnCiphers ??= tls.DEFAULT_CIPHERS.split(':'));

// Erzeugt eine Cipher-Variante, indem Cipher #i an den Anfang gezogen wird.
// i=0 ist die Originalreihenfolge (geblockt) — deshalb starten wir bei 1.
function applyCipherVariant(i: number) {
  if (cipherList.length <= 3) return;
  const k = 1 + (i % (cipherList.length - 1));
  tls.DEFAULT_CIPHERS = [cipherList[k], ...cipherList.slice(0, k), ...cipherList.slice(k + 1)].join(':');
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

type BahnClient = ReturnType<typeof createClient>;
const globalForBahn = globalThis as unknown as { __bahnClient?: BahnClient; __bahnVariant?: number };

if (globalForBahn.__bahnVariant == null) {
  globalForBahn.__bahnVariant = 1;
  applyCipherVariant(1);
}

export function getClient(): BahnClient {
  return (globalForBahn.__bahnClient ??= createClient(dbnavProfile, USER_AGENT));
}

/** Wechselt auf die nächste Cipher-Variante (anderer TLS-Fingerprint) und
 *  erzeugt einen frischen Client. Wird bei OPS_BLOCKED für einen Retry genutzt. */
export function rotateClient(): BahnClient {
  globalForBahn.__bahnVariant = (globalForBahn.__bahnVariant ?? 1) + 1;
  applyCipherVariant(globalForBahn.__bahnVariant);
  return (globalForBahn.__bahnClient = createClient(dbnavProfile, USER_AGENT));
}
