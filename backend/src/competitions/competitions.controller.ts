import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { CompetitionsService } from './competitions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnnouncementsGateway } from '../announcements/announcements.gateway';

const ANNOUNCE_TYPES = [
  'all',
  'judges',
  'competitors',
  'scramblers',
  'runners',
] as const;
type AnnounceType = (typeof ANNOUNCE_TYPES)[number];

@Controller('competitions')
@UseGuards(JwtAuthGuard)
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly announcementsGateway: AnnouncementsGateway,
  ) {}

  // GET /competitions/wca - list competitions manageable by logged-in user from WCA
  @Get('wca')
  async getWcaCompetitions(@Req() req: Request) {
    const user = req.user as any;
    return this.competitionsService.getManageableFromWca(user.wcaAccessToken);
  }

  // GET /competitions - get user's competitions from our DB
  @Get()
  async getMyCompetitions(@Req() req: Request) {
    const user = req.user as any;
    return this.competitionsService.getUserCompetitions(user.id);
  }

  // GET /competitions/:id - get single competition details
  @Get(':id')
  async getCompetition(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.competitionsService.getCompetition(user.id, id);
  }

  // POST /competitions - add competition to managed list
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addCompetition(
    @Req() req: Request,
    @Body() body: { wcaId: string; role?: string },
  ) {
    const user = req.user as any;
    return this.competitionsService.addCompetition(
      user.id,
      user.wcaAccessToken,
      body.wcaId,
      body.role || 'organizer',
    );
  }

  // DELETE /competitions/:id - remove competition from user's list
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeCompetition(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.competitionsService.removeCompetition(user.id, id);
  }

  // PATCH /competitions/:id/group - set current active group
  @Patch(':id/group')
  async setCurrentGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { groupId: string | null },
  ) {
    const user = req.user as any;
    await this.competitionsService.setCurrentGroup(user.id, id, body.groupId);
    this.announcementsGateway.broadcastGroupUpdate(id, body.groupId ?? null);
    return { success: true };
  }

  // POST /competitions/:id/refresh - refresh WCIF data from WCA
  @Post(':id/refresh')
  async refreshWcif(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.competitionsService.refreshWcif(user.id, id);
  }

  // POST /competitions/:id/announce - broadcast an announcement to all live clients
  @Post(':id/announce')
  @HttpCode(HttpStatus.OK)
  async announce(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { type: AnnounceType },
  ) {
    const user = req.user as any;

    if (!ANNOUNCE_TYPES.includes(body.type)) {
      throw new BadRequestException('Invalid announcement type');
    }

    const comp = await this.competitionsService.getCompetition(user.id, id);

    // For ALL role-specific announcements resolve assigned names from WCIF
    let names: string[] = [];
    const rolesWithNames: AnnounceType[] = [
      'all',
      'judges',
      'competitors',
      'scramblers',
      'runners',
    ];
    if (rolesWithNames.includes(body.type) && comp.currentGroupId) {
      names = await this.competitionsService.getNamesForGroup(
        id,
        comp.currentGroupId,
        body.type as
          | 'all'
          | 'judges'
          | 'competitors'
          | 'scramblers'
          | 'runners',
      );
    }

    this.announcementsGateway.broadcastAnnouncement(id, {
      type: body.type,
      activityCode: comp.currentGroupId ?? '',
      activityName: comp.currentGroupId ?? '',
      competitionId: id,
      competitionName: comp.name,
      timestamp: Date.now(),
      names,
    });

    return { success: true };
  }
}
