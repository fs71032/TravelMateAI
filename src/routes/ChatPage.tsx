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

  return null;
}

export default ChatPage;
