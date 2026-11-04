'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Input } from '@crucible/ui';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setIsSubmitted(true);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit password reset request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-6 shadow-floating space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-primary tracking-tight">Crucible</h1>
          <p className="text-xs text-muted mt-1">
            Reset your account password via email instructions.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-control bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
            {error}
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="p-3 rounded-control bg-base border border-border text-xs text-muted leading-relaxed">
              If an account exists with <strong className="text-primary">{email}</strong>, password
              reset instructions have been issued.
            </div>
            <Link
              href="/login"
              className="block text-center text-xs text-accent hover:underline font-medium"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="interviewer@company.com"
              required
              autoComplete="email"
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send Reset Instructions
            </Button>

            <div className="text-center text-xs text-muted">
              Remember your password?{' '}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
