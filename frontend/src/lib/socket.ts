import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getAnnouncementsSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3000/announcements', {
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
