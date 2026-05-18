import { useNavigate } from "@tanstack/react-router";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function ImpersonationBanner() {
  const { impersonated, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();
  if (!impersonated) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate({ to: "/admin" });
  };

  return (
    <div
      className="sticky top-0 z-[9999] flex items-center justify-between gap-3 border-b border-destructive/40 bg-destructive px-4 py-2 text-destructive-foreground shadow-lg"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="truncate">
          מצב השתלטות מופעל: <strong>{impersonated.name}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1 px-2 text-xs"
        onClick={handleExit}
      >
        <X className="h-3.5 w-3.5" />
        חזור לניהול
      </Button>
    </div>
  );
}
