'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Badge,
  Input,
  Select,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@crucible/ui';
import {
  Plus,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Search,
  BookOpen,
  FileText,
  Users2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AggregateStatsCards } from '@/components/dashboard/AggregateStatsCards';
import { CandidateComparisonModal } from '@/components/dashboard/CandidateComparisonModal';
import { Recommendation } from '@crucible/shared';

interface InterviewItem {
  id: string;
  candidateName: string;
  roleTitle: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  scorecard?: {
    recommendation: Recommendation;
    summary: string | null;
  } | null;
}

const REC_BADGE_STYLE: Record<Recommendation, { label: string; className: string }> = {
  strong_hire: {
    label: 'Strong Hire',
    className: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40',
  },
  hire: {
    label: 'Hire',
    className: 'bg-teal-950/60 text-teal-400 border border-teal-500/40',
  },
  no_hire: {
    label: 'No Hire',
    className: 'bg-amber-950/60 text-amber-400 border border-amber-500/40',
  },
  strong_no_hire: {
    label: 'Strong No Hire',
    className: 'bg-rose-950/60 text-rose-400 border border-rose-500/40',
  },
};

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  if (!endedAt) return 'In progress';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffMinutes = Math.max(1, Math.round((end - start) / 60000));
  return `${diffMinutes}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [interviews, setInterviews] = React.useState<InterviewItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [recommendationFilter, setRecommendationFilter] = React.useState<string>('all');

  // Candidate Comparison Selection
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [candidateName, setCandidateName] = React.useState('');
  const [roleTitle, setRoleTitle] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdRoomUrl, setCreatedRoomUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const fetchInterviews = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await apiClient<{ items: InterviewItem[] }>(`/interviews?${params.toString()}`);
      setInterviews(res.items);
    } catch {
      // Handled cleanly
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchInterviews();
    }
  }, [user, authLoading, router, fetchInterviews]);

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await apiClient<{ roomUrl: string }>('/interviews', {
        method: 'POST',
        body: JSON.stringify({
          candidateName,
          roleTitle: roleTitle || undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      const fullUrl = `${window.location.origin}${res.roomUrl}`;
      setCreatedRoomUrl(fullUrl);
      fetchInterviews();
    } catch (err) {
      alert((err as Error).message || 'Failed to create interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setCreatedRoomUrl(null);
    setCandidateName('');
    setRoleTitle('');
    setScheduledAt('');
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Keep at most 2 by replacing the oldest
        return [prev[1]!, id];
      }
      return [...prev, id];
    });
  };

  const displayedInterviews = React.useMemo(() => {
    if (recommendationFilter === 'all') return interviews;
    if (recommendationFilter === 'none') {
      return interviews.filter((item) => !item.scorecard?.recommendation);
    }
    return interviews.filter((item) => item.scorecard?.recommendation === recommendationFilter);
  }, [interviews, recommendationFilter]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen bg-base p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base text-primary">
      {/* Top Navigation */}
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-base tracking-tight text-primary">Crucible</span>
          <span className="text-xs text-muted">/ Interviews</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-medium">{user?.displayName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            <LogOut className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Sign Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/questions')}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Question Bank
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            New Interview
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Aggregate Stats Cards */}
        <section aria-label="Dashboard Overview Statistics">
          <AggregateStatsCards />
        </section>

        {/* Filter Controls & Comparison Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search candidate name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-control text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted whitespace-nowrap">Status:</span>
              <div className="w-32">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'live', label: 'Live' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted whitespace-nowrap">Recommendation:</span>
              <div className="w-36">
                <Select
                  value={recommendationFilter}
                  onValueChange={setRecommendationFilter}
                  options={[
                    { value: 'all', label: 'All Ratings' },
                    { value: 'strong_hire', label: 'Strong Hire' },
                    { value: 'hire', label: 'Hire' },
                    { value: 'no_hire', label: 'No Hire' },
                    { value: 'strong_no_hire', label: 'Strong No Hire' },
                    { value: 'none', label: 'Unrated' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Compare Candidates Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedCandidateIds.length > 0 && (
              <span className="text-xs font-mono text-muted">
                {selectedCandidateIds.length}/2 selected
              </span>
            )}
            <Button
              variant={selectedCandidateIds.length === 2 ? 'primary' : 'outline'}
              size="sm"
              disabled={selectedCandidateIds.length !== 2}
              onClick={() => setIsCompareOpen(true)}
            >
              <Users2 className="w-3.5 h-3.5 mr-1.5" />
              Compare Candidates
            </Button>
            {selectedCandidateIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCandidateIds([])}
                title="Clear selection"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Interviews Table / Empty State */}
        <div className="border border-border rounded-panel bg-surface overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : displayedInterviews.length === 0 ? (
            <EmptyState
              icon={Terminal}
              title="No interviews found"
              description="No interviews match your filter or you have not scheduled any technical hiring sessions yet."
              action={
                <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Schedule Interview
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Compare</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInterviews.map((item) => {
                  const statusVariant =
                    item.status === 'live'
                      ? 'accent'
                      : item.status === 'completed'
                        ? 'success'
                        : item.status === 'cancelled'
                          ? 'danger'
                          : 'default';

                  const isSelected = selectedCandidateIds.includes(item.id);
                  const recStyle = item.scorecard?.recommendation
                    ? REC_BADGE_STYLE[item.scorecard.recommendation]
                    : null;

                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-accent/5' : undefined}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.candidateName} for comparison`}
                          checked={isSelected}
                          onChange={() => toggleCandidateSelection(item.id)}
                          className="h-3.5 w-3.5 rounded border-border bg-base text-accent focus:ring-accent cursor-pointer accent-[#E2C044]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {item.status === 'completed' ? (
                          <button
                            onClick={() => router.push(`/dashboard/interviews/${item.id}`)}
                            className="hover:text-accent hover:underline text-left"
                          >
                            {item.candidateName}
                          </button>
                        ) : (
                          item.candidateName
                        )}
                      </TableCell>
                      <TableCell className="text-muted">{item.roleTitle || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>{item.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted">
                        {formatDuration(item.startedAt, item.endedAt)}
                      </TableCell>
                      <TableCell>
                        {recStyle ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium ${recStyle.className}`}
                          >
                            {recStyle.label}
                          </span>
                        ) : item.status === 'completed' ? (
                          <span className="text-[11px] text-muted font-mono italic">Pending</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted font-mono text-[11px]">
                        {item.scheduledAt
                          ? new Date(item.scheduledAt).toLocaleString()
                          : 'Unscheduled'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'completed' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/interviews/${item.id}`)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Review
                            </Button>
                          ) : item.status === 'live' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => router.push(`/room/${item.id}`)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Join Room
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push(`/room/${item.id}`)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open Room
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Candidate Comparison Modal */}
      <CandidateComparisonModal
        id1={selectedCandidateIds[0] ?? null}
        id2={selectedCandidateIds[1] ?? null}
        isOpen={isCompareOpen}
        onOpenChange={setIsCompareOpen}
      />

      {/* New Interview Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Technical Interview</DialogTitle>
            <DialogDescription>
              Create a unified interview room. A signed, expiring link will be generated for the
              candidate.
            </DialogDescription>
          </DialogHeader>

          {createdRoomUrl ? (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-control bg-base border border-border space-y-1">
                <span className="text-xs text-muted">Candidate Room Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdRoomUrl}
                    className="flex-1 bg-surface border border-border rounded-control px-2 py-1 text-xs font-mono text-primary outline-none"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopyLink(createdRoomUrl)}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted">
                Send this link to the candidate. They can join immediately with zero setup and no
                account registration.
              </div>

              <DialogFooter>
                <Button variant="primary" size="sm" onClick={closeDialog}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateInterview} className="space-y-4">
              <Input
                label="Candidate Name"
                placeholder="e.g. Alex Johnson"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
              />

              <Input
                label="Target Role / Level (Optional)"
                placeholder="e.g. Senior Infrastructure Engineer"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />

              <Input
                label="Scheduled Date and Time (Optional)"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Generate Room Link
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
