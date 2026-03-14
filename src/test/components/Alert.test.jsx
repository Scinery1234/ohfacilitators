import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Alert from '@/components/ui/Alert';

describe('Alert Component', () => {
  it('should render children', () => {
    render(<Alert>This is an alert</Alert>);
    expect(screen.getByText('This is an alert')).toBeInTheDocument();
  });

  it('should render info type by default', () => {
    const { container } = render(<Alert>Info alert</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('bg-sky-50');
    expect(alert).toHaveClass('border-sky-200/80');
    expect(alert).toHaveClass('text-sky-800');
  });

  it('should render success type', () => {
    const { container } = render(<Alert type="success">Success!</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('bg-green-50');
    expect(alert).toHaveClass('border-green-200/80');
    expect(alert).toHaveClass('text-green-800');
  });

  it('should render error type', () => {
    const { container } = render(<Alert type="error">Error occurred</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('bg-red-50');
    expect(alert).toHaveClass('border-red-200/80');
    expect(alert).toHaveClass('text-red-800');
  });

  it('should render warning type', () => {
    const { container } = render(<Alert type="warning">Warning!</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('bg-amber-50');
    expect(alert).toHaveClass('border-amber-200/80');
    expect(alert).toHaveClass('text-amber-800');
  });

  it('should have correct base styles', () => {
    const { container } = render(<Alert>Alert</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('rounded-xl');
    expect(alert).toHaveClass('border');
    expect(alert).toHaveClass('p-4');
    expect(alert).toHaveClass('text-sm');
  });

  it('should have role="alert"', () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<Alert className="custom-alert">Alert</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass('custom-alert');
  });

  it('should pass through additional props', () => {
    const { container } = render(
      <Alert data-testid="alert" aria-label="Test alert">
        Alert
      </Alert>
    );
    const alert = container.firstChild;
    expect(alert).toHaveAttribute('data-testid', 'alert');
    expect(alert).toHaveAttribute('aria-label', 'Test alert');
  });
});
