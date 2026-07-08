# CLAUDE.md — Projektkontext für „Wo bleibt mein Zug?"

## Worum geht's
Open-Source-KI-Bahnauskunft als Content-/Marketing-Projekt. Anlass: Die Deutsche Bahn
hat im Juli 2026 ein 50-Mio-€-Programm für KI-Kundenkommunikation (Chatbot „Kiana")
vorgestellt. Dieses Projekt baut den Chatbot-Kern („Wo bleibt mein Zug?") mit offenen
APIs nach — als Beweis, dass der Chat-Layer ein Wochenendprojekt ist. Ziel: öffentliches
GitHub-Repo (`BrainMode/wo-bleibt-mein-zug`), Live-Demo auf Vercel, Content für
LinkedIn/YouTube/X. Personenmarke: Denny Weber / WDC GmbH (wdc-gmbh.ch).

**Ton der Kommunikation:** direkt, anti-hype, ergebnisorientiert, mit Augenzwinkern gegen
die Bahn — aber fair (die 50 Mio. stecken größtenteils in Hardware/Prozessen, nicht im
LLM; das offen so sagen).

## Architektur (Kurzfassung)
- **Ein Next.js-16-Repo** (App Router, TS, Tailwind v4). Kein Monorepo — Fork-/Deploy-Freundlichkeit.
- **Geteilte Kernlogik:** `lib/bahn/actions.ts` (5 pure Funktionen) wird SOWOHL vom Chat-Agent
  (`lib/tools.ts`) ALS AUCH vom MCP-Server (`lib/mcp-tools.ts`) genutzt. Nie duplizieren.
- **Datenquelle:** `db-vendo-client`, Profil `dbnav`, kein API-Key. Inoffiziell.
- **Modell:** `mistral-small-latest` (EU, Tool Calling). Umschaltbar via `MISTRAL_MODEL`.
- **Routen:** `/api/chat` (streamText + Guardrails + Ratelimit), `/api/[transport]` → `/api/mcp`.

## ⚠️ Kritische Fallstricke (hart erarbeitet)

1. **Akamai-/TLS-Fingerprint-Block (WICHTIGSTE Sache).** bahn.de sitzt hinter Akamai, das
   Requests anhand des TLS-/JA3-Fingerprints blockt. Node's Standard-Cipher-Reihenfolge löst
   `OPS_BLOCKED` (HTTP 403/452) aus — der Request-BODY und die IP sind egal, es ist rein der
   TLS-Handshake. **Fix:** die ersten drei Cipher in `tls.DEFAULT_CIPHERS` permutieren, VOR dem
   ersten HTTPS-Request. Sitzt in `lib/bahn/client.ts` auf Modulebene. **Gilt auch auf Vercel**
   (gleiche Node-Runtime). Ohne diesen Fix liefert die App in Prod nur Fehler. `curl` funktioniert
   übrigens immer (anderer TLS-Stack) — nur Node's undici/https ist betroffen.

2. **db-vendo-Feldnamen:** `delay` ist in **Sekunden** (nicht Minuten). `when` = Ist-Zeit,
   `plannedWhen` = Soll. Bei Legs/Trip heißt es `departureDelay`/`arrivalDelay`. `products` an
   Stationen ist ein **Objekt-Map** (`{regional:true,…}`), kein Array. `trip()` liefert
   `{trip, realtimeDataUpdatedAt}` — also `res.trip` auspacken. `dbnav` kennt **keinen**
   serverseitigen Richtungsfilter → `towards` client-seitig filtern.

3. **AI SDK v7 Syntax** (nicht v4!): `inputSchema` statt `parameters`; `stopWhen: stepCountIs(n)`
   statt `maxSteps`; `useChat` hat KEIN internes Input-State mehr (eigenes `useState` + `sendMessage`);
   Tool-Parts in der assemblierten Message heißen `tool-<name>` mit `state`
   (`input-streaming`/`input-available`/`output-available`). `convertToModelMessages` ist async → `await`.

4. **zod muss `^3.25` sein**, nicht v4 — `mcp-handler@1.1` pinnt `@modelcontextprotocol/sdk@1.26.0`
   exakt und braucht zod 3. AI SDK 7 akzeptiert zod 3.25. Bei Version-Bump prüfen.

5. **Guardrail-/Limit-Antworten** gehen als `createUIMessageStream` (statische Bubble, kein
   LLM-Call, keine Kosten) zurück — NICHT als JSON-Error, sonst crasht der useChat-Stream.

## Guardrails / Kostenschutz
- Reihenfolge in `/api/chat`: statische Validierung → Rate-Limit → Moderation → LLM.
- Moderation blockt: jailbreaking, hate, violence, dangerous, criminal, selfharm, sexual.
  Bewusst NICHT: pii/health/financial/law (Fehlalarme bei Reisefragen).
- Rate-Limit: Upstash (per-IP + globaler Tages-Cap) mit In-Memory-Fallback ohne Env.
- Harte LLM-Grenzen: `maxOutputTokens: 800`, `stepCountIs(6)`, `temperature: 0.3`.

## Verifikation
- `npm run smoke` → db-vendo direkt (Iserlohn/Hagen, echte Verspätung).
- `npm run dev` + Iserlohn/Hagen-Prompt → Tool-Loop mit echten Daten.
- MCP: `tools/list` + `tools/call searchStations` gegen `/api/mcp`.

## Offene Nice-to-haves (Phase 5, nicht MVP)
Timetables-API als lizenzsicherer Fallback · gerenderte Verbindungs-Karten in der UI ·
Redis-Caching (locations 24h, Boards 30s) · Ministral-3B-Scope-Klassifikator bei Missbrauch ·
eigenständiges stdio-MCP-npm-Package.
