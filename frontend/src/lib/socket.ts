import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// In production everything is served from the same origin through Nginx.
// Nginx proxies /api → backend, stripping the prefix, so socket.io lives at
// /api/socket.io on the public side.
// In dev, Vite proxies /api, but socket.io uses a separate proxy entry below.
const IS_PROD = import.meta.env.PROD;
const SOCKET_URL  = IS_PROD ? window.location.origin : 'http://localhost:3000';
const SOCKET_PATH = IS_PROD ? '/api/socket.io' : '/socket.io';

export function getAnnouncementsSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/announcements`, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectAnnouncementsSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
