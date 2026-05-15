import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  badge?: string;
}

export function ToolCard({ title, description, icon, children, className, badge }: Props) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold leading-tight">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
