import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppWindowShell } from "@/components/features/app-window-shell";

type MailerWindowProps = {
  open: boolean;
  closing: boolean;
  title: string;
  closeLabel: string;
  fullLabel: string;
  senderLabel: string;
  subjectLabel: string;
  messageLabel: string;
  sendLabel: string;
  sender: string;
  subject: string;
  message: string;
  onChangeSender: (value: string) => void;
  onChangeSubject: (value: string) => void;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
};

export function MailerWindow({
  open,
  closing,
  title,
  closeLabel,
  fullLabel,
  senderLabel,
  subjectLabel,
  messageLabel,
  sendLabel,
  sender,
  subject,
  message,
  onChangeSender,
  onChangeSubject,
  onChangeMessage,
  onSend,
  zIndex,
  onFocus,
  onClose,
}: MailerWindowProps) {
  return (
    <AppWindowShell
      open={open}
      closing={closing}
      title={title}
      fullLabel={fullLabel}
      closeLabel={closeLabel}
      className="h-[80vh] w-full max-w-3xl rounded-xl border border-white/20 bg-[#23273a]/95 shadow-2xl"
      zIndex={zIndex}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="h-[calc(80vh-40px)] p-3">
        <div className="h-full rounded-lg border border-white/15 bg-black/20 p-3">
          <p className="mb-2 text-sm text-white/80">{sendLabel}</p>
          <div className="flex h-[calc(100%-1.75rem)] flex-col gap-2">
            <Input required value={sender} onChange={(event) => onChangeSender(event.target.value)} placeholder={senderLabel} />
            <Input required value={subject} onChange={(event) => onChangeSubject(event.target.value)} placeholder={subjectLabel} />
            <Textarea required value={message} onChange={(event) => onChangeMessage(event.target.value)} placeholder={messageLabel} className="min-h-[220px] flex-1" />
            <Button onClick={onSend} className="w-fit">
              {sendLabel}
            </Button>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}
