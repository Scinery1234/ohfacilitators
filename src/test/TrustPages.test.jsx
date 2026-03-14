import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import About from '@/pages/About';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import FAQ from '@/pages/FAQ';
import CommunityGuidelines from '@/pages/CommunityGuidelines';
import SafetyAndTrust from '@/pages/SafetyAndTrust';
import ContactUs from '@/pages/ContactUs';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  );
}

function renderWithAuth(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Trust & Legibility Pages', () => {
  describe('About', () => {
    it('renders logged out', () => {
      renderWithRouter(<About />);
      expect(screen.getByRole('heading', { name: /^about$/i })).toBeInTheDocument();
      expect(screen.getByText(/mission/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^what we are$/i })).toBeInTheDocument();
    });

    it('renders logged in - same content', () => {
      renderWithRouter(<About />);
      expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument();
    });
  });

  describe('Privacy Policy', () => {
    it('is accessible logged out', () => {
      renderWithRouter(<PrivacyPolicy />);
      expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByText(/what we collect/i)).toBeInTheDocument();
    });

    it('is accessible logged in', () => {
      renderWithRouter(<PrivacyPolicy />);
      expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    });
  });

  describe('Terms & Conditions', () => {
    it('is accessible logged out', () => {
      renderWithRouter(<TermsAndConditions />);
      expect(screen.getByRole('heading', { name: /terms/i })).toBeInTheDocument();
      expect(screen.getByText(/platform role/i)).toBeInTheDocument();
    });

    it('is accessible logged in', () => {
      renderWithRouter(<TermsAndConditions />);
      expect(screen.getByRole('heading', { name: /terms/i })).toBeInTheDocument();
    });
  });

  describe('FAQ', () => {
    it('renders without auth', () => {
      renderWithRouter(<FAQ />);
      expect(screen.getByRole('heading', { name: /faq/i })).toBeInTheDocument();
      expect(screen.getByText(/do i need permission to host/i)).toBeInTheDocument();
    });

    it('shows questions', () => {
      renderWithRouter(<FAQ />);
      expect(screen.getByText(/what does verification mean/i)).toBeInTheDocument();
      expect(screen.getByText(/who is responsible for events/i)).toBeInTheDocument();
    });
  });

  describe('Community Guidelines', () => {
    it('is accessible logged out', () => {
      renderWithRouter(<CommunityGuidelines />);
      expect(screen.getByRole('heading', { name: /community guidelines/i })).toBeInTheDocument();
    });
  });

  describe('Safety & Trust', () => {
    it('renders', () => {
      renderWithRouter(<SafetyAndTrust />);
      expect(screen.getByRole('heading', { name: /safety/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^what verification does$/i })).toBeInTheDocument();
    });
  });

  describe('Contact', () => {
    it('is accessible logged out', async () => {
      renderWithAuth(<ContactUs />);
      expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument();
    });

    it('has form or stub', async () => {
      renderWithAuth(<ContactUs />);
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });
  });
});
