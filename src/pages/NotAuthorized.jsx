import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function NotAuthorized() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12 bg-stone-50">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-5">
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-semibold text-stone-900 tracking-tight mb-2">
            Access denied
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            You don&apos;t have permission to access this page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="primary">Go home</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
