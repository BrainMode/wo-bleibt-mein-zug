import type { UIMessage } from 'ai';
import { ToolStatus } from './tool-status';

// Rendert eine einzelne Chat-Nachricht aus ihren typisierten Parts.
// AI-SDK-v7: Tool-Parts heißen `tool-<name>` und tragen einen state.
export function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`animate-in flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600/90 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm'
            : 'max-w-[90%] rounded-2xl rounded-bl-sm bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-emerald-50/95 ring-1 ring-white/5'
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
            return <ToolStatus key={i} toolName={toolName} state={state} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
