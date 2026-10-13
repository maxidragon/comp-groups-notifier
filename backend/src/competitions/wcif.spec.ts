import axios from 'axios';
import {
  Wcif,
  fetchPublicWcif,
  findActivityId,
  namesAssignedTo,
  publicWcifUrl,
} from './wcif';

jest.mock('axios');

// Invented WCIF v2 competition with a Dual Round (333-r1 linked with 333-r2).
const wcif: Wcif = {
  formatVersion: '2.2',
  id: 'ExampleOpen2026',
  name: 'Example Open 2026',
  persons: [
    {
      registrantId: 1,
      name: 'Alice Example',
      assignments: [
        { activityId: 11, assignmentCode: 'competitor', stationNumber: 1 },
        { activityId: 21, assignmentCode: 'staff-judge', stationNumber: null },
      ],
    },
    {
      registrantId: 2,
      name: 'Bob Example',
      assignments: [
        { activityId: 21, assignmentCode: 'competitor', stationNumber: 2 },
        { activityId: 11, assignmentCode: 'staff-judge', stationNumber: null },
      ],
    },
    { registrantId: 3, name: 'Carol Example' },
  ],
  events: [
    {
      id: '333',
      rounds: [
        {
          id: '333-r1',
          format: 'a',
          linkedRounds: ['333-r1', '333-r2'],
          participationRuleset: {
            participationSource: { type: 'registrations' },
            reservedPlaces: null,
          },
        },
        {
          id: '333-r2',
          format: 'a',
          linkedRounds: ['333-r1', '333-r2'],
          participationRuleset: {
            participationSource: { type: 'registrations' },
            reservedPlaces: null,
          },
        },
        {
          id: '333-r3',
          format: 'a',
          linkedRounds: null,
          participationRuleset: {
            participationSource: {
              type: 'linkedRounds',
              roundIds: ['333-r1', '333-r2'],
              resultCondition: { type: 'ranking', scope: 'average', value: 8 },
            },
            reservedPlaces: null,
          },
        },
      ],
    },
  ],
  schedule: {
    startDate: '2026-01-10',
    numberOfDays: 1,
    venues: [
      {
        id: 1,
        name: 'Main Hall',
        rooms: [
          {
            id: 1,
            name: 'Stage',
            activities: [
              {
                id: 10,
                name: '3x3x3 Cube, Round 1',
                activityCode: '333-r1',
                startTime: '2026-01-10T09:00:00Z',
                endTime: '2026-01-10T10:00:00Z',
                childActivities: [
                  {
                    id: 11,
                    name: '3x3x3 Cube, Round 1, Group 1',
                    activityCode: '333-r1-g1',
                    startTime: '2026-01-10T09:00:00Z',
                    endTime: '2026-01-10T10:00:00Z',
                  },
                ],
              },
              {
                id: 20,
                name: '3x3x3 Cube, Round 2',
                activityCode: '333-r2',
                startTime: '2026-01-10T10:00:00Z',
                endTime: '2026-01-10T11:00:00Z',
                childActivities: [
                  {
                    id: 21,
                    name: '3x3x3 Cube, Round 2, Group 1',
                    activityCode: '333-r2-g1',
                    startTime: '2026-01-10T10:00:00Z',
                    endTime: '2026-01-10T11:00:00Z',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('publicWcifUrl', () => {
  it('pins WCIF major version 2', () => {
    expect(publicWcifUrl('ExampleOpen2026')).toBe(
      'https://www.worldcubeassociation.org/api/v0/competitions/ExampleOpen2026/wcif/version/2',
    );
  });
});

describe('fetchPublicWcif', () => {
  it('requests the v2 endpoint without a token', async () => {
    const get = jest.mocked(axios.get).mockResolvedValue({ data: wcif });

    await expect(fetchPublicWcif('ExampleOpen2026')).resolves.toBe(wcif);
    expect(get).toHaveBeenCalledWith(publicWcifUrl('ExampleOpen2026'));
  });
});

describe('findActivityId', () => {
  it('finds groups in both rounds of a dual round', () => {
    expect(findActivityId(wcif.schedule, '333-r1-g1')).toBe(11);
    expect(findActivityId(wcif.schedule, '333-r2-g1')).toBe(21);
  });

  it('returns null for an unknown code or missing schedule', () => {
    expect(findActivityId(wcif.schedule, '333-r3-g1')).toBeNull();
    expect(findActivityId(null, '333-r1-g1')).toBeNull();
  });
});

describe('namesAssignedTo', () => {
  it('keeps assignments of linked rounds apart', () => {
    expect(namesAssignedTo(wcif.persons, 11, 'competitor')).toEqual([
      'Alice Example',
    ]);
    expect(namesAssignedTo(wcif.persons, 21, 'competitor')).toEqual([
      'Bob Example',
    ]);
    expect(namesAssignedTo(wcif.persons, 21, 'staff-judge')).toEqual([
      'Alice Example',
    ]);
  });
});
