import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollow, type FollowTargetType } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { FollowActivityDialog } from "@/components/FollowActivityDialog";

type Props = {
  targetType: FollowTargetType;
  targetId: string;
  targetName?: string;
  size?: "sm" | "default";
  className?: string;
};

export function FollowButton({ targetType, targetId, targetName, size = "sm", className }: Props) {
  const { user } = useAuth();
  const { following, loading, toggle } = useFollow(targetType, targetId);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasFollowing = following;
    await toggle();
    // After successful first follow, prompt about activity notifications
    if (!wasFollowing && user) {
      let seen = false;
      try { seen = !!localStorage.getItem("follow_activity_prompt_seen"); } catch { /* ignore */ }
      if (!seen && (targetType === "user" || targetType === "shorts_creator" || targetType === "marketplace_seller")) {
        setShowActivityDialog(true);
      }
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={following ? "secondary" : "default"}
        onClick={handleClick}
        disabled={loading}
        className={cn(!following && "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground", className)}
      >
        {following ? <><UserCheck className="ml-1 h-4 w-4" />עוקב</> : <><UserPlus className="ml-1 h-4 w-4" />עקוב</>}
      </Button>
      <FollowActivityDialog open={showActivityDialog} onOpenChange={setShowActivityDialog} targetName={targetName} />
    </>
  );
}
