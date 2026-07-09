import type { UIMessage } from 'ai';
import type { Lang } from '@/lib/i18n';
import { ToolStatus } from './tool-status';

// Rendert eine Chat-Nachricht aus ihren typisierten Parts (DB-Look).
export function Message({ message, lang }: { message: UIMessage; lang: Lang }) {
  const isUser = message.role === 'user';

  return (
    <div className={`animate-in flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-lg rounded-br-sm bg-[var(--wbmz-red)] px-4 py-2.5 text-[15px] leading-relaxed text-white'
            : 'max-w-[92%] rounded-lg rounded-bl-sm border border-[var(--border)] bg-white px-4 py-3 text-[15px] leading-relaxed text-[var(--ink)]'
        }
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <p key={i} className="whitespace-pre-wrap [&:not(:first-child)]:mt-2">
                {part.text}
              </p>
            );
          }
          if (part.type.startsWith('tool-')) {
            const toolName = part.type.slice('tool-'.length);
            const state = (part as { state?: string }).state ?? '';
            return <ToolStatus key={i} toolName={toolName} state={state} lang={lang} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
