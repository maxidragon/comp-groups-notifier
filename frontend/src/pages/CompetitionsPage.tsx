import { useEffect, useState } from 'react';
import api from '../lib/api';

interface WcaCompetition {
  id: string;
  name: string;
  country_iso2: string;
  start_date: string;
  end_date: string;
  city: string;
}

interface ManagedCompetition {
  id: string;
  wcaId: string;
  name: string;
  countryIso2?: string;
  currentGroupId?: string;
  role: string;
}

export default function CompetitionsPage() {
  const [wcaComps, setWcaComps] = useState<WcaCompetition[]>([]);
  const [managed, setManaged] = useState<ManagedCompetition[]>([]);
  const [loadingWca, setLoadingWca] = useState(true);
  // const [loadingManaged, setLoadingManaged] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchManaged = async () => {
    const { data } = await api.get('/competitions');
    setManaged(data);
    // setLoadingManaged(false);
  };

  const fetchWca = async () => {
    try {
      const { data } = await api.get('/competitions/wca');
      setWcaComps(data);
    } catch {
      setError('Could not fetch WCA competitions. Make sure your account has delegate/organizer access.');
    } finally {
      setLoadingWca(false);
    }
  };

  useEffect(() => {
    fetchManaged();
    fetchWca();
  }, []);

  const handleAdd = async (wcaId: string, role: string) => {
    setAdding(wcaId);
    setError(null);
    try {
      await api.post('/competitions', { wcaId, role });
      await fetchManaged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add competition');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (competitionId: string) => {
    setRemoving(competitionId);
    try {
      await api.delete(`/competitions/${competitionId}`);
      await fetchManaged();
    } catch {
      setError('Failed to remove competition');
    } finally {
      setRemoving(null);
    }
  };

  const managedWcaIds = new Set(managed.map((c) => c.wcaId));
  const filteredWca = wcaComps.filter(
    (c) =>
      !managedWcaIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Competitions</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage which competitions you want to control groups for
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Already added */}
      {managed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Your Managed Competitions ({managed.length})
          </h2>
          <div className="space-y-2">
            {managed.map((comp) => (
              <div
                key={comp.id}
                className="card flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center text-sm">
                    🏆
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{comp.name}</p>
                    <p className="text-xs text-slate-500">
                      {comp.wcaId} · {comp.countryIso2 ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={comp.role === 'delegate' ? 'badge-purple' : 'badge-indigo'}>
                    {comp.role}
                  </span>
                  {comp.currentGroupId && (
                    <span className="badge-green">Active</span>
                  )}
                  <button
                    onClick={() => handleRemove(comp.id)}
                    disabled={removing === comp.id}
                    className="btn-danger py-1.5 px-3 text-xs"
                  >
                    {removing === comp.id ? (
                      <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add from WCA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Available from WCA
          </h2>
          <div className="relative">
            <input
              type="search"
              placeholder="Search competitions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-60 py-2"
            />
          </div>
        </div>

        {loadingWca ? (
          <div className="card flex items-center justify-center h-32">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Fetching from WCA API…</span>
            </div>
          </div>
        ) : filteredWca.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-slate-300 font-medium">
              {search ? 'No competitions match your search' : 'No more competitions to add'}
            </p>
            <p className="text-slate-500 text-sm">
              {search
                ? 'Try a different search term'
                : 'All your manageable WCA competitions are already added'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWca.map((comp) => (
              <div
                key={comp.id}
                className="card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-sm">
                    🌍
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{comp.name}</p>
                    <p className="text-xs text-slate-500">
                      {comp.id} · {comp.city}, {comp.country_iso2} ·{' '}
                      {new Date(comp.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdd(comp.id, 'delegate')}
                    disabled={adding === comp.id}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    {adding === comp.id ? (
                      <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Delegate
                  </button>
                  <button
                    onClick={() => handleAdd(comp.id, 'organizer')}
                    disabled={adding === comp.id}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    {adding === comp.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
