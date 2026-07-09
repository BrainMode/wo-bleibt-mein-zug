# Wo bleibt mein Zug?

*Deutsch · [English below ↓](#where-is-my-train)*

Eine KI-Bahnauskunft, mit der man in normaler Sprache nach Zügen, Verspätungen, Verbindungen und Bahnhöfen fragt. Sie schaut live in den Fahrplan und beantwortet auch Sachen wie „mein Zug nach Hagen hat Verspätung, ich steh in Iserlohn – wo bleibt er?".

**Live: [wobleibtmeinzug.de](https://wobleibtmeinzug.de)**

Entstanden ist das an einem Wochenende, nachdem die Deutsche Bahn angekündigt hat, 50 Millionen Euro in KI-Kundenkommunikation zu stecken. Der Chatbot-Teil davon – „frag in deiner Sprache nach deinem Zug" – lässt sich mit offenen Daten und einem günstigen europäischen Modell (Mistral, EU-Hosting) für ein paar Cent am Tag nachbauen. Der Rest der 50 Mio. steckt in Hardware, Leitstellen-IT und 7.000 Anzeigetafeln – das ist ein anderes Thema. Aber der Chat? Der geht so.

## Was es kann

- Abfahrten und Ankünfte mit Echtzeit-Verspätung, Gleis und Gleiswechsel
- Verbindungssuche A→B inklusive Umstiegen, Sparpreis und Ausstattung pro Zug (Bordrestaurant, Fahrradmitnahme, WLAN …)
- Einen konkreten Zug entlang seiner Route verfolgen
- Bahnhofs-Ausstattung (Toiletten, DB Lounge, Schließfächer, stufenfreier Zugang) und Live-Aufzugstatus
- Antwortet in der Sprache, in der man fragt – nicht nur Deutsch
- Läuft auch als MCP-Server, z. B. für Claude Desktop

## Kurz zu den Daten – was offen ist und was nicht

Interessant ist, wie wenig die Bahn tatsächlich offen bereitstellt. Frei nutzbar sind:

- **Timetables API** (offiziell, kostenlos): Fahrplan plus Echtzeit-Änderungen, also Verspätungen, Ausfälle, Gleiswechsel.
- **FaSta** und **StaDa** (offiziell, kostenlos): Aufzug-/Rolltreppenstatus und Bahnhofs-Ausstattung.
- **[db-vendo-client](https://github.com/public-transport/db-vendo-client)** (inoffiziell): Verbindungssuche und Live-Zugverfolgung.

Nicht frei sind ausgerechnet die spannenden Echtzeit-Sachen: die kuratierten **Störungsmeldungen** (RIS::Disruptions), **Auslastung**, und die **Wagenreihung** („wo hält Wagen 7"). Die stecken hinter Zugangsprüfung, Verträgen oder Bot-Schutz. Wer 50 Millionen in bessere Fahrgastinformation investiert, könnte diese Daten auch einfach offen zugänglich machen.

## Lokal starten

Voraussetzung: Node.js ≥ 20.

```bash
git clone https://github.com/BrainMode/wo-bleibt-mein-zug.git
cd wo-bleibt-mein-zug
npm install
cp .env.example .env.local   # unter Windows: copy .env.example .env.local
```

Dann in `.env.local` einen Mistral-API-Key eintragen (kostenlos unter [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)):

```bash
MISTRAL_API_KEY=dein-key
```

Und los:

```bash
npm run dev
```

→ [localhost:3000](http://localhost:3000)

Alle weiteren Umgebungsvariablen sind in `.env.example` erklärt – alle optional. Ohne sie läuft die App mit einem In-Memory-Rate-Limit und ohne die Bahnhofs-Tools; für die reine Fahrplan-Auskunft reicht der Mistral-Key.

Wer testen will, ob die Bahn-Datenquelle gerade erreichbar ist, ohne die KI zu bemühen:

```bash
npm run smoke
```

## Auf Vercel deployen

1. Repo forken und auf [vercel.com/new](https://vercel.com/new) importieren.
2. `MISTRAL_API_KEY` als Environment-Variable setzen.
3. Für die öffentliche Nutzung empfiehlt sich eine **Upstash-Redis**-Datenbank (Vercel Marketplace, Free Tier) – dann greifen Caching und ein globaler Tages-Cap gegen zu hohe Kosten. Vercel setzt die Redis-Variablen automatisch. Ohne Redis läuft ein In-Memory-Fallback, der für eine öffentliche Demo aber nicht zuverlässig schützt.
4. Optional die kostenlosen DB-Keys (`DB_CLIENT_ID`, `DB_API_KEY`) vom [DB API Marketplace](https://developers.deutschebahn.com/db-api-marketplace) für die Bahnhofs-Ausstattungs- und Aufzug-Tools.

Die App braucht die Node-Runtime (nicht Edge) – das ist in den Routen bereits gesetzt.

## Als MCP-Server nutzen

Dieselben Bahn-Tools stehen unter `/api/mcp` als MCP-Server (Streamable HTTP) bereit. Für Claude Desktop in die `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wo-bleibt-mein-zug": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://DEINE-DOMAIN.vercel.app/api/mcp"]
    }
  }
}
```

Cursor, Claude Code und andere Streamable-HTTP-Clients können die URL direkt eintragen. Lokal testen mit `npx @modelcontextprotocol/inspector` gegen `http://localhost:3000/api/mcp`.

## Stack

Next.js (App Router), Vercel AI SDK mit `@ai-sdk/mistral`, `db-vendo-client`, `mcp-handler`, Tailwind, optional Upstash Redis. Guardrails über die Mistral Moderation API plus einen strikten System-Prompt; die Ausgabe wird zusätzlich geprüft. `npm run test:guardrails` fährt gegen einen laufenden Server ein paar Angriffs- und Normalfälle.

## Rechtliches

Dies ist kein offizielles Angebot der Deutsche Bahn AG, es besteht keine Verbindung und es wird keine Marke der DB verwendet. Die Farbgebung ist bewusst an das DB-Design angelehnt (Satire), aber nicht identisch. Die Fahrplandaten kommen teils über eine inoffizielle Schnittstelle und können jederzeit ausfallen – keine Gewähr für Richtigkeit oder Verfügbarkeit, nicht für sicherheitskritische Entscheidungen nutzen.

## Lizenz

MIT – siehe [LICENSE](./LICENSE).

---
---

# Where is my train?

*[Deutsch oben ↑](#wo-bleibt-mein-zug) · English*

An AI train assistant you can ask in plain language about trains, delays, connections and stations. It looks at the live timetable and handles questions like "my train to Hagen is delayed, I'm in Iserlohn – where is it?".

**Live: [wobleibtmeinzug.de](https://wobleibtmeinzug.de)**

It was built over a weekend, after Deutsche Bahn announced it would spend 50 million euros on AI customer communication. The chatbot part of that – "ask about your train in your own language" – can be rebuilt with open data and a cheap European model (Mistral, hosted in the EU) for a few cents a day. The rest of the 50 million goes into hardware, control-room IT and 7,000 platform displays – that's a different story. But the chat? This is roughly it.

## What it does

- Departures and arrivals with real-time delay, platform and platform changes
- Journey search A→B including transfers, cheapest fare and per-train amenities (bord restaurant, bike spaces, Wi-Fi …)
- Track a specific train along its route
- Station facilities (toilets, DB Lounge, lockers, step-free access) and live elevator status
- Answers in whatever language you ask in – not just German
- Also runs as an MCP server, e.g. for Claude Desktop

## A note on the data – what's open and what isn't

The interesting part is how little the railway actually makes available. Free to use:

- **Timetables API** (official, free): schedule plus real-time changes – delays, cancellations, platform changes.
- **FaSta** and **StaDa** (official, free): elevator/escalator status and station facilities.
- **[db-vendo-client](https://github.com/public-transport/db-vendo-client)** (unofficial): journey search and live train tracking.

What's *not* free is exactly the real-time stuff that matters: the curated **disruption messages** (RIS::Disruptions), **occupancy**, and the **coach sequence** ("where does coach 7 stop"). Those sit behind access reviews, contracts or bot protection. A company investing 50 million in better passenger information could also just make this data openly available.

## Run it locally

Requires Node.js ≥ 20.

```bash
git clone https://github.com/BrainMode/wo-bleibt-mein-zug.git
cd wo-bleibt-mein-zug
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

Then add a Mistral API key to `.env.local` (free at [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)):

```bash
MISTRAL_API_KEY=your-key
```

And run it:

```bash
npm run dev
```

→ [localhost:3000](http://localhost:3000)

All other environment variables are documented in `.env.example` and are optional. Without them the app runs with an in-memory rate limit and without the station tools; the Mistral key alone is enough for plain timetable answers.

To check whether the railway data source is currently reachable, without involving the AI:

```bash
npm run smoke
```

## Deploy on Vercel

1. Fork the repo and import it at [vercel.com/new](https://vercel.com/new).
2. Set `MISTRAL_API_KEY` as an environment variable.
3. For public use, add an **Upstash Redis** database (Vercel Marketplace, free tier) – that enables caching and a global daily cap against runaway cost. Vercel sets the Redis variables automatically. Without Redis an in-memory fallback runs, which does not reliably protect a public demo.
4. Optionally the free DB keys (`DB_CLIENT_ID`, `DB_API_KEY`) from the [DB API Marketplace](https://developers.deutschebahn.com/db-api-marketplace) for the station-facility and elevator tools.

The app needs the Node runtime (not Edge) – already set in the routes.

## Use it as an MCP server

The same train tools are exposed under `/api/mcp` as an MCP server (Streamable HTTP). For Claude Desktop, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wo-bleibt-mein-zug": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-DOMAIN.vercel.app/api/mcp"]
    }
  }
}
```

Cursor, Claude Code and other Streamable-HTTP clients can use the URL directly. Test locally with `npx @modelcontextprotocol/inspector` against `http://localhost:3000/api/mcp`.

## Stack

Next.js (App Router), the Vercel AI SDK with `@ai-sdk/mistral`, `db-vendo-client`, `mcp-handler`, Tailwind, optional Upstash Redis. Guardrails via the Mistral Moderation API plus a strict system prompt; the output is checked as well. `npm run test:guardrails` runs a few attack and normal cases against a running server.

## Legal

This is not an official Deutsche Bahn AG offering, there is no affiliation, and no DB trademark is used. The colour scheme deliberately echoes the DB design (satire) but is not identical. Part of the timetable data comes through an unofficial interface and can break at any time – no guarantee of accuracy or availability, do not use for safety-critical decisions.

## License

MIT – see [LICENSE](./LICENSE).
