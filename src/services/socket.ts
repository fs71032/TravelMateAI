import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/apiBase';

type SocketWindow = Window & { notificationSocket?: Socket };

function joinGlobalRoom(socket: Socket) {
  try {
    socket.emit('join', 'global');
  } catch {
    // ignore
  }
}

export function getNotificationSocket(): Socket {
  const win = window as SocketWindow;

  if (win.notificationSocket) {
    if (!win.notificationSocket.connected) {
      win.notificationSocket.connect();
    }
    return win.notificationSocket;
  }

  const socket = io(getSocketUrl(), {
    autoConnect: true,
    reconnection: true
  });

  socket.on('connect', () => joinGlobalRoom(socket));
  win.notificationSocket = socket;
  return socket;
}

export function identifySocketUser(user: { email: string; name: string; accessToken?: string }) {
  const socket = getNotificationSocket();
  socket.emit('identify', user);
  joinGlobalRoom(socket);
}
