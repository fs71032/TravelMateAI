import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/apiBase';

type SocketWindow = Window & { notificationSocket?: Socket };

let cachedSocketUrl: string | null = null;

function joinGlobalRoom(socket: Socket) {
  try {
    socket.emit('join', 'global');
  } catch {
    // ignore
  }
}

export function resetNotificationSocket() {
  const win = window as SocketWindow;
  if (win.notificationSocket) {
    win.notificationSocket.removeAllListeners();
    win.notificationSocket.disconnect();
    delete win.notificationSocket;
  }
  cachedSocketUrl = null;
}

export function getNotificationSocket(): Socket {
  const win = window as SocketWindow;
  const url = getSocketUrl();

  if (win.notificationSocket && cachedSocketUrl && cachedSocketUrl !== url) {
    resetNotificationSocket();
  }

  if (win.notificationSocket) {
    if (!win.notificationSocket.connected) {
      win.notificationSocket.connect();
    }
    return win.notificationSocket;
  }

  const socket = io(url, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => joinGlobalRoom(socket));
  cachedSocketUrl = url;
  win.notificationSocket = socket;
  return socket;
}

export function identifySocketUser(user: { email: string; name: string; accessToken?: string }) {
  const socket = getNotificationSocket();
  socket.emit('identify', user);
  joinGlobalRoom(socket);
}
