// UI-Übersetzungen. Die Chat-Antworten selbst sind über das Modell in 100+
// Sprachen möglich (siehe System-Prompt); dieses Dictionary lokalisiert nur die
// statischen Oberflächen-Texte für die wichtigsten Sprachen. Unbekannte
// Browsersprachen fallen auf Englisch zurück.

export type Lang = 'de' | 'en' | 'tr' | 'fr' | 'es' | 'it';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

type Strings = {
  tagline: string;
  disclaimer: string;
  langBadge: string;
  emptyHint: string;
  examplesLabel: string;
  examples: [string, string, string];
  placeholder: string;
  send: string;
  thinking: string;
  error: string;
  footerNote: string;
  oss: string;
  by: string;
  tools: Record<string, [running: string, done: string]>;
};

const TOOLS_DE: Strings['tools'] = {
  searchStations: ['Suche Bahnhof …', 'Bahnhof gefunden'],
  getDepartures: ['Lade Abfahrtstafel …', 'Abfahrten geladen'],
  getArrivals: ['Lade Ankunftstafel …', 'Ankünfte geladen'],
  planJourney: ['Suche Verbindungen …', 'Verbindungen gefunden'],
  trackTrain: ['Verfolge Zug …', 'Zug verfolgt'],
  nearbyStations: ['Suche in der Nähe …', 'Haltestellen gefunden'],
  stationFacilities: ['Prüfe Ausstattung …', 'Ausstattung geladen'],
  facilityStatus: ['Prüfe Aufzüge …', 'Aufzugstatus geladen'],
};

