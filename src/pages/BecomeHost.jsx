import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function BecomeHost() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Logged-in users can create immediately — no approval. Send them to dashboard.
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-stone-500 font-medium">Taking you to your dashboard...</div>
      </div>
    );
  }

  return <BecomeHostInfoPage />;
}

function BecomeHostInfoPage() {
  return (
    <div className="bg-stone-50 min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10 text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900 tracking-tight mb-4">
            Create your place, event, or community
          </h1>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto mb-4">
            Sign in to list a place, host an event, or start a community. No approval needed — create as soon as you have an account.
          </p>
          <p className="text-sm text-stone-500 max-w-xl mx-auto mb-8">
            Joining someone else&apos;s community may require approval from that community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 text-stone-50 font-semibold px-8 py-4 text-sm hover:bg-stone-800 transition-colors shadow-sm shadow-stone-900/10"
            >
              Sign up to get started
            </Link>
            <Link
              to="/login"
              state={{ from: '/dashboard' }}
              className="inline-flex items-center justify-center rounded-xl border-2 border-stone-300 text-stone-700 font-semibold px-8 py-4 text-sm hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              Already have an account? Log in
            </Link>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10 mb-10">
          <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight mb-6">
            How it works
          </h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Create your account', desc: 'Sign up for a free account.' },
              { step: 2, title: 'Create right away', desc: 'List a place, host an event, or start a community — no approval needed.' },
              { step: 3, title: 'Share and grow', desc: 'Welcome guests and build your community.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center font-semibold text-sm">
                  {step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
                  <p className="text-stone-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10">
          <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight mb-6">
            Why create on Oh Places?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Earn extra income</h3>
              <p className="text-stone-600 mt-1">Turn your space into revenue. Set your own prices.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Build community</h3>
              <p className="text-stone-600 mt-1">Connect with people and create memorable experiences.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Full control</h3>
              <p className="text-stone-600 mt-1">You decide availability and who can book.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
