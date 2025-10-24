import ChatSidebar from '../components/ChatSidebar';
import { chatMessages } from '../mock/data';

function ChatPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Live communication</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Travel group chat & guide coordination.</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900/70 px-5 py-3 text-sm text-slate-300">
          Real-time updates keep group logistics aligned.
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Conversation</h2>
              <p className="mt-2 text-slate-400">Chat with guides, travelers, and booking managers.</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Online</span>
          </div>
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div key={message.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                  <span className={message.isGuide ? 'text-cyan-300' : undefined}>{message.sender}</span>
                  <span>{message.time}</span>
                </div>
                <p className="mt-3 text-slate-200">{message.message}</p>
              </div>
            ))}
          </div>
          <form className="mt-8 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <textarea
              rows={4}
              className="min-h-[140px] resize-none rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Type a new message..."
            />
            <button className="ml-auto rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              Send message
            </button>
          </form>
        </div>

        <ChatSidebar messages={chatMessages} />
      </div>
    </section>
  );
}

export default ChatPage;
