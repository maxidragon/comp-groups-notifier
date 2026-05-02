import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /public/competitions - list all competitions in DB (no auth needed)
  @Get('competitions')
  async getCompetitions() {
    return this.prisma.competition.findMany({
      select: {
        id: true,
        wcaId: true,
        name: true,
        countryIso2: true,
        currentGroupId: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  // GET /public/competitions/:id - get a single competition by DB id (no auth)
  @Get('competitions/:id')
  async getCompetition(@Param('id') id: string) {
    const comp = await this.prisma.competition.findUnique({
      where: { id },
      select: {
        id: true,
        wcaId: true,
        name: true,
        countryIso2: true,
        currentGroupId: true,
      },
    });
    if (!comp) throw new NotFoundException('Competition not found');
    return comp;
  }
}
