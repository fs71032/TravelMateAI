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
  return null;
}

export default ChatPage;
