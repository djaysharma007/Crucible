'use client';

import * as React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { MonacoBinding } from 'y-monaco';
import { Select, Badge } from '@crucible/ui';
import { Lock, Unlock, Users } from 'lucide-react';
import { SupportedLanguage } from '@crucible/shared';
import { fetchCollabToken } from '@/lib/collab/collab-token';

interface CodeEditorProps {
  documentName: string;
  interviewId?: string;
  authToken?: string | (() => Promise<string>);
  userName: string;
  isInterviewer: boolean;
  isLocked: boolean;
  language: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  starterCode?: string;
  onCodeChange?: (code: string) => void;
}

const DEFAULT_STARTER_CODE: Record<SupportedLanguage, string> = {
  javascript: '// JavaScript Starter\nfunction solution() {\n  // Write your code here\n}\n',
  typescript: '// TypeScript Starter\nfunction solution(): void {\n  // Write your code here\n}\n',
  python: '# Python 3 Starter\ndef solution():\n    pass\n',
  java: '// Java Starter\nclass Solution {\n    public static void main(String[] args) {\n        // Write code here\n    }\n}\n',
  cpp: '// C++ Starter\n#include <iostream>\n\nint main() {\n    // Write code here\n    return 0;\n}\n',
};

export function CodeEditor({
  documentName,
  interviewId,
  authToken,
  userName,
  isInterviewer,
  isLocked,
  language,
  onLanguageChange,
  starterCode,
  onCodeChange,
}: CodeEditorProps) {
  const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:4001';
  const editorRef = React.useRef<unknown>(null);
  const bindingRef = React.useRef<MonacoBinding | null>(null);
  const providerRef = React.useRef<HocuspocusProvider | null>(null);
  const docRef = React.useRef<Y.Doc | null>(null);

  const [connectedUsers, setConnectedUsers] = React.useState<string[]>([]);
  const [syncStatus, setSyncStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );

  const readOnly = !isInterviewer && isLocked;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom Crucible Monaco dark theme
    monaco.editor.defineTheme('crucible-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8B8E87', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'E2C044' },
        { token: 'string', foreground: '6FAF7E' },
        { token: 'number', foreground: '6B9499' },
        { token: 'type', foreground: 'E2C044' },
      ],
      colors: {
        'editor.background': '#1E2019',
        'editor.foreground': '#D3D0CB',
        'editor.lineHighlightBackground': '#282B23',
        'editorCursor.foreground': isInterviewer ? '#E2C044' : '#587B7F',
        'editor.selectionBackground': '#393E4180',
        'editorLineNumber.foreground': '#5A5E5B',
        'editorLineNumber.activeForeground': '#D3D0CB',
      },
    });

    monaco.editor.setTheme('crucible-dark');

    // Setup Yjs Document and Hocuspocus Provider
    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const provider = new HocuspocusProvider({
      url: collabUrl,
      name: documentName,
      document: ydoc,
      token: authToken || (interviewId ? async () => fetchCollabToken(interviewId) : 'room_participant'),
      onConnect: () => setSyncStatus('connected'),
      onDisconnect: () => setSyncStatus('disconnected'),
    });
    providerRef.current = provider;

    const ytext = ydoc.getText('monaco');

    // Populate starter code if document is empty
    if (ytext.toString().length === 0) {
      const codeToInsert = starterCode || DEFAULT_STARTER_CODE[language] || '';
      ytext.insert(0, codeToInsert);
    }

    // Inform initial code
    onCodeChange?.(ytext.toString());

    // Listen to text changes
    ytext.observe(() => {
      onCodeChange?.(ytext.toString());
    });

    // Bind Monaco editor to Yjs CRDT and awareness
    const awareness = provider.awareness;
    const binding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      awareness || undefined,
    );
    bindingRef.current = binding;

    if (awareness) {
      // Set local awareness state (name and cursor color)
      awareness.setLocalStateField('user', {
        name: userName,
        color: isInterviewer ? '#E2C044' : '#587B7F',
      });

      // Track active connected participants
      awareness.on('change', () => {
        const states = awareness.getStates();
        const names: string[] = [];
        states.forEach((state) => {
          const u = (state as { user?: { name?: string } })?.user;
          if (u?.name) names.push(u.name);
        });
        setConnectedUsers(Array.from(new Set(names)));
      });
    }
  };

  React.useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
    };
  }, [documentName]);

  return (
    <div className="flex flex-col h-full w-full rounded-panel border border-border bg-base overflow-hidden">
      {/* Editor Control Bar */}
      <div className="h-10 border-b border-border bg-surface/70 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Select
              value={language}
              onValueChange={(val) => onLanguageChange?.(val as SupportedLanguage)}
              disabled={readOnly}
              options={[
                { value: 'typescript', label: 'TypeScript' },
                { value: 'javascript', label: 'JavaScript' },
                { value: 'python', label: 'Python 3' },
                { value: 'java', label: 'Java' },
                { value: 'cpp', label: 'C++' },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 text-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-success'
                  : syncStatus === 'connecting'
                    ? 'bg-warning'
                    : 'bg-danger'
              }`}
            />
            <span className="capitalize">{syncStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {readOnly && (
            <Badge variant="warning">
              <Lock className="w-3 h-3 mr-1" />
              Editor Locked
            </Badge>
          )}

          {!readOnly && isLocked && (
            <Badge variant="default">
              <Unlock className="w-3 h-3 mr-1" />
              Interviewer Access
            </Badge>
          )}

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-control bg-base border border-border text-muted">
            <Users className="w-3.5 h-3.5" />
            <span>{connectedUsers.length}</span>
          </div>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          theme="crucible-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            cursorBlinking: 'smooth',
            wordWrap: 'on',
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}
