import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Stethoscope, AlertCircle, Eye, EyeOff } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const { loginDoctor } = useAuth();
  const [doctorId, setDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!doctorId.trim()) { setError('Please enter your Doctor ID.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true);
    setTimeout(() => {
      const res = loginDoctor(doctorId, password);
      setLoading(false);
      if (!res.success) { setError(res.error || 'Login failed.'); return; }
      navigate('/doctor/dashboard');
    }, 400);
  }

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            <ArrowLeft size={16} />
            Home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md rounded-3xl bg-slate-800 p-8 shadow-2xl shadow-slate-300/30 md:p-10"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white shadow-lg">
                <Stethoscope size={32} className="text-slate-700" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">Doctor Login</h1>
              <p className="mt-1 text-slate-400">Access your clinical workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Doctor ID</label>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-700 bg-slate-850 px-4 py-3.5 transition-colors focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-500/20">
                  <Stethoscope size={20} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. doctor001"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Password</label>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-700 bg-slate-850 px-4 py-3.5 transition-colors focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-500/20">
                  <Lock size={20} className="text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 ring-1 ring-red-500/20"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-medical-600 py-4 text-lg font-semibold text-white shadow-lg shadow-medical-500/30 transition-colors hover:bg-medical-700 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-slate-850 p-4 text-center text-sm">
              <p className="font-semibold text-slate-400">Demo Credentials</p>
              <p className="mt-1 text-slate-500">
                Doctor ID: <span className="font-mono font-semibold text-medical-400">doctor001</span>
              </p>
              <p className="text-slate-500">
                Password: <span className="font-mono font-semibold text-medical-400">Doctor@123</span>
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
