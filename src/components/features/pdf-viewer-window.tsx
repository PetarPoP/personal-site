import { Button } from "@/components/ui/button";
import { AppWindowShell } from "@/components/features/app-window-shell";

type PdfViewerWindowProps = {
  open: boolean;
  closing: boolean;
  title: string;
  fullLabel: string;
  closeLabel: string;
  fileUrl?: string;
  fallbackMessage: string;
  openInTabLabel: string;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
};

export function PdfViewerWindow({
  open,
  closing,
  title,
  fullLabel,
  closeLabel,
  fileUrl,
  fallbackMessage,
  openInTabLabel,
  zIndex,
  onFocus,
  onClose,
}: PdfViewerWindowProps) {
  return (
    <AppWindowShell
      open={open}
      closing={closing}
      title={title}
      fullLabel={fullLabel}
      closeLabel={closeLabel}
      className="h-[80vh] w-full max-w-5xl rounded-xl border border-white/20 bg-[#23273a]/95 shadow-2xl"
      zIndex={zIndex}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="pdf-viewer-body h-[calc(80vh-40px)] p-3">
        {fileUrl ? (
          <iframe title={title} src={fileUrl} className="h-full w-full rounded border border-white/15 bg-white" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded border border-white/15 bg-black/20 text-sm text-white/80">
            <p>{fallbackMessage}</p>
            <Button size="sm" variant="subtle" onClick={() => window.open("/cv.pdf", "_blank", "noopener,noreferrer")}>
              {openInTabLabel}
            </Button>
          </div>
        )}
        </div>
    </AppWindowShell>
  );
}
