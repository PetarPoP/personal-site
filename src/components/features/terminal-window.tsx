import { useState } from "react";
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
  const [lines, setLines] = useState<string[]>(["pop@desktop:~$"]);
  const [input, setInput] = useState("");

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
      <div className="terminal-body h-[calc(70vh-40px)] p-3">
        <div className="flex h-full flex-col rounded-lg border border-white/15 bg-[#0a0f1a] p-3">
          <div className="flex-1 space-y-1 overflow-auto font-mono text-sm text-[#8df7b3]">
            {lines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
            <span className="font-mono text-sm text-[#8df7b3]">pop@desktop:~$</span>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                const next = input.trim();
                if (!next) {
                  setLines((prev) => [...prev, "pop@desktop:~$"]);
                  setInput("");
                  return;
                }
                setLines((prev) => [...prev, `pop@desktop:~$ ${next}`, next]);
                setInput("");
              }}
              className="h-8 bg-white/5 font-mono text-[#8df7b3] placeholder:text-[#8df7b3]/45"
              placeholder="Type message..."
            />
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}
