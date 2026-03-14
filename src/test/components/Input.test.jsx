import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input Component', () => {
  it('should render input without label', () => {
    render(<Input name="test" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render input with label', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should show required indicator', () => {
    render(<Input label="Email" name="email" required />);
    const label = screen.getByText('Email');
    expect(label.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Input name="email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should have error styling when error is present', () => {
    const { container } = render(<Input name="email" error="Error" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-red-400');
  });

  it('should accept placeholder', () => {
    render(<Input name="email" placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('should set correct input type', () => {
    const { container } = render(<Input name="password" type="password" />);
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should use name as id when id is not provided', () => {
    render(<Input name="email" label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('should use custom id when provided', () => {
    render(<Input id="custom-id" name="email" label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('should accept value and onChange', () => {
    const handleChange = vi.fn();
    render(<Input name="email" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('should accept custom className', () => {
    const { container } = render(<Input name="email" className="custom-input" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('custom-input');
  });

  it('should have aria-describedby when error is present', () => {
    render(<Input name="email" error="Error message" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
  });
});
