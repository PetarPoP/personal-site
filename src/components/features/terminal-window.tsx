import { useEffect, useMemo, useRef, useState } from "react";
import { AppWindowShell } from "@/components/features/app-window-shell";
import { Input } from "@/components/ui/input";

type TerminalWindowProps = {
  open: boolean;
  closing: boolean;
  title: string;
  closeLabel: string;
  fullLabel: string;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
};

export function TerminalWindow({
  open,
  closing,
  title,
  closeLabel,
  fullLabel,
  zIndex,
  onFocus,
  onClose,
}: TerminalWindowProps) {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("~");
  const [isRunning, setIsRunning] = useState(false);
  const prompt = `pop@desktop:${cwd}$`;

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines, isRunning]);
  useEffect(() => {
    if (!open || isRunning) {
      return;
    }
    inputRef.current?.focus();
  }, [isRunning, open]);

  return (
    <AppWindowShell
      open={open}
      closing={closing}
      title={title}
      fullLabel={fullLabel}
      closeLabel={closeLabel}
      className="h-[70vh] w-full max-w-3xl rounded-xl border border-white/20 bg-[#101420]/95 shadow-2xl"
      zIndex={zIndex}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="terminal-body flex-1 min-h-0 p-3">
        <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/15 bg-[#0a0f1a] p-3">
          <div ref={outputRef} className="flex-1 space-y-1 overflow-auto font-mono text-sm text-[#8df7b3]">
            {lines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
            {isRunning ? <p className="text-[#8df7b3]/70">Running...</p> : null}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={async (event) => {
                if (event.key !== "Enter") {
                  return;
                }
                if (isRunning) {
                  return;
                }
                const next = input.trim();
                if (!next) {
                  return;
                }
                setInput("");
                setIsRunning(true);
                setLines((prev) => [...prev, `${prompt} ${next}`]);
                try {
                  const response = await fetch("/api/terminal", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      sessionId,
                      command: next,
                    }),
                  });
                  const data = (await response.json()) as {
                    output?: string;
                    cwd?: string;
                    error?: string;
                    exitCode?: number;
                    clear?: boolean;
                  };
                  if (!response.ok) {
                    setLines((prev) => [...prev, data.error ?? "Terminal execution failed."]);
                    return;
                  }
                  if (data.cwd) {
                    setCwd(data.cwd);
                  }
                  if (data.clear) {
                    setLines([]);
                  }
                  const output = data.output;
                  if (typeof output === "string" && output.length > 0) {
                    setLines((prev) => [...prev, output]);
                  }
                  if ((data.exitCode ?? 0) !== 0) {
                    setLines((prev) => [...prev, `[exit ${data.exitCode}]`]);
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Unknown terminal error.";
                  setLines((prev) => [...prev, message]);
                } finally {
                  setIsRunning(false);
                  window.requestAnimationFrame(() => {
                    inputRef.current?.focus();
                  });
                }
              }}
              className="h-8 w-full bg-white/5 font-mono text-[#8df7b3] placeholder:text-[#8df7b3]/45"
              placeholder=""
              disabled={isRunning}
            />
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}
