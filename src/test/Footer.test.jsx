import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '@/components/layout/Footer';

const requiredLinks = [
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/community-guidelines', label: 'Community Guidelines' },
  { to: '/safety-trust', label: 'Safety & Trust' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/contact-us', label: 'Contact' },
];

describe('Footer', () => {
  it('renders on public pages', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links to all required pages when logged out', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    for (const { to, label } of requiredLinks) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', to);
    }
  });
});
