'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Message } from './message';
import { ExampleChips } from './example-chips';

export function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput('');
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      {/* Header */}
      <header className="shrink-0 pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-50">
          🚆 Wo bleibt mein Zug?
        </h1>
        <p className="mt-1 text-sm text-emerald-200/50">
          Inoffizielle KI-Bahnauskunft — ein Wochenendprojekt. Keine Verbindung zur Deutschen Bahn AG.
        </p>
      </header>

      {/* Nachrichten */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {empty ? (
          <div className="pt-6">
            <p className="mx-auto max-w-lg text-center text-emerald-100/70">
              Frag mich in normalem Deutsch nach Abfahrten, Verspätungen, Gleisen oder
              Verbindungen. Ich schaue live in den Bahn-Fahrplan.
            </p>
            <ExampleChips onPick={submit} />
          </div>
        ) : (
          messages.map((m) => <Message key={m.id} message={m} />)
        )}

        {status === 'submitted' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] px-4 py-3 text-sm text-emerald-200/50 ring-1 ring-white/5">
              <span className="cursor-blink">Denke nach</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            Es ist ein Fehler aufgetreten. Bitte versuch es gleich noch einmal.
          </div>
        )}
      </div>

      {/* Eingabe */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="shrink-0 pb-5 pt-2"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-emerald-500/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={2}
            maxLength={1000}
            placeholder="z.B. Wann fährt der nächste Zug von Iserlohn nach Hagen?"
            className="max-h-40 min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-snug text-emerald-50 placeholder:text-emerald-200/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? '…' : 'Senden'}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-emerald-200/30">
          Angaben ohne Gewähr · Datenquelle inoffiziell ·{' '}
          <a
            href="https://github.com/BrainMode/wo-bleibt-mein-zug"
            className="underline hover:text-emerald-200/60"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Source
          </a>{' '}
          · ein Projekt von{' '}
          <a
            href="https://wdc-gmbh.ch"
            className="underline hover:text-emerald-200/60"
            target="_blank"
            rel="noopener noreferrer"
          >
            WDC
          </a>
        </p>
      </form>
    </div>
  );
}
