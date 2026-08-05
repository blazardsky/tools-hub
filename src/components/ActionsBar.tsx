import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticky tool chrome at the bottom of a React island. No full-bleed. */
export function ActionsBar({
	children,
	className,
	role = "toolbar",
}: {
	children: ReactNode;
	className?: string;
	role?: string;
}) {
	return (
		<div
			role={role}
			className={cn(
				"sticky bottom-0 z-20 mt-4 flex items-center justify-between gap-4 border-t border-border bg-background px-4 py-1 text-xs leading-snug",
				className,
			)}
		>
			{children}
		</div>
	);
}
