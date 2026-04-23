import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollow, type FollowTargetType } from "@/hooks/useFollow";
import { cn } from "@/lib/utils";

type Props = {
  targetType: FollowTargetType;
  targetId: string;
  size?: "sm" | "default";
  className?: string;
};

export function FollowButton({ targetType, targetId, size = "sm", className }: Props) {
  const { following, loading, toggle } = useFollow(targetType, targetId);
  return (
    <Button
      type="button"
      size={size}
      variant={following ? "secondary" : "default"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={cn(!following && "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground", className)}
    >
      {following ? <><UserCheck className="ml-1 h-4 w-4" />עוקב</> : <><UserPlus className="ml-1 h-4 w-4" />עקוב</>}
    </Button>
  );
}
