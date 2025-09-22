import type { ChatMessage } from '../types';

type ChatSidebarProps = {
  messages: ChatMessage[];
};

function ChatSidebar({ messages }: ChatSidebarProps) {
  return (
    <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft md:w-1/3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Group chat</h2>
          <p className="text-sm text-slate-400">Live messages and guide updates.</p>
        </div>
      </div>
      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
              <span className={message.isGuide ? 'text-cyan-300' : undefined}>{message.sender}</span>
              <span>{message.time}</span>
            </div>
            <p className="mt-3 text-slate-200">{message.message}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default ChatSidebar;
