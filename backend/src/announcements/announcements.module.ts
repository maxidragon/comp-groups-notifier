import { Module } from '@nestjs/common';
import { AnnouncementsGateway } from './announcements.gateway';

@Module({
  providers: [AnnouncementsGateway],
  exports: [AnnouncementsGateway],
})
export class AnnouncementsModule {}
