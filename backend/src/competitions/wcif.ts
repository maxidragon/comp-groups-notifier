import axios from 'axios';

// WCIF v2 (https://github.com/thewca/wcif/blob/latest/specification.md).
// Only the fields this app reads are typed; everything else is stored as-is.
// The major version is pinned in the URL: the unversioned endpoint is v1
// (deprecated) and `latest` will move to v3.
const WCIF_MAJOR_VERSION = 2;

export function publicWcifUrl(wcaId: string): string {
  return `https://www.worldcubeassociation.org/api/v0/competitions/${encodeURIComponent(wcaId)}/wcif/version/${WCIF_MAJOR_VERSION}`;
}

export interface WcifAssignment {
  activityId: number;
  assignmentCode: string;
  stationNumber: number | null;
}

export interface WcifPerson {
  registrantId: number;
  name: string;
  assignments?: WcifAssignment[];
}

export interface WcifActivity {
  id: number;
  name: string;
  activityCode: string;
  startTime: string;
  endTime: string;
  childActivities?: WcifActivity[];
}

export interface WcifRoom {
  id: number;
  name: string;
  activities: WcifActivity[];
}

export interface WcifVenue {
  id: number;
  name: string;
  rooms: WcifRoom[];
}

export interface WcifSchedule {
  startDate: string;
  numberOfDays: number;
  venues: WcifVenue[];
}

export interface WcifRound {
  id: string;
  format: string;
  // v2: rounds of a Dual Round (Regulation 9v) list each other here.
  linkedRounds: string[] | null;
  // v2: replaces v1 `advancementCondition`. Not interpreted by this app.
  participationRuleset: unknown;
}

export interface WcifEvent {
  id: string;
  rounds: WcifRound[];
}

export interface Wcif {
  formatVersion: string;
  id: string;
  name: string;
  persons: WcifPerson[];
  events: WcifEvent[];
  schedule: WcifSchedule;
}

// Without a token the endpoint returns the public subset (no emails or
// birthdates), which is all this app needs.
export async function fetchPublicWcif(wcaId: string): Promise<Wcif> {
  const { data } = await axios.get<Wcif>(publicWcifUrl(wcaId));
  return data;
}

/** Recursively search the schedule tree for an activity matching the code */
export function findActivityId(
  schedule: WcifSchedule | null | undefined,
  activityCode: string,
): number | null {
  for (const venue of schedule?.venues ?? []) {
    for (const room of venue.rooms ?? []) {
      const result = searchActivities(room.activities ?? [], activityCode);
      if (result !== null) return result;
    }
  }
  return null;
}

function searchActivities(
  activities: WcifActivity[],
  activityCode: string,
): number | null {
  for (const act of activities) {
    if (act.activityCode === activityCode) return act.id;
    const child = searchActivities(act.childActivities ?? [], activityCode);
    if (child !== null) return child;
  }
  return null;
}

/** Names of the persons with the given assignment code in the activity */
export function namesAssignedTo(
  persons: WcifPerson[],
  activityId: number,
  assignmentCode: string,
): string[] {
  return persons
    .filter((p) =>
      (p.assignments ?? []).some(
        (a) =>
          a.activityId === activityId && a.assignmentCode === assignmentCode,
      ),
    )
    .map((p) => p.name);
}
