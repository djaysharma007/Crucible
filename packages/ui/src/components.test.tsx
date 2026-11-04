import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Badge } from './components/Badge';
import { EmptyState } from './components/EmptyState';

describe('UI Base Components', () => {
  it('renders button with correct text and variant classes', () => {
    render(<Button variant="primary">Start Interview</Button>);
    const button = screen.getByRole('button', { name: /start interview/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('bg-accent');
  });

  it('handles loading state in Button', () => {
    render(<Button isLoading>Saving</Button>);
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('renders Input with label and error message', () => {
    render(
      <Input
        label="Candidate Email"
        error="Email is required"
        placeholder="candidate@example.com"
      />,
    );
    expect(screen.getByLabelText(/candidate email/i)).toBeDefined();
    expect(screen.getByText(/email is required/i)).toBeDefined();
  });

  it('renders Badge with proper label', () => {
    render(<Badge variant="success">Passed</Badge>);
    expect(screen.getByText(/passed/i)).toBeDefined();
  });

  it('renders EmptyState with title, description, and action', () => {
    render(
      <EmptyState
        title="No interviews scheduled"
        description="Schedule a technical interview to get started."
        action={<Button size="sm">Create Interview</Button>}
      />,
    );
    expect(screen.getByText(/no interviews scheduled/i)).toBeDefined();
    expect(screen.getByText(/schedule a technical interview to get started/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /create interview/i })).toBeDefined();
  });
});
