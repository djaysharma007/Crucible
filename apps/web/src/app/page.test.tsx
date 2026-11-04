import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Crucible brand wordmark and system status', () => {
    render(<HomePage />);
    expect(screen.getByText('Crucible')).toBeDefined();
    expect(screen.getByText('System Verification')).toBeDefined();
    expect(screen.getByText('Phase 1: Foundation')).toBeDefined();
  });

  it('renders designed empty state and actions', () => {
    render(<HomePage />);
    expect(screen.getByText('No interview sessions recorded')).toBeDefined();
    expect(screen.getByRole('button', { name: /create first session/i })).toBeDefined();
  });
});
