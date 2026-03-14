import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    bio: z.string().optional(),
    locationArea: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      const userData = {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        locale: 'en',
        ...(data.bio?.trim() && { bio: data.bio.trim() }),
        ...(data.locationArea?.trim() && { locationArea: data.locationArea.trim() }),
      };
      await registerUser(userData);
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError("We can't reach the server right now. Please try again later.");
        return;
      }
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-stone-50">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
                Create your account
              </h1>
              <p className="mt-1 text-stone-600">Join ohvenues.com and get started</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  {...register('fullName')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="e.g. Alex Smith"
                />
                {errors.fullName && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.fullName.message}</p>
                )}
              </div>

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
                <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Bio <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  {...register('bio')}
                  rows={2}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="Tell others a bit about yourself"
                />
              </div>

              <div>
                <label htmlFor="locationArea" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Location / Area <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="locationArea"
                  {...register('locationArea')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="e.g. Sydney, NSW"
                />
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
                <p className="text-xs text-stone-500 mt-1">At least 6 characters</p>
              </div>

              <div className="text-sm text-stone-600">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="font-medium text-stone-900 hover:underline" target="_blank" rel="noopener noreferrer">
                  Terms &amp; Conditions
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="font-medium text-stone-900 hover:underline" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>.
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Confirm password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  {...register('confirmPassword')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-stone-900 text-stone-50 font-semibold py-3.5 px-6 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-stone-900/10"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col justify-center">
          <div className="bg-stone-100/80 rounded-2xl border border-stone-200 p-8 text-center">
            <h2 className="text-xl font-display font-semibold text-stone-900 tracking-tight">
              Already have an account?
            </h2>
            <p className="mt-3 text-stone-600 text-sm leading-relaxed">
              Sign in to view your bookings or host dashboard.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border-2 border-stone-300 text-stone-800 font-semibold py-3 px-6 text-sm hover:border-stone-400 hover:bg-white/50 transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
