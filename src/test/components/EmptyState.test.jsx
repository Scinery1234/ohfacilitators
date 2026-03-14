import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

describe('EmptyState Component', () => {
  it('should render title and message', () => {
    render(<EmptyState title="No items" message="You don't have any items yet" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText("You don't have any items yet")).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    render(
      <EmptyState
        title="No events"
        message="Create your first event"
        action={<Button>Create Event</Button>}
      />
    );
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" message="Message" className="custom-empty" />
    );
    const emptyState = container.firstChild;
    expect(emptyState).toHaveClass('custom-empty');
  });

  it('should render icon when provided', () => {
    const { container } = render(
      <EmptyState title="Empty" message="Message" icon={<span data-testid="icon">Icon</span>} />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });
});