export const STRINGS: Record<Lang, Strings> = {
  de: {
    tagline: 'Deine KI-Bahnauskunft',
    disclaimer: 'Inoffiziell · keine Verbindung zur Deutschen Bahn AG',
    langBadge: '100+ Sprachen',
    emptyHint:
      'Frag mich in normaler Sprache nach Abfahrten, Verspätungen, Gleisen, Verbindungen oder der Bahnhofs-Ausstattung.',
    examplesLabel: 'Probier eine Frage',
    examples: [
      'Mein Zug nach Hagen hat Verspätung, ich stehe in Iserlohn — wo bleibt er?',
      'Nächste Verbindung von Berlin Hbf nach München',
      'Gibt es am Köln Hbf eine DB Lounge und funktioniert der Aufzug?',
    ],
    placeholder: 'z. B. Wann fährt der nächste Zug von Iserlohn nach Hagen?',
    send: 'Suchen',
    thinking: 'Einen Moment',
    error: 'Es ist ein Fehler aufgetreten. Bitte versuch es gleich noch einmal.',
    footerNote: 'Angaben ohne Gewähr · Datenquelle inoffiziell',
    oss: 'Open Source',
    by: 'ein Projekt von',
    tools: TOOLS_DE,
  },
  en: {
    tagline: 'Your AI train assistant',
    disclaimer: 'Unofficial · not affiliated with Deutsche Bahn AG',
    langBadge: '100+ languages',
    emptyHint:
      'Ask me in plain language about departures, delays, platforms, connections or station facilities.',
    examplesLabel: 'Try a question',
    examples: [
      'My train to Hagen is delayed, I’m in Iserlohn — where is it?',
      'Next connection from Berlin Hbf to Munich',
      'Does Köln Hbf have a DB Lounge and is the elevator working?',
    ],
    placeholder: 'e.g. When does the next train from Iserlohn to Hagen leave?',
    send: 'Search',
    thinking: 'One moment',
    error: 'Something went wrong. Please try again in a moment.',
    footerNote: 'No guarantee · unofficial data source',
    oss: 'Open Source',
    by: 'a project by',
    tools: {
      searchStations: ['Finding station …', 'Station found'],
      getDepartures: ['Loading departures …', 'Departures loaded'],
      getArrivals: ['Loading arrivals …', 'Arrivals loaded'],
      planJourney: ['Finding connections …', 'Connections found'],
      trackTrain: ['Tracking train …', 'Train tracked'],
      nearbyStations: ['Searching nearby …', 'Stops found'],
      stationFacilities: ['Checking facilities …', 'Facilities loaded'],
      facilityStatus: ['Checking elevators …', 'Elevator status loaded'],
    },
  },
  tr: {
    tagline: 'Yapay zekâ tren asistanın',
    disclaimer: 'Resmi değildir · Deutsche Bahn AG ile bağlantısı yoktur',
    langBadge: '100+ dil',
    emptyHint:
      'Kalkışlar, gecikmeler, peronlar, bağlantılar veya istasyon olanakları hakkında normal dille sor.',
    examplesLabel: 'Bir soru dene',
    examples: [
      'Hagen’e giden trenim gecikti, Iserlohn’dayım — tren nerede?',
      'Berlin Hbf’den Münih’e sonraki bağlantı',
      'Köln Hbf’de DB Lounge var mı ve asansör çalışıyor mu?',
    ],
    placeholder: 'örn. Iserlohn’dan Hagen’e sonraki tren ne zaman?',
    send: 'Ara',
    thinking: 'Bir dakika',
    error: 'Bir hata oluştu. Lütfen birazdan tekrar deneyin.',
    footerNote: 'Garanti verilmez · resmi olmayan veri kaynağı',
    oss: 'Açık kaynak',
    by: 'bir projesi:',
    tools: {
      searchStations: ['İstasyon aranıyor …', 'İstasyon bulundu'],
      getDepartures: ['Kalkışlar yükleniyor …', 'Kalkışlar yüklendi'],
      getArrivals: ['Varışlar yükleniyor …', 'Varışlar yüklendi'],
      planJourney: ['Bağlantılar aranıyor …', 'Bağlantılar bulundu'],
      trackTrain: ['Tren izleniyor …', 'Tren izlendi'],
      nearbyStations: ['Yakınlarda aranıyor …', 'Duraklar bulundu'],
      stationFacilities: ['Olanaklar kontrol ediliyor …', 'Olanaklar yüklendi'],
      facilityStatus: ['Asansörler kontrol ediliyor …', 'Asansör durumu yüklendi'],
    },
  },
  fr: {
    tagline: 'Ton assistant ferroviaire IA',
    disclaimer: 'Non officiel · sans lien avec la Deutsche Bahn AG',
    langBadge: '100+ langues',
    emptyHint:
      'Pose tes questions en langage naturel : départs, retards, voies, correspondances ou équipements de gare.',
    examplesLabel: 'Essaie une question',
    examples: [
      'Mon train pour Hagen a du retard, je suis à Iserlohn — où est-il ?',
      'Prochaine correspondance de Berlin Hbf à Munich',
      'Y a-t-il un DB Lounge à Köln Hbf et l’ascenseur fonctionne-t-il ?',
    ],
    placeholder: 'ex. À quelle heure part le prochain train d’Iserlohn à Hagen ?',
    send: 'Rechercher',
    thinking: 'Un instant',
    error: 'Une erreur est survenue. Réessaie dans un instant.',
    footerNote: 'Sans garantie · source de données non officielle',
    oss: 'Open source',
    by: 'un projet de',
    tools: {
      searchStations: ['Recherche de la gare …', 'Gare trouvée'],
      getDepartures: ['Chargement des départs …', 'Départs chargés'],
      getArrivals: ['Chargement des arrivées …', 'Arrivées chargées'],
      planJourney: ['Recherche des correspondances …', 'Correspondances trouvées'],
      trackTrain: ['Suivi du train …', 'Train suivi'],
      nearbyStations: ['Recherche à proximité …', 'Arrêts trouvés'],
      stationFacilities: ['Vérification des équipements …', 'Équipements chargés'],
      facilityStatus: ['Vérification des ascenseurs …', 'État des ascenseurs chargé'],
    },
  },
  es: {
    tagline: 'Tu asistente ferroviario con IA',
    disclaimer: 'No oficial · sin relación con Deutsche Bahn AG',
    langBadge: '100+ idiomas',
    emptyHint:
      'Pregúntame en lenguaje normal por salidas, retrasos, vías, conexiones o servicios de la estación.',
    examplesLabel: 'Prueba una pregunta',
    examples: [
      'Mi tren a Hagen lleva retraso, estoy en Iserlohn — ¿dónde está?',
      'Próxima conexión de Berlin Hbf a Múnich',
      '¿Hay un DB Lounge en Köln Hbf y funciona el ascensor?',
    ],
    placeholder: 'p. ej. ¿Cuándo sale el próximo tren de Iserlohn a Hagen?',
    send: 'Buscar',
    thinking: 'Un momento',
    error: 'Algo salió mal. Inténtalo de nuevo en un momento.',
    footerNote: 'Sin garantía · fuente de datos no oficial',
    oss: 'Open Source',
    by: 'un proyecto de',
    tools: {
      searchStations: ['Buscando estación …', 'Estación encontrada'],
      getDepartures: ['Cargando salidas …', 'Salidas cargadas'],
      getArrivals: ['Cargando llegadas …', 'Llegadas cargadas'],
      planJourney: ['Buscando conexiones …', 'Conexiones encontradas'],
      trackTrain: ['Siguiendo el tren …', 'Tren seguido'],
      nearbyStations: ['Buscando cerca …', 'Paradas encontradas'],
      stationFacilities: ['Comprobando servicios …', 'Servicios cargados'],
      facilityStatus: ['Comprobando ascensores …', 'Estado de ascensores cargado'],
    },
  },
  it: {
    tagline: 'Il tuo assistente ferroviario IA',
    disclaimer: 'Non ufficiale · nessun legame con Deutsche Bahn AG',
    langBadge: '100+ lingue',
    emptyHint:
      'Chiedimi in linguaggio naturale di partenze, ritardi, binari, coincidenze o servizi della stazione.',
    examplesLabel: 'Prova una domanda',
    examples: [
      'Il mio treno per Hagen è in ritardo, sono a Iserlohn — dov’è?',
      'Prossima coincidenza da Berlin Hbf a Monaco',
      'C’è una DB Lounge a Köln Hbf e l’ascensore funziona?',
    ],
    placeholder: 'es. Quando parte il prossimo treno da Iserlohn a Hagen?',
    send: 'Cerca',
    thinking: 'Un momento',
    error: 'Si è verificato un errore. Riprova tra poco.',
    footerNote: 'Senza garanzia · fonte dati non ufficiale',
    oss: 'Open Source',
    by: 'un progetto di',
    tools: {
      searchStations: ['Ricerca stazione …', 'Stazione trovata'],
      getDepartures: ['Carico partenze …', 'Partenze caricate'],
      getArrivals: ['Carico arrivi …', 'Arrivi caricati'],
      planJourney: ['Ricerca coincidenze …', 'Coincidenze trovate'],
      trackTrain: ['Traccio il treno …', 'Treno tracciato'],
      nearbyStations: ['Ricerca nelle vicinanze …', 'Fermate trovate'],
      stationFacilities: ['Verifico i servizi …', 'Servizi caricati'],
      facilityStatus: ['Verifico gli ascensori …', 'Stato ascensori caricato'],
    },
  },
};

export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'de';
  const codes = [navigator.language, ...(navigator.languages ?? [])];
  for (const c of codes) {
    const short = c.slice(0, 2).toLowerCase() as Lang;
    if (short in STRINGS) return short;
  }
  return 'en';
}
