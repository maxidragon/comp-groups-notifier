import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-radial-indigo flex items-center justify-center p-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4 glow-indigo">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Groups <span className="text-gradient">Notifier</span>
          </h1>
          <p className="text-slate-400 text-sm">
            WCA Competition Group Calling System
          </p>
        </div>

        {/* Card */}
        <div className="card space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Sign in</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connect with your World Cube Association account to manage your competition groups.
            </p>
          </div>

          {/* WCA Features */}
          <div className="space-y-2">
            {[
              'Access your manageable competitions',
              'Control active group announcements',
              'Real-time group switching',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-r from-indigo-600 to-purple-600
              hover:from-indigo-500 hover:to-purple-500
              active:scale-[0.98]
              transition-all duration-200
              shadow-lg shadow-indigo-500/25
              flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Continue with WCA
          </button>

          <p className="text-xs text-slate-500 text-center">
            You'll be redirected to WCA's secure login page
          </p>
        </div>
      </div>
    </div>
  );
}
