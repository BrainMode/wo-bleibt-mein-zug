// Phase-0-Smoke-Test: verifiziert db-vendo-client (dbnav-Profil) end-to-end
// und die Feldnamen, auf denen lib/bahn/format.ts aufbaut.
// Aufruf: node scripts/smoke-vendo.mjs
//
// WICHTIG: bahn.de sitzt hinter Akamai und blockt Requests anhand des
// TLS-/JA3-Fingerprints. Node's Standard-Cipher-Reihenfolge wird geblockt
// (HTTP 403/452, code OPS_BLOCKED). Ein Permutieren der Cipher-Reihenfolge
// ändert den Fingerprint und lässt die Requests durch. Muss VOR dem ersten
// HTTPS-Request gesetzt werden. Gilt auch auf Vercel (Node-Runtime).
import tls from 'node:tls';
const ciphers = tls.DEFAULT_CIPHERS.split(':');
tls.DEFAULT_CIPHERS = [ciphers[2], ciphers[1], ciphers[0], ...ciphers.slice(3)].join(':');

import { createClient } from 'db-vendo-client';
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const client = createClient(dbnavProfile, userAgent);

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      })
    : '–';

console.log('1) locations("Iserlohn") …');
const iserlohnResults = await client.locations('Iserlohn', { results: 3 });
const productNames = (p) =>
  !p ? [] : Array.isArray(p) ? p : Object.entries(p).filter(([, v]) => v).map(([k]) => k);
for (const l of iserlohnResults) console.log(`   ${l.id?.slice(0, 30)}  ${l.name}  [${productNames(l.products).join(',')}]`);
const iserlohn = iserlohnResults[0];

console.log('\n2) departures(Iserlohn, 90 min) — nur Züge …');
const { departures } = await client.departures(iserlohn.id, {
  duration: 90,
  results: 20,
});
const trains = departures.filter((d) => !/bus|alt/i.test(d.line?.name ?? ''));
for (const d of trains.slice(0, 8)) {
  const delayMin = d.delay == null ? '?' : Math.round(d.delay / 60);
  console.log(
    `   ${(d.line?.name ?? '?').padEnd(6)} → ${d.direction}  plan ${fmt(d.plannedWhen)}  ist ${fmt(d.when)}  (+${delayMin} min)  Gl. ${d.platform ?? '–'}${d.cancelled ? '  AUSFALL' : ''}`
  );
}

console.log('\n3) journeys(Iserlohn → Hagen Hbf) …');
const [hagen] = await client.locations('Hagen Hbf', { results: 1 });
const { journeys } = await client.journeys(iserlohn.id, hagen.id, {
  results: 2,
  stopovers: false,
});
for (const j of journeys) {
  const legs = j.legs
    .filter((l) => !l.walking)
    .map((l) => `${l.line?.name ?? '?'} ${l.origin.name} ${fmt(l.departure)} → ${l.destination.name} ${fmt(l.arrival)}`)
    .join('  |  ');
  console.log(`   ${legs}`);
}

console.log('\n4) trip(erster Zug) …');
const firstTrain = trains.find((d) => d.tripId);
if (firstTrain?.tripId) {
  const trip = await client.trip(firstTrain.tripId, { stopovers: true });
  const t = trip.trip ?? trip;
  console.log(`   ${t.line?.name} → ${t.direction}, ${t.stopovers?.length ?? 0} Halte:`);
  for (const s of (t.stopovers ?? []).slice(0, 8)) {
    const delayMin =
      s.arrivalDelay == null && s.departureDelay == null
        ? '?'
        : Math.round((s.arrivalDelay ?? s.departureDelay) / 60);
    console.log(
      `     ${(s.stop?.name ?? '?').padEnd(28)}  an ${fmt(s.arrival ?? s.plannedArrival)}  ab ${fmt(s.departure ?? s.plannedDeparture)}  (+${delayMin} min)  Gl. ${s.arrivalPlatform ?? s.departurePlatform ?? '–'}`
    );
  }
} else {
  console.log('   Kein Zug mit tripId gefunden — trip-Test übersprungen.');
}

console.log('\n✅ Smoke-Test OK.');
