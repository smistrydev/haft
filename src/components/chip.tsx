import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full px-3 text-xs font-medium transition-[background-color,color,opacity] duration-150",
        active ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}
