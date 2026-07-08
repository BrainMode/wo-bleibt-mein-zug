// Input-Moderation über die Mistral Moderation API.
// Blockt Jailbreak-Versuche und klar schädliche Inhalte, BEVOR ein (teurerer)
// Chat-Completion-Call passiert. Fail-open: Wenn die Moderation-API selbst
// ausfällt, lassen wir die Anfrage durch (Demo-Verfügbarkeit > Perfektion) und
// loggen eine Warnung.

const MODERATION_MODEL = 'mistral-moderation-2603';
const MODERATION_URL = 'https://api.mistral.ai/v1/moderations';

// Kategorien, bei denen wir hart blocken. Bewusst NICHT dabei: pii, health,
// financial, law — die lösen bei harmlosen Reisefragen zu leicht Fehlalarme aus
// (z.B. „Zug zum Krankenhaus", „ich wohne in …").
const BLOCK_CATEGORIES = [
  'jailbreaking',
  'hate_and_discrimination',
  'violence_and_threats',
  'dangerous',
  'criminal',
  'selfharm',
  'sexual',
] as const;

// Zusätzlicher Score-Schwellwert, falls das boolean-Flag knapp danebenliegt.
const SCORE_THRESHOLD = 0.7;

export type ModerationResult = { blocked: boolean; reason?: string };

export async function moderateInput(text: string): Promise<ModerationResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return { blocked: false };

  try {
    const res = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODERATION_MODEL, input: [text] }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn('[guardrails] Moderation-API HTTP', res.status, '→ fail-open');
      return { blocked: false };
    }

    const data = (await res.json()) as {
      results?: Array<{
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }>;
    };
    const result = data.results?.[0];
    if (!result) return { blocked: false };

    for (const cat of BLOCK_CATEGORIES) {
      const flagged = result.categories?.[cat] === true;
      const score = result.category_scores?.[cat] ?? 0;
      if (flagged || score >= SCORE_THRESHOLD) {
        return { blocked: true, reason: cat };
      }
    }
    return { blocked: false };
  } catch (err) {
    console.warn('[guardrails] Moderation-Fehler → fail-open:', err instanceof Error ? err.message : err);
    return { blocked: false };
  }
}
