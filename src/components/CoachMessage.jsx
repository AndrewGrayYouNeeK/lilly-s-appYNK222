import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Zap, CheckCircle2, Loader2 } from 'lucide-react';

function ToolChip({ toolCall }) {
  const status = toolCall?.status || 'running';
  const running = status === 'running' || status === 'in_progress' || status === 'pending';
  const name = (toolCall?.name || 'tool').split('.').slice(-1)[0];
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] text-muted-foreground border border-border mr-1.5 mb-1">
      {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-success" />}
      <span className="font-medium">{name.replace(/_/g, ' ')}</span>
    </div>
  );
}

export default function CoachMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 shrink-0 rounded-full bg-primary flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        {message.tool_calls?.length > 0 && (
          <div className="mb-1">{message.tool_calls.map((t, i) => <ToolChip key={i} toolCall={t} />)}</div>
        )}
        {message.content && (
          <div className={`rounded-2xl px-4 py-2.5 inline-block text-left ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_p]:my-1">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}