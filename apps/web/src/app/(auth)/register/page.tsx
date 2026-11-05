'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@crucible/ui';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({ displayName, email, password });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Failed to register account');
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
            Create an interviewer account to conduct technical hiring sessions.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-control bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Doe"
            required
            autoComplete="name"
          />

          <Input
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="interviewer@company.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <div className="text-center text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
