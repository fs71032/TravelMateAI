import ChatSidebar from '../components/ChatSidebar';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { getNotificationSocket } from '../services/socket';
import { Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { authFetch, ensureFreshAccessToken } from '../services/api';
import { searchAll } from '../services/searchService';
import { formatDisplayDateTime } from '../utils/dateFormat';
import {
  appendChatMessage,
  buildConversationList,
  filterThreadMessages,
  normalizeChatEmail,
  type ChatMessageRecord
} from '../utils/chatThreads';

function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [globalMessages, setGlobalMessages] = useState<ChatMessageRecord[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessageRecord[]>([]);
  const [online, setOnline] = useState<{ id?: string; name?: string; email?: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('global');
  const [text, setText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);
  const [socketError, setSocketError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentEmail = user?.user.email;

  const loadGlobalHistory = () => {
    authFetch('/api/chat/history?room=global')
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGlobalMessages(data);
        }
      })
      .catch(() => {});
  };

  const loadPrivateHistory = () => {
    if (!currentEmail) return;
    authFetch(`/api/chat/history?room=private&user=${encodeURIComponent(currentEmail)}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPrivateMessages(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const socket = getNotificationSocket();
    socketRef.current = socket;

    const identifyChatUser = async (retryOnFailure = false) => {
      if (!user?.user) return false;

      const accessToken = await ensureFreshAccessToken();
      if (!accessToken) {
        setSocketError('Session expired. Please sign in again.');
        return false;
      }

      socket.emit('identify', {
        email: user.user.email,
        name: user.user.name,
        accessToken
      });
      socket.emit('join', 'global');

      if (!retryOnFailure) {
        setSocketError('');
      }

      return true;
    };

    const handleConnect = () => {
      setSocketConnected(true);
      void identifyChatUser();
    };

    const handleDisconnect = () => setSocketConnected(false);

    const handleMessage = (msg: ChatMessageRecord) => {
      setSocketError('');
      if (msg.room === 'global') {
        setGlobalMessages((current) => appendChatMessage(current, msg));
        return;
      }
      setPrivateMessages((current) => appendChatMessage(current, msg));
    };

    const handlePresence = (list: any) => setOnline(list || []);
    const handleIdentifyError = (payload: { message?: string }) => {
      void (async () => {
        const recovered = await identifyChatUser();
        if (!recovered) {
          setSocketError(payload?.message || 'Could not identify chat session. Sign in again.');
        }
      })();
    };
    const handleMessageError = (payload: { message?: string }) => {
      setSocketError(payload?.message || 'Failed to send message.');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message', handleMessage);
    socket.on('presence', handlePresence);
    socket.on('identify:error', handleIdentifyError);
    socket.on('message:error', handleMessageError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message', handleMessage);
      socket.off('presence', handlePresence);
      socket.off('identify:error', handleIdentifyError);
      socket.off('message:error', handleMessageError);
    };
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recipient = params.get('user');
    if (recipient) {
      setSelectedRecipient(normalizeChatEmail(recipient));
    }
  }, [location.search]);

  useEffect(() => {
    if (!currentEmail) return;
    loadGlobalHistory();
    loadPrivateHistory();
  }, [currentEmail]);

  const conversations = useMemo(
    () => (currentEmail ? buildConversationList(privateMessages, currentEmail, online) : []),
    [privateMessages, currentEmail, online]
  );

  const displayMessages = useMemo(() => {
    if (selectedRecipient === 'global') {
      return globalMessages;
    }
    if (!currentEmail) return [];
    return filterThreadMessages(privateMessages, currentEmail, selectedRecipient);
  }, [selectedRecipient, globalMessages, privateMessages, currentEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, selectedRecipient]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current || !currentEmail) return;

    if (!socketRef.current.connected) {
      setSocketError('Chat is disconnected. Refresh the page or restart npm start.');
      return;
    }

    const accessToken = await ensureFreshAccessToken();
    if (!accessToken) {
      setSocketError('Session expired. Please sign in again.');
      return;
    }

    const room = selectedRecipient === 'global' ? 'global' : 'private';
    const optimisticMessage: ChatMessageRecord = {
      id: `pending-${Date.now()}`,
      from: currentEmail,
      to: room === 'private' ? normalizeChatEmail(selectedRecipient) : null,
      room,
      content: trimmed,
      time: new Date().toISOString()
    };

    if (room === 'global') {
      setGlobalMessages((current) => appendChatMessage(current, optimisticMessage));
    } else {
      setPrivateMessages((current) => appendChatMessage(current, optimisticMessage));
    }

    const payload: Record<string, string> = {
      from: currentEmail,
      content: trimmed,
      room,
      accessToken
    };

    if (room === 'private') {
      payload.to = normalizeChatEmail(selectedRecipient);
    }

    socketRef.current.emit('message', payload);
    setText('');
    setSocketError('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleDirectorySearch = async () => {
    const q = directoryQuery.trim();
    if (!q) {
      setDirectoryResults([]);
      return;
    }
    setSearchingDirectory(true);
    try {
      const results = await searchAll(q, 5, 0, false);
      setDirectoryResults(results.users.filter((entry) => normalizeChatEmail(entry.email) !== normalizeChatEmail(currentEmail)));
    } catch {
      setDirectoryResults([]);
    } finally {
      setSearchingDirectory(false);
    }
  };

  const startPrivateChat = (email: string) => {
    setSelectedRecipient(normalizeChatEmail(email));
    setDirectoryQuery('');
    setDirectoryResults([]);
  };

  const selectedName =
    selectedRecipient === 'global'
      ? 'Group'
      : online.find((entry) => normalizeChatEmail(entry.email) === normalizeChatEmail(selectedRecipient))?.name ||
        conversations.find((entry) => entry.email === normalizeChatEmail(selectedRecipient))?.name ||
        selectedRecipient;

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

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr]">
        <ChatSidebar
          globalMessages={globalMessages}
          privateMessages={privateMessages}
          currentEmail={currentEmail}
          selectedRecipient={selectedRecipient}
          onSelectRecipient={setSelectedRecipient}
          users={online.filter((entry) => normalizeChatEmail(entry.email) !== normalizeChatEmail(currentEmail))}
        />

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Conversation</h2>
              <p className="mt-2 text-slate-400">Select a thread on the left or start a new private chat.</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm ${socketConnected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}
            >
              {socketConnected ? `Connected · ${online.length} online` : 'Disconnected — refresh page'}
            </span>
          </div>

          {socketError && (
            <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
              {socketError}
            </div>
          )}

          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleDirectorySearch();
                  }
                }}
                placeholder="Find someone to message privately…"
                className="w-full max-w-xs rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleDirectorySearch}
                disabled={searchingDirectory}
                className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300 disabled:opacity-50"
              >
                {searchingDirectory ? 'Searching…' : 'Find'}
              </button>
            </div>
            {directoryResults.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {directoryResults.map((entry) => (
                  <button
                    type="button"
                    key={entry.email}
                    onClick={() => startPrivateChat(entry.email)}
                    className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300"
                  >
                    Message {entry.name || entry.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">
              {selectedRecipient === 'global' ? 'Global Chat' : `Private chat with ${selectedName}`}
            </h3>
            <p className="text-sm text-slate-400">
              {selectedRecipient === 'global'
                ? 'Everyone in the travel room can see this.'
                : 'Only you and this user can see these messages.'}
            </p>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {displayMessages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">
                No messages in this conversation yet. Send the first message below.
              </div>
            ) : (
              displayMessages.map((message) => {
                const isMine = normalizeChatEmail(message.from) === normalizeChatEmail(currentEmail);
                return (
                  <div
                    key={message.id}
                    className={`min-w-0 rounded-3xl border p-5 ${
                      isMine
                        ? 'ml-8 border-cyan-700/40 bg-cyan-500/10'
                        : 'mr-8 border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-cyan-300">{message.from}</span>
                      <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
                        {formatDisplayDateTime(message.time)}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-slate-200">{message.content}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <textarea
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[140px] resize-none rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder={`Message ${selectedRecipient === 'global' ? 'the group' : selectedName}...`}
            />
            <div className="flex items-center gap-3">
              <button onClick={sendMessage} className="btn btn-primary ml-auto">
                Send message
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ChatPage;
