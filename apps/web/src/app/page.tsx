import * as React from 'react';
import Link from 'next/link';
import {
  Button,
  Badge,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@crucible/ui';
import { Terminal, Plus, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-base text-primary">
      {/* Top Bar */}
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-base tracking-tight text-primary">Crucible</span>
          <Badge variant="secondary">Phase 1: Foundation</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              New Interview
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Status Card */}
        <section className="rounded-panel border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">System Verification</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Foundation Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-control bg-base border border-border">
              <div className="text-xs text-muted">Web Frontend</div>
              <div className="text-sm font-medium mt-1">Next.js 15 App Router</div>
              <div className="mt-2">
                <Badge variant="success">Operational</Badge>
              </div>
            </div>

            <div className="p-3 rounded-control bg-base border border-border">
              <div className="text-xs text-muted">API Service</div>
              <div className="text-sm font-medium mt-1">NestJS /api/v1</div>
              <div className="mt-2">
                <Badge variant="success">Configured</Badge>
              </div>
            </div>

            <div className="p-3 rounded-control bg-base border border-border">
              <div className="text-xs text-muted">Collab Server</div>
              <div className="text-sm font-medium mt-1">Hocuspocus + Yjs</div>
              <div className="mt-2">
                <Badge variant="accent">Real-Time Sync</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Interviews Data View with Designed States */}
        <section className="rounded-panel border border-border bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-primary">Interviews</h2>
              <p className="text-xs text-muted mt-0.5">
                Technical interview sessions, evaluation scorecards, and timeline replays.
              </p>
            </div>
          </div>

          {/* Designed Empty State */}
          <EmptyState
            icon={Terminal}
            title="No interview sessions recorded"
            description="Interviews created through the dashboard will appear here with recording, timeline, and score history."
            action={
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Create First Session
                </Button>
              </Link>
            }
          />

          {/* Sample Dense Table Layout */}
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Schema Preview
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Languages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Sample Candidate</TableCell>
                  <TableCell>Distributed Systems Engineer</TableCell>
                  <TableCell>
                    <Badge variant="default">Scheduled</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">TypeScript, Python</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
