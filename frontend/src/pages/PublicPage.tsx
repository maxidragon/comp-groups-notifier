import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface PublicCompetition {
  id: string;
  wcaId: string;
  name: string;
  countryIso2?: string;
  currentGroupId?: string;
}

export default function PublicPage() {
  const [competitions, setCompetitions] = useState<PublicCompetition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/competitions')
      .then((r) => r.json())
      .then(setCompetitions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-16">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-8">
        {/* Logo / heading */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-2">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">WCA Live Groups</h1>
          <p className="text-slate-400 text-sm">
            Select a competition to receive live group announcements.
          </p>
        </div>

        {/* Competition list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : competitions.length === 0 ? (
          <div className="card text-center py-14 space-y-2">
            <p className="text-slate-300 font-medium">No competitions available</p>
            <p className="text-slate-500 text-sm">
              Ask your organizer to add the competition to the system.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((comp) => (
              <Link
                key={comp.id}
                to={`/live/${comp.id}`}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {comp.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">{comp.wcaId}</span>
                    {comp.countryIso2 && (
                      <span className="text-xs text-slate-600">· {comp.countryIso2}</span>
                    )}
                  </div>
                </div>

                {comp.currentGroupId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">LIVE</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 shrink-0">No active group</span>
                )}

                <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-700">
          Powered by WCA Groups Notifier
        </p>
      </div>
    </div>
  );
}
