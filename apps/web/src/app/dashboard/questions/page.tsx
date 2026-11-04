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
  BookOpen,
  Copy,
  Download,
  Upload,
  Search,
  Sparkles,
  ArrowLeft,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  CreateQuestionInput,
  QuestionDifficulty,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '@crucible/shared';

interface QuestionItem {
  id: string;
  title: string;
  descriptionMd: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdAt: string;
  languages: Array<{ id: string; language: string; starterCode: string }>;
  testCases: Array<{ id: string; input: string; expectedOutput: string; isHidden: boolean; order: number }>;
}

export default function QuestionsDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = React.useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>('all');

  // Create Question Modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [newDifficulty, setNewDifficulty] = React.useState<QuestionDifficulty>('medium');
  const [newTags, setNewTags] = React.useState('');
  const [newTestInput, setNewTestInput] = React.useState('');
  const [newTestOutput, setNewTestOutput] = React.useState('');
  const [newTestHidden, setNewTestHidden] = React.useState(false);
  const [testCasesList, setTestCasesList] = React.useState<
    Array<{ input: string; expectedOutput: string; isHidden: boolean }>
  >([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importJsonText, setImportJsonText] = React.useState('');
  const [importError, setImportError] = React.useState<string | null>(null);

  const fetchQuestions = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<QuestionItem[]>('/questions');
      setQuestions(data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchQuestions();
    }
  }, [user, authLoading, router, fetchQuestions]);

  const handleAddTestCase = () => {
    if (!newTestInput.trim() || !newTestOutput.trim()) return;
    setTestCasesList((prev) => [
      ...prev,
      {
        input: newTestInput.trim(),
        expectedOutput: newTestOutput.trim(),
        isHidden: newTestHidden,
      },
    ]);
    setNewTestInput('');
    setNewTestOutput('');
    setNewTestHidden(false);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCasesList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    if (testCasesList.length === 0) {
      alert('Please add at least one test case');
      return;
    }

    const payload: CreateQuestionInput = {
      title: newTitle.trim(),
      descriptionMd: newDescription.trim(),
      difficulty: newDifficulty,
      tags: newTags
        ? newTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      languages: SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => ({
        language: lang,
        starterCode: `// ${lang} starter\n`,
      })),
      testCases: testCasesList.map((tc, idx) => ({
        ...tc,
        order: idx,
      })),
    };

    try {
      setIsSubmitting(true);
      await apiClient.post('/questions', payload);
      setIsCreateOpen(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      alert((err as Error).message || 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewDifficulty('medium');
    setNewTags('');
    setTestCasesList([]);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await apiClient.post(`/questions/${id}/duplicate`);
      fetchQuestions();
    } catch (err) {
      alert((err as Error).message || 'Failed to duplicate question');
    }
  };

  const handleExport = async (id: string, title: string) => {
    try {
      const data = await apiClient<object>(`/questions/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message || 'Failed to export question');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      await apiClient.post('/questions/import', parsed);
      setIsImportOpen(false);
      setImportJsonText('');
      fetchQuestions();
    } catch (err) {
      setImportError((err as Error).message || 'Invalid question JSON structure');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await apiClient.post('/questions/seed');
      fetchQuestions();
    } catch (err) {
      alert((err as Error).message || 'Failed to seed defaults');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this question?')) return;
    try {
      await apiClient.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      alert((err as Error).message || 'Failed to archive question');
    }
  };

  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesDifficulty =
        difficultyFilter === 'all' || q.difficulty === difficultyFilter;

      return matchesSearch && matchesDifficulty;
    });
  }, [questions, search, difficultyFilter]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen bg-base p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-muted text-xs">/</span>
          <span className="font-semibold text-sm tracking-tight text-primary">Question Bank</span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSeedDefaults}>
            <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
            Seed Standard Problems
          </Button>

          <Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-3.5 h-3.5 mr-1" />
            Import JSON
          </Button>

          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Question
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-panel border border-border">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems by title, topic, or tag..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted font-medium shrink-0">Difficulty:</span>
            <div className="w-32">
              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
                options={[
                  { value: 'all', label: 'All Levels' },
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <div className="border border-border rounded-panel bg-surface overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No questions in your bank"
              description="Create interview questions with starter code and test cases, or seed standard problems."
              action={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleSeedDefaults}>
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
                    Seed Standard Problems
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Question
                  </Button>
                </div>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem Title</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Test Cases</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium text-xs text-primary">{q.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          q.difficulty === 'easy'
                            ? 'success'
                            : q.difficulty === 'medium'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {q.difficulty.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {q.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono px-1.5 py-0.5 bg-base border border-border rounded text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted font-mono">
                      {q.testCases.length} cases (
                      {q.testCases.filter((tc) => tc.isHidden).length} hidden)
                    </TableCell>
                    <TableCell className="text-xs text-muted font-mono">
                      {q.languages.length} langs
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(q.id)}
                          title="Duplicate question"
                          className="p-1.5 text-muted hover:text-primary rounded hover:bg-base transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(q.id, q.title)}
                          title="Export as JSON"
                          className="p-1.5 text-muted hover:text-primary rounded hover:bg-base transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(q.id)}
                          title="Archive question"
                          className="p-1.5 text-muted hover:text-danger rounded hover:bg-base transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* New Question Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl bg-surface border-border">
          <form onSubmit={handleCreateQuestion}>
            <DialogHeader>
              <DialogTitle>New Technical Question</DialogTitle>
              <DialogDescription>
                Define a technical interview question with markdown description and test cases.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label htmlFor="q-title" className="text-xs font-medium text-muted block mb-1">
                  Title
                </label>
                <Input
                  id="q-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Reverse Linked List"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="q-diff" className="text-xs font-medium text-muted block mb-1">
                    Difficulty
                  </label>
                  <Select
                    value={newDifficulty}
                    onValueChange={(val) => setNewDifficulty(val as QuestionDifficulty)}
                    options={[
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'hard', label: 'Hard' },
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="q-tags" className="text-xs font-medium text-muted block mb-1">
                    Tags (comma separated)
                  </label>
                  <Input
                    id="q-tags"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="e.g. linked-list, recursion"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="q-desc" className="text-xs font-medium text-muted block mb-1">
                  Problem Description (Markdown)
                </label>
                <textarea
                  id="q-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe problem requirements, examples, constraints..."
                  className="w-full p-2.5 bg-base border border-border rounded text-xs text-primary font-mono focus:border-accent focus:outline-none"
                  required
                />
              </div>

              {/* Test Cases Editor */}
              <div className="border border-border rounded p-3 bg-base space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Test Cases ({testCasesList.length})</span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted block mb-1">Input:</span>
                      <textarea
                        value={newTestInput}
                        onChange={(e) => setNewTestInput(e.target.value)}
                        placeholder="e.g. [1,2,3,4,5]"
                        rows={2}
                        className="w-full p-2 bg-surface border border-border rounded text-xs font-mono text-primary resize-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block mb-1">Expected Output:</span>
                      <textarea
                        value={newTestOutput}
                        onChange={(e) => setNewTestOutput(e.target.value)}
                        placeholder="e.g. [5,4,3,2,1]"
                        rows={2}
                        className="w-full p-2 bg-surface border border-border rounded text-xs font-mono text-primary resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newTestHidden}
                        onChange={(e) => setNewTestHidden(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-0"
                      />
                      <span>Mark as Hidden Evaluation Case</span>
                    </label>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddTestCase}
                      disabled={!newTestInput.trim() || !newTestOutput.trim()}
                    >
                      + Add Case
                    </Button>
                  </div>
                </div>

                {/* List of added test cases */}
                {testCasesList.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    {testCasesList.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-surface border border-border text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">#{idx + 1}</span>
                          <span className="text-muted">In: {tc.input}</span>
                          <span className="text-muted">Out: {tc.expectedOutput}</span>
                          {tc.isHidden && (
                            <Badge variant="warning">
                              <EyeOff className="w-3 h-3 mr-1" /> Hidden
                            </Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTestCase(idx)}
                          className="text-danger hover:underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Question
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import JSON Modal */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-md bg-surface border-border">
          <form onSubmit={handleImportSubmit}>
            <DialogHeader>
              <DialogTitle>Import Question from JSON</DialogTitle>
              <DialogDescription>
                Paste the exported question JSON payload to import it into your question bank.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-2">
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Paste {"question": {...}} or question object here...'
                rows={8}
                className="w-full p-2.5 bg-base border border-border rounded text-xs text-primary font-mono focus:border-accent focus:outline-none"
                required
              />
              {importError && (
                <p className="text-xs text-danger font-sans">{importError}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!importJsonText.trim()}>
                Import
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
