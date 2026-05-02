import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Competition {
  id: string;
  wcaId: string;
  name: string;
  countryIso2?: string;
  currentGroupId?: string;
  role: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/competitions')
      .then(({ data }) => setCompetitions(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeComps = competitions.filter((c) => c.currentGroupId);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-gradient">{user?.fullName?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage your WCA competition groups</p>
        </div>
        <Link to="/competitions" className="btn-primary">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Competition
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Competitions', value: competitions.length, icon: '🏆', color: 'indigo' },
          { label: 'Active Groups', value: activeComps.length, icon: '📢', color: 'green' },
          { label: 'WCA ID', value: `#${user?.wcaUserId}`, icon: '🆔', color: 'purple' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Competitions */}
      {activeComps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            🔴 Live — Active Groups
          </h2>
          <div className="space-y-2">
            {activeComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="card flex items-center justify-between hover:border-indigo-500/30 hover:bg-white/8 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
                  <div>
                    <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{comp.name}</p>
                    <p className="text-xs text-slate-500">{comp.wcaId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-green">Group: {comp.currentGroupId}</span>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Competitions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Your Competitions
        </h2>
        {loading ? (
          <div className="card flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : competitions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center gap-3">
            <span className="text-4xl">🏁</span>
            <p className="text-slate-300 font-medium">No competitions yet</p>
            <p className="text-slate-500 text-sm">Add your first competition to get started</p>
            <Link to="/competitions" className="btn-primary mt-2">
              Add Competition
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {competitions.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="card flex items-center justify-between hover:border-indigo-500/30 hover:bg-white/8 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-base">
                    {comp.countryIso2 ? `🏳️` : '🏆'}
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{comp.name}</p>
                    <p className="text-xs text-slate-500">{comp.wcaId} · {comp.countryIso2 ?? 'Unknown country'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={comp.role === 'delegate' ? 'badge-purple' : 'badge-indigo'}>
                    {comp.role}
                  </span>
                  {comp.currentGroupId && (
                    <span className="badge-green">Active</span>
                  )}
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
