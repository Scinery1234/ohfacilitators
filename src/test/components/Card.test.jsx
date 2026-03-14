import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '@/components/ui/Card';

describe('Card Component', () => {
  it('should render children', () => {
    render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should have default padding', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('p-6');
  });

  it('should remove padding when padding prop is false', () => {
    const { container } = render(<Card padding={false}>Content</Card>);
    const card = container.firstChild;
    expect(card).not.toHaveClass('p-6');
    expect(card).not.toHaveClass('p-8');
  });

  it('should have correct base styles', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-2xl');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-stone-200');
    expect(card).toHaveClass('shadow-sm');
  });

  it('should accept custom className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('custom-card');
  });

  it('should pass through additional props', () => {
    const { container } = render(
      <Card data-testid="card" aria-label="Test card">
        Content
      </Card>
    );
    const card = container.firstChild;
    expect(card).toHaveAttribute('data-testid', 'card');
    expect(card).toHaveAttribute('aria-label', 'Test card');
  });
});
