import {
  buildConversationList,
  normalizeChatEmail,
  type ChatConversation,
  type ChatMessageRecord
} from '../utils/chatThreads';
import { formatDisplayDateTime } from '../utils/dateFormat';

type ChatSidebarProps = {
  globalMessages: ChatMessageRecord[];
  privateMessages: ChatMessageRecord[];
  currentEmail?: string;
  selectedRecipient: string;
  onSelectRecipient: (recipient: string) => void;
  users?: { id?: string; name?: string; email?: string }[];
};

function ChatSidebar({
  globalMessages,
  privateMessages,
  currentEmail,
  selectedRecipient,
  onSelectRecipient,
  users = []
}: ChatSidebarProps) {
  const conversations: ChatConversation[] = currentEmail
    ? buildConversationList(privateMessages, currentEmail, users)
    : [];
  const lastGlobal = globalMessages[globalMessages.length - 1];

  return (
    <aside className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-100">Conversations</h2>
        <p className="text-sm text-slate-400">Global room and private threads.</p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onSelectRecipient('global')}
          className={`w-full rounded-2xl border p-4 text-left transition ${
            selectedRecipient === 'global'
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-slate-800 bg-slate-950/70 hover:border-cyan-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white">Global chat</span>
            <span className="text-xs text-slate-500">{globalMessages.length} msgs</span>
          </div>
          {lastGlobal && (
            <p className="mt-2 truncate text-sm text-slate-400">
              {lastGlobal.from}: {lastGlobal.content}
            </p>
          )}
        </button>

        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-500">
            No private conversations yet. Search for a user and send a message.
          </div>
        ) : (
          conversations.map((conversation) => {
            const isSelected = normalizeChatEmail(selectedRecipient) === conversation.email;
            const label = conversation.name || conversation.email;
            return (
              <button
                key={conversation.email}
                type="button"
                onClick={() => onSelectRecipient(conversation.email)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-slate-800 bg-slate-950/70 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-white">{label}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDisplayDateTime(conversation.lastTime)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-slate-400">{conversation.lastMessage}</p>
              </button>
            );
          })
        )}
      </div>

      {users.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-200">Online now</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {users.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => user.email && onSelectRecipient(user.email)}
                className="max-w-full truncate rounded-full bg-slate-800/50 px-3 py-1 text-sm text-slate-200 transition hover:bg-cyan-400/20 hover:text-cyan-100"
              >
                {user.name || user.email}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

export default ChatSidebar;
