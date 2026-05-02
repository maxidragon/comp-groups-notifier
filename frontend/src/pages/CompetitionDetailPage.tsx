import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
//eslint-disable-next-line
//@ts-ignore
import '@cubing/icons';

interface Activity {
  id: number;
  name: string;
  activityCode: string;
  startTime: string;
  endTime: string;
  childActivities?: Activity[];
}

interface Room {
  id: number;
  name: string;
  activities: Activity[];
}

interface Venue {
  id: number;
  name: string;
  rooms: Room[];
}

interface Competition {
  id: string;
  wcaId: string;
  name: string;
  countryIso2?: string;
  currentGroupId?: string;
  role: string;
  schedule?: { venues: Venue[] };
  events?: any[];
}

// Flatten all activities recursively and filter groups
function flattenActivities(activities: Activity[]): Activity[] {
  const result: Activity[] = [];
  for (const act of activities) {
    result.push(act);
    if (act.childActivities?.length) {
      result.push(...flattenActivities(act.childActivities));
    }
  }
  return result;
}

function parseActivityCode(code: string) {
  // Format: {eventId}-r{round}-g{group} or similar
  const parts = code.split('-');
  const eventId = parts[0];
  const roundPart = parts.find((p) => p.startsWith('r'));
  const groupPart = parts.find((p) => p.startsWith('g'));
  return {
    eventId,
    round: roundPart ? parseInt(roundPart.slice(1)) : null,
    group: groupPart ? parseInt(groupPart.slice(1)) : null,
  };
}

