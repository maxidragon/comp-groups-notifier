import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompetitionsService {
  constructor(private prisma: PrismaService) {}

  // Fetch competitions manageable by the user from WCA API
  async getManageableFromWca(wcaAccessToken: string) {
    const { data } = await axios.get(
      'https://www.worldcubeassociation.org/api/v0/competitions?managed_by_me=true&per_page=100',
      {
        headers: { Authorization: `Bearer ${wcaAccessToken}` },
      },
    );
    return data;
  }

  // Get competitions the user has access to in our DB
  async getUserCompetitions(userId: string) {
    const accesses = await this.prisma.competitionAccess.findMany({
      where: { userId },
      include: {
        competition: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return accesses.map((a) => ({
      ...a.competition,
      role: a.role,
    }));
  }

  // Add a competition to user's managed list
  async addCompetition(
    userId: string,
    wcaAccessToken: string,
    wcaId: string,
    role: string,
  ) {
    // Verify user can manage this competition by fetching from WCA
    const manageable = await this.getManageableFromWca(wcaAccessToken);
    const wcaComp = manageable.find((c: any) => c.id === wcaId);
    if (!wcaComp) {
      throw new ForbiddenException(
        'You do not have delegate/organizer access to this competition on WCA',
      );
    }

    // Fetch WCIF for schedule data
    let schedule = null;
    let events = null;
    try {
      const { data: wcif } = await axios.get(
        `https://www.worldcubeassociation.org/api/v0/competitions/${wcaId}/wcif/public`,
      );
      schedule = wcif.schedule || null;
      events = wcif.events || null;
    } catch {
      // WCIF might not be published yet
    }

    // Upsert the competition
    const competition = await this.prisma.competition.upsert({
      where: { wcaId },
      create: {
        wcaId,
        name: wcaComp.name,
        countryIso2: wcaComp.country_iso2,
        schedule,
        events,
      },
      update: {
        name: wcaComp.name,
        countryIso2: wcaComp.country_iso2,
        schedule,
        events,
      },
    });

    // Add user access
    await this.prisma.competitionAccess.upsert({
      where: {
        competitionId_userId: {
          competitionId: competition.id,
          userId,
        },
      },
      create: {
        competitionId: competition.id,
        userId,
        role,
      },
      update: { role },
    });

    return competition;
  }

  // Remove a competition from user's list
  async removeCompetition(userId: string, competitionId: string) {
    const access = await this.prisma.competitionAccess.findFirst({
      where: { userId, competitionId },
    });
    if (!access) throw new NotFoundException('Competition access not found');

    await this.prisma.competitionAccess.delete({
      where: { id: access.id },
    });
    return { success: true };
  }

  // Get a single competition (user must have access)
  async getCompetition(userId: string, competitionId: string) {
    const access = await this.prisma.competitionAccess.findFirst({
      where: { userId, competitionId },
      include: { competition: true },
    });
    if (!access) throw new NotFoundException('Competition not found or no access');
    return { ...access.competition, role: access.role };
  }

  // Update the current active group for a competition
  async setCurrentGroup(
    userId: string,
    competitionId: string,
    groupId: string | null,
  ) {
    const access = await this.prisma.competitionAccess.findFirst({
      where: { userId, competitionId },
    });
    if (!access) throw new ForbiddenException('No access to this competition');

    return this.prisma.competition.update({
      where: { id: competitionId },
      data: { currentGroupId: groupId },
    });
  }

  // Refresh WCIF data from WCA for a competition (schedule + events + persons)
  async refreshWcif(userId: string, competitionId: string) {
    const access = await this.prisma.competitionAccess.findFirst({
      where: { userId, competitionId },
      include: { competition: true },
    });
    if (!access) throw new ForbiddenException('No access to this competition');

    const { wcaId } = access.competition;
    try {
      const { data: wcif } = await axios.get(
        `https://www.worldcubeassociation.org/api/v0/competitions/${wcaId}/wcif/public`,
      );
      return this.prisma.competition.update({
        where: { id: competitionId },
        data: {
          schedule: wcif.schedule || null,
          events: wcif.events || null,
          persons: wcif.persons || null,   // ← store persons with assignments
        },
      });
    } catch {
      throw new NotFoundException('Could not fetch WCIF data from WCA');
    }
  }

  /**
   * Resolve assigned person names from stored WCIF persons.
   * Call refreshWcif first so persons are up to date.
   *
   * WCIF assignment codes:
   *   judges      → "staff-judge"
   *   scramblers  → "staff-scrambler"
   *   runners     → "staff-runner"
   *   competitors → "competitor"
   */
  async getNamesForGroup(
    competitionId: string,
    activityCode: string,
    role: 'all' | 'judges' | 'competitors' | 'scramblers' | 'runners',
  ): Promise<string[]> {
    const codeMap: Record<string, string> = {
      all: 'competitor',
      competitors: 'competitor',
      judges: 'staff-judge',
      scramblers: 'staff-scrambler',
      runners: 'staff-runner',
    };
    const assignmentCode = codeMap[role];
    if (!assignmentCode) return [];

    // Load stored competition (persons are persisted at refresh time)
    const comp = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { schedule: true, persons: true },
    });
    if (!comp) return [];

    const persons: any[] = (comp.persons as any[]) ?? [];
    if (!persons.length) return [];

    // Find the numeric activity id for the given activity code
    const activityId = findActivityId(comp.schedule, activityCode);
    if (activityId === null) return [];

    return persons
      .filter((p) =>
        (p.assignments ?? []).some(
          (a: any) =>
            a.activityId === activityId &&
            a.assignmentCode === assignmentCode,
        ),
      )
      .map((p) => p.name as string);
  }
}

// ─── WCIF helpers ─────────────────────────────────────────────────────────────

/** Recursively search the schedule tree for an activity matching the code */
function findActivityId(schedule: any, activityCode: string): number | null {
  for (const venue of schedule?.venues ?? []) {
    for (const room of venue.rooms ?? []) {
      const result = searchActivities(room.activities ?? [], activityCode);
      if (result !== null) return result;
    }
  }
  return null;
}

function searchActivities(activities: any[], activityCode: string): number | null {
  for (const act of activities) {
    if (act.activityCode === activityCode) return act.id as number;
    const child = searchActivities(act.childActivities ?? [], activityCode);
    if (child !== null) return child;
  }
  return null;
}

