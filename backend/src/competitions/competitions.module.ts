import { Module } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { CompetitionsController } from './competitions.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [AnnouncementsModule],
  providers: [CompetitionsService],
  controllers: [CompetitionsController],
})
export class CompetitionsModule {}
