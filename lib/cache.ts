// Leichtes Caching für Bahn-Antworten. Wichtigster Viral-Schutz: Fragen 500
// Leute dasselbe, geht es nur EINMAL an die (limitierte, inoffizielle) Bahn-API.
// Nutzt Upstash Redis (falls konfiguriert), sonst einen In-Memory-Fallback pro
// Serverless-Instanz. Fehlerergebnisse ({ error }) werden NIE gecacht.

import { Redis } from '@upstash/redis';

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
const redis = hasUpstash ? Redis.fromEnv() : null;

type MemEntry = { value: unknown; exp: number };
const mem = new Map<string, MemEntry>();
const MEM_MAX = 500;

function memGet(key: string): unknown {
  const e = mem.get(key);
  if (!e) return undefined;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e.value;
}

function memSet(key: string, value: unknown, ttlSec: number) {
  if (mem.size >= MEM_MAX) {
    const oldest = mem.keys().next().value;
    if (oldest) mem.delete(oldest);
  }
  mem.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}

function isError(v: unknown): boolean {
  return Boolean(v && typeof v === 'object' && 'error' in v);
}

/**
 * Liefert den gecachten Wert für `key` oder ruft `fn` auf und cacht dessen
 * Ergebnis für `ttlSec` Sekunden. Fehlerergebnisse werden nicht gecacht, damit
 * ein kurzer API-Ausfall nicht „festgehalten" wird.
 */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const k = `wbmz:cache:${key}`;

  try {
    if (redis) {
      const hit = await redis.get<T>(k);
      if (hit != null) return hit;
    } else {
      const hit = memGet(k);
      if (hit !== undefined) return hit as T;
    }
  } catch {
    // Cache-Lesefehler ignorieren — dann eben frisch laden.
  }

  const value = await fn();
  if (!isError(value)) {
    try {
      if (redis) await redis.set(k, value, { ex: ttlSec });
      else memSet(k, value, ttlSec);
    } catch {
      // Cache-Schreibfehler sind unkritisch.
    }
  }
  return value;
}
