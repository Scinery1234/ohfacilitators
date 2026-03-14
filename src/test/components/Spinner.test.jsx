import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Spinner from '@/components/ui/Spinner';

describe('Spinner Component', () => {
  it('should render spinner', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have medium size by default', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8');
    expect(svg).toHaveClass('w-8');
  });

  it('should render small size', () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4');
    expect(svg).toHaveClass('w-4');
  });

  it('should render large size', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12');
    expect(svg).toHaveClass('w-12');
  });

  it('should have animate-spin class', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('should have primary color', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-primary-200');
  });

  it('should have aria-label', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Loading');
  });

  it('should accept custom className', () => {
    const { container } = render(<Spinner className="custom-spinner" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-spinner');
  });
});
