import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const footerLinks = [
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/community-guidelines', label: 'Community Guidelines' },
  { to: '/safety-trust', label: 'Safety & Trust' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/contact-us', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer role="contentinfo" className="border-t border-stone-200 bg-stone-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-hidden">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 flex-wrap">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </Link>

            <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer links">
              {footerLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <p className="text-sm text-stone-500">
            © {currentYear} oh places
          </p>
        </div>
      </div>
    </footer>
  );
}
