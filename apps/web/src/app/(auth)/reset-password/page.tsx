'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@crucible/ui';
import { apiClient } from '@/lib/api-client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = React.useState(initialToken);
  const [newPassword, setNewPassword] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-6 shadow-floating space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary tracking-tight">Crucible</h1>
        <p className="text-xs text-muted mt-1">Set a new password for your interviewer account.</p>
      </div>

      {error && (
        <div className="p-2.5 rounded-control bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
          {error}
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4">
          <div className="p-3 rounded-control bg-success/10 border border-success/30 text-xs text-primary leading-relaxed">
            Your password has been successfully reset. Redirecting to sign in...
          </div>
          <Link
            href="/login"
            className="block text-center text-xs text-accent hover:underline font-medium"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Reset token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
            required
          />

          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Set New Password
          </Button>

          <div className="text-center text-xs text-muted">
            <Link href="/login" className="text-accent hover:underline font-medium">
              Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <React.Suspense fallback={<div className="text-xs text-muted">Loading...</div>}>
        <ResetPasswordForm />
      </React.Suspense>
    </div>
  );
}
