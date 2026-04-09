import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuContent = DropdownMenuPrimitive.Content;
const DropdownMenuItem = DropdownMenuPrimitive.Item;

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuContent
        className={cn("z-50 min-w-52 rounded-md border border-white/20 bg-[#20263a] p-1 text-white shadow-2xl", className)}
        {...props}
      />
    </DropdownMenuPortal>
  );
}

function ContextMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem className={cn("cursor-pointer rounded px-3 py-2 text-sm outline-none hover:bg-white/10", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, ContextMenuContent, ContextMenuItem };
