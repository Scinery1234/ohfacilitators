import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const from = location.state?.from || '/';

  const handleDemoLogin = (role) => {
    setError('');
    setDemoLoading(role);
    try {
      loginAsDemo(role);
      navigate(from);
    } catch (err) {
      setError('Demo login failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      await login(data);
      navigate(from);
    } catch (err) {
      if (!err.response) {
        setError("We can't reach the server right now. Please try again later.");
        return;
      }
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-stone-50">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
                Welcome back
              </h1>
              <p className="mt-1 text-stone-600">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  {...register('password')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-primary-200 focus:ring-primary-200/50"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-stone-600">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-stone-900 text-stone-50 font-semibold py-3.5 px-6 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-stone-900/10"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col justify-center space-y-6">
          <div className="bg-primary-100/50 rounded-2xl border border-primary-200/40 p-8 text-center">
            <h2 className="text-xl font-display font-semibold text-stone-900 tracking-tight">
              Try without an account
            </h2>
            <p className="mt-3 text-stone-600 text-sm leading-relaxed">
              Use demo login to explore the app. No backend or signup required.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('user')}
                disabled={demoLoading !== null}
                className="w-full rounded-xl bg-stone-900 text-stone-50 font-semibold py-3 px-6 text-sm hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoLoading === 'user' ? 'Signing in...' : 'Log in as User'}
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('host')}
                disabled={demoLoading !== null}
                className="w-full rounded-xl border-2 border-primary-200 bg-white text-stone-900 font-semibold py-3 px-6 text-sm hover:bg-primary-100/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoLoading === 'host' ? 'Signing in...' : 'Log in as Host'}
              </button>
            </div>
          </div>
          <div className="bg-stone-100/80 rounded-2xl border border-stone-200 p-8 text-center">
            <h2 className="text-xl font-display font-semibold text-stone-900 tracking-tight">
              New to oh places?
            </h2>
            <p className="mt-3 text-stone-600 text-sm leading-relaxed">
              Create an account to book experiences or list your space as a host.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border-2 border-stone-300 text-stone-800 font-semibold py-3 px-6 text-sm hover:border-stone-400 hover:bg-white/50 transition-all"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
