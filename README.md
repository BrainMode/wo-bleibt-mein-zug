# 🚆 Wo bleibt mein Zug?

**Eine KI-Bahnauskunft in natürlicher Sprache — als Open-Source-Wochenendprojekt.**

Frag in normalem Deutsch nach Abfahrten, Verspätungen, Gleisen und Verbindungen. Die KI schaut live in den Fahrplan und verfolgt einzelne Züge entlang ihrer Route.

> „Mein Zug nach Hagen hat Verspätung, ich stehe in Iserlohn — wo bleibt er?"

…und die KI sucht den Bahnhof, ruft die Abfahrtstafel ab, findet den passenden Zug und sagt dir, wo er gerade steht und wie viel Verspätung er hat.

**Live-Demo:** <https://wo-bleibt-mein-zug.vercel.app>

---

## Warum gibt es das?

Im Juli 2026 hat die Deutsche Bahn ein **50-Millionen-Euro-Programm** für bessere KI-Kundenkommunikation vorgestellt (Chatbot „Kiana", Leitstellen-IT, neue App, 7.000 Anzeigetafeln). Der reine **Chatbot-Teil** davon — „frag in natürlicher Sprache nach deinem Zug" — lässt sich mit offenen APIs an einem Wochenende bauen. Genau das ist dieses Projekt: ein Denkanstoß, kein Ersatz.

Fairerweise: Die 50 Mio. stecken größtenteils in Hardware, Datenpipelines und Prozessen — nicht im Sprachmodell. Aber der Chat-Layer? Der geht so. Und zwar mit einem **europäischen Modell** (Mistral, EU-Datenhaltung) für ein paar Cent pro Tag.

Gebaut von [Denny Weber / WDC GmbH](https://wdc-gmbh.ch) — AI-first Consulting aus der Schweiz.

---

## ⚠️ Disclaimer

- **Kein offizielles Angebot der Deutsche Bahn AG.** Keine Affiliation, keine Markennutzung, kein DB-Logo.
- **Die Datenquelle ist inoffiziell.** Dieses Projekt nutzt [`db-vendo-client`](https://github.com/public-transport/db-vendo-client), eine Community-Library, die die (nicht öffentlich dokumentierten) Endpunkte von bahn.de / DB Navigator nachbildet. Sie kann jederzeit ohne Vorwarnung brechen.
- **Keine Gewähr** für Richtigkeit oder Verfügbarkeit der Fahrplandaten. Nicht für sicherheitskritische Entscheidungen nutzen. Angaben immer ohne Gewähr.

---

## 🏗️ Architektur

```
Browser (Chat-UI)
   │  Vercel AI SDK · useChat (Streaming)
   ▼
/api/chat  ──►  Guardrails (Mistral Moderation) ──► Rate-Limiting (Upstash)
   │                                                       │
   ▼                                                       │
Mistral Small 4  ◄── Tool-Loop ──►  5 Bahn-Tools ──►  db-vendo-client ──► bahn.de
   (EU, Tool Calling)                (searchStations, getDepartures,
                                      getArrivals, planJourney, trackTrain)

/api/mcp   ──►  dieselben 5 Tools als MCP-Server (Streamable HTTP)
                für Claude Desktop, Cursor, Claude Code …
```

Der Clou: Chat-Agent **und** MCP-Server nutzen dieselben puren Funktionen in `lib/bahn/actions.ts` — keine Logik-Duplikation.

**Stack:** Next.js 16 (App Router) · Vercel AI SDK v7 · `@ai-sdk/mistral` · `db-vendo-client` · `mcp-handler` · Tailwind v4 · Upstash Redis (optional).

---

## 🚀 Lokal starten

Voraussetzung: Node.js ≥ 20.

```bash
git clone https://github.com/BrainMode/wo-bleibt-mein-zug.git
cd wo-bleibt-mein-zug
npm install
```

Umgebungsdatei anlegen und den Mistral-Key eintragen:

```bash
# PowerShell:
copy .env.example .env.local
# Git Bash / macOS / Linux:
cp .env.example .env.local
```

Einen (kostenlosen) Mistral-Key auf <https://console.mistral.ai/api-keys> erzeugen und in `.env.local` bei `MISTRAL_API_KEY` eintragen. Dann:

```bash
npm run dev
```

→ <http://localhost:3000>

**Optional:** `npm run smoke` prüft die Bahn-Datenquelle direkt (ohne KI), falls du wissen willst, ob die inoffizielle API gerade erreichbar ist.

---

## ▲ Auf Vercel deployen

1. Repo forken.
2. Auf <https://vercel.com/new> importieren.
3. Environment-Variable `MISTRAL_API_KEY` setzen.
4. **Empfohlen (Kostenschutz):** Im Vercel-Projekt unter _Storage → Marketplace_ eine **Upstash Redis**-Datenbank (Free Tier) anlegen. Vercel setzt `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN` automatisch. Ohne Redis läuft ein In-Memory-Fallback, der eine öffentliche Demo **nicht** zuverlässig schützt.
5. Deploy.

> Hinweis: `db-vendo-client` läuft auf der Node-Runtime (der TLS-Fix in `lib/bahn/client.ts` braucht `node:tls`). Die Routen sind bereits mit `runtime = 'nodejs'` markiert — nichts weiter zu tun.

---

## 🔌 Als MCP-Server nutzen

Die 5 Bahn-Tools stehen auch als MCP-Server bereit (Streamable HTTP unter `/api/mcp`). Damit kann z.B. **Claude Desktop** live Züge abfragen.

**Claude Desktop** (`claude_desktop_config.json`):

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

**Cursor / Claude Code** und andere Streamable-HTTP-Clients können die URL direkt eintragen:

```
https://DEINE-DOMAIN.vercel.app/api/mcp
```

Lokal testen mit dem offiziellen Inspector:

```bash
npx @modelcontextprotocol/inspector
# dann http://localhost:3000/api/mcp verbinden
```

**Verfügbare Tools:** `searchStations`, `getDepartures`, `getArrivals`, `planJourney`, `trackTrain`.

Anders als bestehende DB-MCP-Server (die nur die offizielle Timetables-API mit Soll-Fahrplan per Bahnhofsnummer abbilden) kann dieser Server **Verbindungssuche A→B** und **Live-Zugverfolgung** entlang der kompletten Route.

---

## 💶 Kosten & Limits

- **Modell:** `mistral-small-latest` (Mistral Small 4), EU-Datenhaltung, Tool Calling. ~0,1–0,2 Cent pro Chat-Turn.
- **Moderation:** `mistral-moderation-2603` (~0,10 $ / 1 Mio. Tokens) blockt Jailbreaks & schädliche Inhalte vor jedem LLM-Call. Fällt die Moderation aus, läuft die Anfrage durch (fail-open) — dokumentierte Design-Entscheidung zugunsten der Verfügbarkeit.
- **Rate-Limiting:** pro IP 10 Nachrichten / 5 Min + 40 / Tag, plus globaler Tages-Cap (`DAILY_MESSAGE_CAP`, Default 1500).
- **Scope:** Der System-Prompt begrenzt die KI strikt auf Bahn-/Reisethemen.

Alles konfigurierbar über `.env` — siehe `.env.example`.

---

## 📄 Lizenz

Code: **MIT** (siehe [LICENSE](./LICENSE)).
Fahrplandaten stammen über eine inoffizielle Schnittstelle von der Deutschen Bahn und unterliegen deren Bedingungen.

---

_Ein Augenzwinkern-Projekt von [wdc-gmbh.ch](https://wdc-gmbh.ch). Wenn dir das gefällt: Stern dalassen, forken, weiterbauen._
