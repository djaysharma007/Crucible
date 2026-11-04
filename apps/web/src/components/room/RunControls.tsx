'use client';

import * as React from 'react';
import { Play, Terminal, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguage, RunCustomResponse } from '@crucible/shared';

interface RunControlsProps {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onRunTests: () => Promise<void>;
  onRunCustom: (stdin: string) => Promise<RunCustomResponse>;
  isRunning: boolean;
  disabled?: boolean;
}

export function RunControls({
  language,
  onLanguageChange,
  onRunTests,
  onRunCustom,
  isRunning,
  disabled = false,
}: RunControlsProps) {
  const [isStdinOpen, setIsStdinOpen] = React.useState(false);
  const [stdinValue, setStdinValue] = React.useState('');
  const [isCustomRunning, setIsCustomRunning] = React.useState(false);
  const [customResult, setCustomResult] = React.useState<RunCustomResponse | null>(null);

  const handleCustomExecute = async () => {
    try {
      setIsCustomRunning(true);
      const res = await onRunCustom(stdinValue);
      setCustomResult(res);
    } catch {
      // Handled by caller toast/error
    } finally {
      setIsCustomRunning(false);
    }
  };

  return (
    <div className="flex flex-col border-t border-[#393E41] bg-[#1E2019] text-[#D3D0CB]">
      {/* Stdin Drawer */}
      {isStdinOpen && (
        <div className="p-3 border-b border-[#393E41] bg-[#1E2019]/95 text-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#D3D0CB]/70">
            <span className="flex items-center gap-1.5 font-medium text-[#D3D0CB]">
              <Terminal className="w-3.5 h-3.5 text-[#587B7F]" />
              Run with Custom Standard Input (stdin)
            </span>
            <button
              type="button"
              onClick={() => setIsStdinOpen(false)}
              className="text-[#D3D0CB]/50 hover:text-[#D3D0CB]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-[#D3D0CB]/60 mb-1">Standard Input:</div>
              <textarea
                value={stdinValue}
                onChange={(e) => setStdinValue(e.target.value)}
                placeholder="Enter custom input to pass via stdin..."
                rows={4}
                className="w-full p-2 bg-[#393E41]/30 border border-[#393E41] rounded text-xs font-mono text-[#D3D0CB] focus:border-[#E2C044] focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleCustomExecute}
                disabled={isCustomRunning || disabled}
                className="mt-2 px-3 py-1 bg-[#587B7F] hover:bg-[#587B7F]/80 text-[#1E2019] font-medium text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCustomRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" /> Execute Input
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="text-[11px] text-[#D3D0CB]/60 mb-1">Custom Run Output:</div>
              {customResult ? (
                <div className="p-2 bg-[#393E41]/20 border border-[#393E41] rounded h-28 overflow-y-auto text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#D3D0CB]/50 pb-1 border-b border-[#393E41]/40">
                    <span>Status: {customResult.status}</span>
                    <span>
                      {customResult.runtimeMs}ms | {customResult.memoryKb}KB
                    </span>
                  </div>
                  {customResult.stdout && (
                    <div className="text-[#D3D0CB] whitespace-pre-wrap">{customResult.stdout}</div>
                  )}
                  {customResult.stderr && (
                    <div className="text-rose-400 whitespace-pre-wrap">{customResult.stderr}</div>
                  )}
                </div>
              ) : (
                <div className="p-2 border border-dashed border-[#393E41] rounded h-28 flex items-center justify-center text-[11px] text-[#D3D0CB]/40">
                  Execute code with custom input to view output
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1E2019]">
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="text-xs text-[#D3D0CB]/60 font-mono">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-mono bg-[#393E41] text-[#D3D0CB] border border-[#587B7F] rounded focus:border-[#E2C044] focus:outline-none transition-colors"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'cpp'
                  ? 'C++ (GCC)'
                  : lang === 'javascript'
                  ? 'JavaScript (Node.js)'
                  : lang === 'typescript'
                  ? 'TypeScript'
                  : lang === 'python'
                  ? 'Python 3'
                  : 'Java'}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsStdinOpen(!isStdinOpen)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-[#393E41] hover:border-[#587B7F] rounded text-[#D3D0CB]/80 hover:text-[#D3D0CB] transition-colors"
          >
            <Terminal className="w-3 h-3 text-[#587B7F]" />
            <span>Custom Input</span>
            {isStdinOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunTests}
            disabled={isRunning || disabled}
            className="px-4 py-1.5 text-xs font-medium font-mono bg-[#E2C044] hover:bg-[#E2C044]/90 text-[#1E2019] rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Tests...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Tests
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
