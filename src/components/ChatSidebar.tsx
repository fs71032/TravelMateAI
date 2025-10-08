import type { ChatMessage } from '../types';

type ChatSidebarProps = {
  messages: Array<any>;
  users?: { id?: string; name?: string; email?: string }[];
};

function ChatSidebar({ messages, users }: ChatSidebarProps) {
  return (
    <aside className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-100">Group chat</h2>
        <p className="text-sm text-slate-400">Live messages and guide updates.</p>
      </div>
      {users && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Online</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {users.map((u) => (
              <span key={u.email} className="max-w-full truncate rounded-full bg-slate-800/50 px-3 py-1 text-sm text-slate-200">
                {u.name || u.email}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="max-h-[60vh] space-y-4 overflow-y-auto">
        {messages.map((message) => {
          const sender = message.sender || message.from || 'unknown';
          const text = message.message || message.content || '';
          const time = message.time ? new Date(message.time).toLocaleTimeString() : '';
          return (
            <div key={message.id} className="min-w-0 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className={`min-w-0 flex-1 truncate text-sm ${message.isGuide ? 'text-cyan-300' : 'text-slate-400'}`}>
                  {sender}
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{time}</span>
              </div>
              <p className="mt-3 break-words text-slate-200">{text}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default ChatSidebar;
