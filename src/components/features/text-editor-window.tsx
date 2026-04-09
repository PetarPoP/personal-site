import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppWindowShell } from "@/components/features/app-window-shell";

type TextEditorWindowProps = {
  open: boolean;
  closing: boolean;
  fileName: string;
  saveLabel: string;
  closeLabel: string;
  fullLabel: string;
  saveStatusLabel: string;
  fileNameDraft: string;
  value: string;
  onChange: (value: string) => void;
  onChangeFileNameDraft: (value: string) => void;
  onSave: () => void;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
};

export function TextEditorWindow({
  open,
  closing,
  fileName,
  saveLabel,
  closeLabel,
  fullLabel,
  saveStatusLabel,
  fileNameDraft,
  value,
  onChange,
  onChangeFileNameDraft,
  onSave,
  zIndex,
  onFocus,
  onClose,
}: TextEditorWindowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setIsRenaming(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }
    renameInputRef.current?.select();
  }, [isRenaming]);

  return (
    <AppWindowShell
      open={open}
      closing={closing}
      title={fileName}
      titleContent={
        isRenaming ? (
          <Input
            ref={renameInputRef}
            value={fileNameDraft}
            onChange={(event) => onChangeFileNameDraft(event.target.value)}
            onBlur={() => setIsRenaming(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                setIsRenaming(false);
              }
            }}
            className="h-7 min-w-40 bg-white/10 text-xs text-white"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className="cursor-text rounded px-1 py-0.5 text-left text-xs text-white/95 hover:bg-white/10"
          >
            {fileName}
          </button>
        )
      }
      fullLabel={fullLabel}
      closeLabel={closeLabel}
      className="h-[80vh] w-full max-w-3xl rounded-xl border border-white/20 bg-[#23273a]/95 shadow-2xl"
      zIndex={zIndex}
      onFocus={onFocus}
      headerContent={
        <Button size="sm" variant="subtle" onClick={onSave}>
          {saveLabel} ({saveStatusLabel})
        </Button>
      }
      onClose={onClose}
    >
      <div className="text-editor-body h-[calc(80vh-40px)] p-3">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full w-full resize-none"
        />
      </div>
    </AppWindowShell>
  );
}
