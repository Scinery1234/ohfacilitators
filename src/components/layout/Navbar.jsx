import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getNavCounts } from '@/api/me';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { user, logout, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navCounts, setNavCounts] = useState({ communities: 0, places: 0, events: 0, schedule: 0, messagesUnread: 0 });

  useEffect(() => {
    if (user) {
      getNavCounts()
        .then((data) => setNavCounts(data?.counts || { communities: 0, places: 0, events: 0, schedule: 0, messagesUnread: 0 }))
        .catch(() => setNavCounts({ communities: 0, places: 0, events: 0, schedule: 0, messagesUnread: 0 }));
    } else {
      setNavCounts({ communities: 0, places: 0, events: 0, schedule: 0, messagesUnread: 0 });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navLinkClass =
    'text-stone-600 hover:text-stone-900 font-medium transition-colors duration-200 text-[15px] whitespace-nowrap';

  return (
    <nav className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0">
        <div className="flex justify-between items-center h-16 gap-4 sm:gap-6 lg:gap-8 min-w-0">
          <Link to="/" onClick={closeMobileMenu} className="flex items-center min-w-0 shrink-0 pr-4 sm:pr-6">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-5 lg:gap-7 xl:gap-8 ml-2 lg:ml-4">
            <Link to="/communities?tab=communities" className={navLinkClass}>
              Communities
            </Link>
            <Link to="/explore?type=spaces" className={navLinkClass}>
              Venues
            </Link>
            <Link to="/explore" className={navLinkClass}>
              Discover
            </Link>

            {user ? (
              <>
                {navCounts.events > 0 && (
                  <Link to="/my-events" className={navLinkClass}>
                    My Events
                  </Link>
                )}
                {navCounts.schedule > 0 && (
                  <Link to="/my-schedule" className={navLinkClass}>
                    My Schedule
                  </Link>
                )}

                <Link to="/messages" className={`${navLinkClass} relative`}>
                  Messages
                  {navCounts.messagesUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-stone-900 text-white text-xs font-medium flex items-center justify-center px-1">
                      {navCounts.messagesUnread > 99 ? '99+' : navCounts.messagesUnread}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className={navLinkClass}>
                  Profile
                </Link>

                {user.role === 'admin' && (
                  <Link to="/admin" className={navLinkClass}>
                    Admin
                  </Link>
                )}

                <div className="flex items-center gap-4 lg:gap-6 pl-4 lg:pl-6 ml-2 border-l border-stone-200 shrink-0">
                  {isDemoUser && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800" title="Demo mode – no backend">Demo</span>
                  )}
                  <span className="text-sm text-stone-500 truncate max-w-[120px] lg:max-w-[160px]">{user.fullName || user.email}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${navLinkClass} text-stone-500 hover:text-stone-800 whitespace-nowrap`}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/list-place" className={navLinkClass}>
                  List a place
                </Link>
                <Link to="/login" className={navLinkClass}>
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-stone-900 text-stone-50 font-medium px-5 py-2.5 text-sm hover:bg-stone-800 transition-colors duration-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -m-2 text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-stone-50">
          <div className="px-4 py-4 space-y-1">
            <Link
              to="/communities?tab=communities"
              onClick={closeMobileMenu}
              className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
            >
              Communities
            </Link>
            <Link
              to="/explore?type=spaces"
              onClick={closeMobileMenu}
              className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
            >
              Venues
            </Link>
            <Link
              to="/explore"
              onClick={closeMobileMenu}
              className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
            >
              Discover
            </Link>

            {user ? (
              <>
                {navCounts.events > 0 && (
                  <Link
                    to="/my-events"
                    onClick={closeMobileMenu}
                    className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                  >
                    My Events
                  </Link>
                )}
                {navCounts.schedule > 0 && (
                  <Link
                    to="/my-schedule"
                    onClick={closeMobileMenu}
                    className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                  >
                    My Schedule
                  </Link>
                )}

                <Link
                  to="/messages"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                >
                  Messages{navCounts.messagesUnread > 0 ? ` (${navCounts.messagesUnread})` : ''}
                </Link>
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                >
                  Profile
                </Link>

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={closeMobileMenu}
                    className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                  >
                    Admin
                  </Link>
                )}

                <div className="border-t border-stone-200 pt-4 mt-4 space-y-1">
                  <div className="px-3 py-2 flex items-center gap-2">
                    {isDemoUser && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">Demo</span>
                    )}
                    <p className="text-sm text-stone-500">{user.fullName || user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/list-place"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                >
                  List a place
                </Link>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 rounded-xl text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 rounded-xl bg-stone-900 text-stone-50 font-medium text-center mt-2"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
