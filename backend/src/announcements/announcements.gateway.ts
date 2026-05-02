import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface AnnouncementPayload {
  type: 'all' | 'judges' | 'competitors' | 'scramblers' | 'runners';
  activityCode: string;
  activityName: string;
  competitionId: string;
  competitionName: string;
  timestamp: number;
  /** Names of assigned persons for the announced role (judges/scramblers/runners) */
  names?: string[];
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/announcements',
})
export class AnnouncementsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() competitionId: string,
  ) {
    client.join(`competition:${competitionId}`);
    client.emit('joined', { competitionId });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() competitionId: string,
  ) {
    client.leave(`competition:${competitionId}`);
  }

  broadcastAnnouncement(competitionId: string, payload: AnnouncementPayload) {
    this.server
      .to(`competition:${competitionId}`)
      .emit('announcement', payload);
  }

  /** Silent group update — no sound, just updates the displayed group on live clients */
  broadcastGroupUpdate(competitionId: string, activityCode: string | null) {
    this.server
      .to(`competition:${competitionId}`)
      .emit('group_updated', { activityCode });
  }
}
