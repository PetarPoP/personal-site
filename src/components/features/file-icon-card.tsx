import { cn } from "@/lib/utils";
import type { PointerEvent } from "react";

type FileIconCardProps = {
  itemId?: string;
  label: string;
  icon?: string;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  dark?: boolean;
};

export function FileIconCard({
  itemId,
  label,
  icon = "📄",
  selected = false,
  onSelect,
  onOpen,
  onPointerDown,
  dark = true,
}: FileIconCardProps) {
  return (
    <button
      type="button"
      data-file-card="true"
      data-item-id={itemId}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
      onPointerDown={onPointerDown}
      className={cn(
        "group cursor-pointer rounded-lg border p-3 text-center text-sm",
        selected
          ? dark
            ? "border-white/35 bg-white/10"
            : "border-black/20 bg-black/8"
          : dark
            ? "border-transparent hover:border-white/20 hover:bg-white/8"
            : "border-transparent hover:border-black/20 hover:bg-black/8",
      )}
    >
      <div
        className={cn(
          "mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-lg text-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition group-hover:brightness-110",
          dark ? "bg-[#2f5d88]" : "bg-[#3f6b96]",
        )}
      >
        {icon}
      </div>
      <p className={cn("truncate", dark ? "text-white/90" : "text-[#201b38]")}>{label}</p>
    </button>
  );
}
