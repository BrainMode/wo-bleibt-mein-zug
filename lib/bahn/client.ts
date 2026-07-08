import tls from 'node:tls';
import { createClient } from 'db-vendo-client';
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

// ── Akamai-/TLS-Fingerprint-Umgehung ──────────────────────────────────────
// bahn.de sitzt hinter Akamai Bot-Protection, die Requests anhand des
// TLS-/JA3-Fingerprints blockt. Node's Standard-Cipher-Reihenfolge löst den
// Block aus (HTTP 403/452, `code: OPS_BLOCKED`). Ein Permutieren der ersten
// drei Cipher ändert den Fingerprint und lässt die Requests durch.
//
// Das muss VOR dem ersten HTTPS-Request laufen — deshalb auf Modulebene, und
// dieses Modul wird von actions.ts (und damit vor jedem Tool-Call) importiert.
// Gilt genauso auf Vercel, weil die Serverless Functions dieselbe Node-Runtime
// nutzen. Ohne diesen Fix liefert die App in Produktion nur OPS_BLOCKED-Fehler.
//
// WICHTIG: idempotent halten. tls.DEFAULT_CIPHERS ist ein prozessweiter Wert.
// Wird dieses Modul erneut ausgewertet (Next.js Hot-Reload, doppeltes Bundling),
// würde eine zweite Permutation die bereits permutierte Liste erneut umsortieren
// → wieder ein geblockter Fingerprint. Ein globales Flag verhindert das.
const tlsGlobal = globalThis as unknown as { __bahnTlsPatched?: boolean };
if (!tlsGlobal.__bahnTlsPatched) {
  const ciphers = tls.DEFAULT_CIPHERS.split(':');
  if (ciphers.length > 3) {
    tls.DEFAULT_CIPHERS = [ciphers[2], ciphers[1], ciphers[0], ...ciphers.slice(3)].join(':');
  }
  tlsGlobal.__bahnTlsPatched = true;
}

// Realistischer Browser-User-Agent (das dbnav-Profil erwartet einen).
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Ein Client-Singleton pro Serverless-Instanz.
type BahnClient = ReturnType<typeof createClient>;
const globalForBahn = globalThis as unknown as { __bahnClient?: BahnClient };

export const bahn: BahnClient =
  globalForBahn.__bahnClient ?? (globalForBahn.__bahnClient = createClient(dbnavProfile, USER_AGENT));