function EventIcon({ eventId, className = '' }: { eventId: string; className?: string }) {
  return (
    <span
      className={`cubing-icon event-${eventId} ${className}`}
      style={{ fontSize: '1.2rem' }}
    />
  );
}

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingGroup, setSettingGroup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenueIdx, setSelectedVenueIdx] = useState(0);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState(0);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [announcing, setAnnouncing] = useState(false);

  const fetchComp = async () => {
    try {
      const { data } = await api.get(`/competitions/${id}`);
      setComp(data);
    } catch {
      setError('Failed to load competition');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComp();
  }, [id]);

  const handleSetGroup = async (groupId: string | null) => {
    if (!comp) return;
    setSettingGroup(true);
    try {
      await api.patch(`/competitions/${comp.id}/group`, { groupId });
      // Update local admin state directly — socket will update live clients
      setComp((prev) => prev ? { ...prev, currentGroupId: groupId ?? undefined } : prev);
    } catch {
      setError('Failed to update group');
    } finally {
      setSettingGroup(false);
    }
  };

  const handleRefresh = async () => {
    if (!comp) return;
    setRefreshing(true);
    try {
      await api.post(`/competitions/${comp.id}/refresh`);
      await fetchComp();
    } catch {
      setError('Failed to refresh WCIF data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAnnounce = async (type: 'all' | 'judges' | 'competitors' | 'scramblers' | 'runners') => {
    if (!comp?.currentGroupId) return;
    setAnnouncing(true);
    try {
      await api.post(`/competitions/${comp.id}/announce`, { type });
    } catch {
      setError('Failed to send announcement');
    } finally {
      setAnnouncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!comp || error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error || 'Competition not found'}</p>
        <Link to="/competitions" className="btn-secondary mt-4">← Back</Link>
      </div>
    );
  }

  // Get all groups from schedule
  const venues = comp.schedule?.venues ?? [];
  const currentVenue = venues[selectedVenueIdx];
  const rooms = currentVenue?.rooms ?? [];
  const currentRoom = rooms[selectedRoomIdx];
  const allActivities = currentRoom ? flattenActivities(currentRoom.activities) : [];
  const groups = allActivities.filter((a) => {
    const parsed = parseActivityCode(a.activityCode);
    return parsed.group !== null;
  });

  // Sort groups by startTime
  const sortedGroups = [...groups].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const currentGroupIdx = sortedGroups.findIndex(
    (g) => g.activityCode === comp.currentGroupId,
  );

  // Initialise past-day collapse state once sortedGroups is known
  const dayKeys = Array.from(
    new Set(sortedGroups.map((g) => new Date(g.startTime).toLocaleDateString('en-CA')))
  ).sort();

  // On first render (collapsedDays is empty Set) seed it with past days
  if (collapsedDays.size === 0 && dayKeys.length > 0) {
    const now = Date.now();
    const pastDays = new Set(
      dayKeys.filter((key) => {
        const dayGroups = sortedGroups.filter(
          (g) => new Date(g.startTime).toLocaleDateString('en-CA') === key
        );
        const lastEnd = Math.max(...dayGroups.map((g) => new Date(g.endTime).getTime()));
        return lastEnd < now;
      })
    );
    if (pastDays.size > 0) setCollapsedDays(pastDays);
  }

  const toggleDay = (key: string) =>
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleNext = () => {
    if (currentGroupIdx < sortedGroups.length - 1) {
      handleSetGroup(sortedGroups[currentGroupIdx + 1].activityCode);
    }
  };
  const handlePrev = () => {
    if (currentGroupIdx > 0) {
      handleSetGroup(sortedGroups[currentGroupIdx - 1].activityCode);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/competitions" className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 mb-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Competitions
          </Link>
          <h1 className="text-2xl font-bold text-white">{comp.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-400 text-sm">{comp.wcaId}</span>
            {comp.countryIso2 && <span className="text-slate-500 text-sm">· {comp.countryIso2}</span>}
            <span className={comp.role === 'delegate' ? 'badge-purple' : 'badge-indigo'}>{comp.role}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary shrink-0"
        >
          {refreshing ? (
            <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
          Refresh WCIF
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Current Group Banner */}
      <div className={`card border ${comp.currentGroupId ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Active Group</p>
            {comp.currentGroupId ? (
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse-slow" />
                <div>
                  <p className="font-bold text-xl text-white">
                    {sortedGroups.find(g => g.activityCode === comp.currentGroupId)?.name ?? comp.currentGroupId}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{comp.currentGroupId}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No group selected — select one from the schedule below</p>
            )}
          </div>
          {comp.currentGroupId && (
            <button
              onClick={() => handleSetGroup(null)}
              disabled={settingGroup}
              className="btn-danger"
            >
              Clear Group
            </button>
          )}
        </div>

        {/* Prev / Next navigation */}
        {sortedGroups.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <button
              onClick={handlePrev}
              disabled={settingGroup || currentGroupIdx <= 0}
              className="btn-secondary flex-1 justify-center"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous Group
            </button>
            <button
              onClick={handleNext}
              disabled={settingGroup || currentGroupIdx >= sortedGroups.length - 1}
              className="btn-primary flex-1 justify-center"
            >
              Next Group
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ─── Announce Buttons ──────────────────────────────────── */}
      {comp.currentGroupId && (
        <div className="card border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Announcements</p>
              <p className="text-sm text-slate-300">
                Broadcast to all clients watching this competition
              </p>
            </div>
            {announcing && (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Announce All — prominent */}
          <button
            onClick={() => handleAnnounce('all')}
            disabled={announcing}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl
              bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
              text-white font-bold text-base
              transition-all duration-200 shadow-lg shadow-indigo-500/30
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
            📣 Announce Whole Group
          </button>

          {/* Individual role buttons */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: 'judges', label: '⚖️ Judges', labelPl: 'Sędziowie' },
              { type: 'competitors', label: '🏆 Competitors', labelPl: 'Zawodnicy' },
              { type: 'scramblers', label: '🔀 Scramblers', labelPl: 'Scramblerzy' },
              { type: 'runners', label: '🏃 Runners', labelPl: 'Runnerzy' },
            ] as const).map(({ type, label, labelPl }) => (
              <button
                key={type}
                onClick={() => handleAnnounce(type)}
                disabled={announcing}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                  bg-white/5 hover:bg-white/10 active:bg-white/3
                  text-slate-200 font-semibold text-sm
                  border border-white/10 hover:border-white/20
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {label}
                <span className="text-slate-500 text-xs">/ {labelPl}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Venue/Room selector */}
      {venues.length > 0 && (
        <div className="space-y-4">
          {/* Venue tabs */}
          {venues.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {venues.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVenueIdx(i); setSelectedRoomIdx(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedVenueIdx === i
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                    }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {/* Room tabs */}
          {rooms.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {rooms.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomIdx(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedRoomIdx === i
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                    }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Groups List */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Schedule Groups ({sortedGroups.length})
            </h2>

            {sortedGroups.length === 0 ? (
              <div className="card text-center py-8 text-slate-500 text-sm">
                No groups found in schedule. Make sure the WCIF is published on WCA and refresh.
              </div>
            ) : (
              <div className="space-y-1.5">
                {(() => {
                  // Group sortedGroups by calendar day
                  const byDay = sortedGroups.reduce<Record<string, typeof sortedGroups>>((acc, group) => {
                    const date = new Date(group.startTime);
                    const key = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(group);
                    return acc;
                  }, {});

                  const dayKeys = Object.keys(byDay).sort();
                  let globalIdx = 0;

                  return dayKeys.map((dayKey) => {
                    const dayGroups = byDay[dayKey];
                    const dayDate = new Date(dayKey + 'T12:00:00'); // noon to avoid DST issues
                    const dayLabel = dayDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    });
                    const dayNumber = dayKeys.indexOf(dayKey) + 1;

                    return (
                      <div key={dayKey} className="space-y-1.5">
                        {/* Day header */}
                        <button
                          onClick={() => toggleDay(dayKey)}
                          className="w-full flex items-center gap-3 mt-4 first:mt-0 group/day"
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold shrink-0">
                            D{dayNumber}
                          </span>
                          <span className="text-sm font-semibold text-slate-300 group-hover/day:text-white transition-colors">{dayLabel}</span>
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-xs text-slate-500">{dayGroups.length} group{dayGroups.length !== 1 ? 's' : ''}</span>
                          <svg
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${collapsedDays.has(dayKey) ? '-rotate-90' : ''}`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Groups for this day */}
                        {!collapsedDays.has(dayKey) && dayGroups.map((group) => {
                          const parsed = parseActivityCode(group.activityCode);
                          const isActive = group.activityCode === comp.currentGroupId;
                          const startTime = new Date(group.startTime).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                          });
                          const endTime = new Date(group.endTime).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                          });
                          const idx = globalIdx++;

                          return (
                            <button
                              key={group.activityCode}
                              onClick={() => handleSetGroup(group.activityCode)}
                              disabled={settingGroup}
                              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left
                              transition-all duration-200 group
                              ${isActive
                                  ? 'bg-green-500/10 border-green-500/40 shadow-lg shadow-green-500/10'
                                  : 'bg-white/3 border-white/5 hover:bg-white/8 hover:border-white/15'
                                }`}
                            >
                              {/* Number */}
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                              ${isActive ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                                {idx + 1}
                              </span>

                              {/* Event icon */}
                              <span className="shrink-0">
                                <EventIcon eventId={parsed.eventId} />
                              </span>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${isActive ? 'text-green-300' : 'text-slate-200'}`}>
                                  {group.name}
                                </p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{group.activityCode}</p>
                              </div>

                              {/* Time */}
                              <div className="text-right shrink-0">
                                <p className="text-xs text-slate-400">{startTime} – {endTime}</p>
                              </div>

                              {/* Active indicator */}
                              {isActive && (
                                <span className="badge-green shrink-0">LIVE</span>
                              )}
                              {!isActive && settingGroup && (
                                <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {!comp.schedule && (
        <div className="card text-center py-12 space-y-3">
          <span className="text-4xl">📅</span>
          <p className="text-slate-300 font-medium">No schedule data</p>
          <p className="text-slate-500 text-sm">
            The WCIF schedule hasn't been published yet, or refresh to fetch latest data.
          </p>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-primary mx-auto">
            {refreshing ? (
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Refresh from WCA
          </button>
        </div>
      )}
    </div>
  );
}
