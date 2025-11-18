import ChatSidebar from '../components/ChatSidebar';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { getNotificationSocket } from '../services/socket';
import { Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { authFetch } from '../services/api';
import { searchAll } from '../services/searchService';
import { formatDisplayDateTime } from '../utils/dateFormat';

type Message = { id: string; from: string; to?: string | null; room: string; content: string; time: string };

function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState<{ id?: string; name?: string; email?: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('global');
  const [text, setText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);
  const socketRef = useRef<Socket | null>(null);
 
  useEffect(() => {
    const socket = getNotificationSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setSocketConnected(true);
      if (user?.user) {
        socket.emit('identify', {
          email: user.user.email,
          name: user.user.name,
          accessToken: user.accessToken
        });
        socket.emit('join', 'global');
      }
    };

    const handleDisconnect = () => setSocketConnected(false);
    const handleMessage = (msg: Message) => {
      setMessages((s) => [...s, msg]);
      if (msg.room === 'global') {
        setGlobalMessages((s) => [...s, msg]);
      }
    };
    const handlePresence = (list: any) => setOnline(list || []);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message', handleMessage);
    socket.on('presence', handlePresence);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message', handleMessage);
      socket.off('presence', handlePresence);
    };
  }, [user]);
 
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recipient = params.get('user');
    if (recipient) {
      setSelectedRecipient(recipient);
    }
  }, [location.search]);

  useEffect(() => {
    const email = user?.user.email;
    if (!email) return;

    const query = selectedRecipient === 'global'
      ? 'room=global'
      : `room=private&user=${encodeURIComponent(email)}`;
    authFetch(`/api/chat/history?${query}`)
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch(() => {});
  }, [selectedRecipient, user]);

  useEffect(() => {
    const email = user?.user.email;
    if (!email) return;

    authFetch('/api/chat/history?room=global')
      .then((r) => r.json())
      .then((data) => setGlobalMessages(data))
      .catch(() => {});
  }, [user]);
 
  const sendMessage = () => {
    if (!text.trim() || !socketRef.current || !user?.user.email) return;
 
    const payload: any = {
      from: user.user.email,
      content: text.trim(),
      room: selectedRecipient === 'global' ? 'global' : 'private',
      accessToken: user.accessToken
    };
 
    if (selectedRecipient !== 'global') {
      payload.to = selectedRecipient;
    }
 
    socketRef.current.emit('message', payload);
    setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      setDirectoryResults(results.users.filter((u: any) => u.email !== user?.user.email));
    } catch {
      setDirectoryResults([]);
    } finally {
      setSearchingDirectory(false);
    }
  };

  const startPrivateChat = (email: string) => {
    setSelectedRecipient(email);