import { Toaster as Sonner, toast } from 'sonner'
import { Check, Info, TriangleAlert, X } from 'lucide-react'

// Small system notifications ("sonner" toasts) in the POP/OS style:
// amber edge when something worked, orange-red when it couldn't be done.
export { toast }

export function Toaster({ mobile }: { mobile: boolean }) {
  return (
    <Sonner
      position={mobile ? 'top-center' : 'bottom-right'}
      offset={mobile ? 14 : { bottom: 22, right: 16 }}
      mobileOffset={14}
      duration={3200}
      visibleToasts={4}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[min(340px,calc(100vw-28px))] items-start gap-2.5 border border-l-4 border-teal bg-ink px-3.5 py-3 font-mono text-xs text-paper shadow-[0_18px_40px_rgba(0,0,0,.55)]',
          title: 'font-medium leading-[1.45]',
          description: 'mt-0.5 text-[11px] leading-[1.45] text-muted',
          icon: 'mt-px flex-none text-[13px] leading-none',
          success: 'border-l-amber [&_[data-icon]]:text-amber',
          error: 'border-l-signal [&_[data-icon]]:text-signal',
          info: 'border-l-mist [&_[data-icon]]:text-mist',
        },
      }}
      icons={{ success: <Check className="size-[15px]" />, error: <X className="size-[15px]" />, info: <Info className="size-[15px]" />, warning: <TriangleAlert className="size-[15px]" /> }}
    />
  )
}
