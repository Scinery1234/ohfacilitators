import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 py-24 sm:py-32 lg:px-8 bg-stone-50">
      <div className="text-center max-w-lg">
        <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">404</p>
        <h1 className="mt-3 text-4xl font-display font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-stone-600 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-stone-900 text-stone-50 font-semibold px-6 py-3 text-sm hover:bg-stone-800 transition-colors shadow-sm shadow-stone-900/10"
          >
            Go back home
          </Link>
          <Link
            to="/contact-us"
            className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            Contact support →
          </Link>
        </div>
      </div>
    </main>
  );
}
