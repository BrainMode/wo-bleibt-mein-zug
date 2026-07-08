import { mistral } from '@ai-sdk/mistral';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { bahnTools } from '@/lib/tools';
import { systemPrompt } from '@/lib/prompts';

// db-vendo-client braucht die Node-Runtime (nutzt node:tls für den Akamai-Fix).
export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.MISTRAL_MODEL ?? 'mistral-small-latest';

export async function POST(req: Request) {
  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error('messages fehlt');
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültige Anfrage.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = streamText({
    model: mistral(MODEL),
    system: systemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: bahnTools,
    stopWhen: stepCountIs(6),
    temperature: 0.3,
    maxOutputTokens: 800,
  });

  return result.toUIMessageStreamResponse();
}
