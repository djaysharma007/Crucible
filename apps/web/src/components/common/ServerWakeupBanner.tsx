'use client';

import * as React from 'react';
import { Loader2, Server, CheckCircle2 } from 'lucide-react';

interface ServerWakeupBannerProps {
  onAwake?: () => void;
}

export function ServerWakeupBanner({ onAwake }: ServerWakeupBannerProps) {
  const [isWaking, setIsWaking] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [isAwake, setIsAwake] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function checkHealth() {
      try {
        const res = await fetch('/api/v1/health', { method: 'GET' });
        if (res.ok) {
          if (isWaking) {
            setIsAwake(true);
            setTimeout(() => {
              setIsWaking(false);
              onAwake?.();
            }, 1200);
          }
          return true;
        }
      } catch {
        // Cold start or server sleeping
      }
      return false;
    }

    // Check after initial 2.5s if server hasn't answered
    const initialCheck = setTimeout(async () => {
      const awake = await checkHealth();
      if (!awake && !isCancelled) {
        setIsWaking(true);
        timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
        interval = setInterval(async () => {
          const ok = await checkHealth();
          if (ok && interval) {
            clearInterval(interval);
          }
        }, 3000);
      }
    }, 2500);

    return () => {
      isCancelled = true;
      clearTimeout(initialCheck);
      if (interval) clearInterval(interval);
      if (timer) clearInterval(timer);
    };
  }, [isWaking, onAwake]);

  if (!isWaking) return null;

  return (
    <aside
      aria-label="Server status alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm p-4 bg-[#1E2019] border border-amber-500/40 rounded-panel shadow-2xl text-xs font-mono text-[#D3D0CB] space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold text-amber-400">
          <Server className="w-4 h-4 text-amber-400" />
          {isAwake ? 'Server Online' : 'Waking Up Cloud Server'}
        </span>
        <span className="text-[10px] text-muted">{elapsed}s</span>
      </div>

      <p className="text-[11px] text-[#D3D0CB]/80 font-sans leading-relaxed">
        {isAwake
          ? 'API service is active and responsive. Resuming operation...'
          : 'Render free-tier instances sleep when idle. Cold boot typically takes 30–60 seconds.'}
      </p>

      <div className="flex items-center gap-2 pt-1 border-t border-[#393E41]">
        {isAwake ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connection restored!</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Retrying health endpoint...</span>
          </div>
        )}
      </div>
    </aside>
  );
}
