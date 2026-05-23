import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLike, type LikeItemType } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

type Props = {
  itemType: LikeItemType;
  itemId: string;
  size?: "sm" | "icon" | "default";
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
  showLabel?: boolean;
};

export function LikeButton({ itemType, itemId, size = "icon", variant = "ghost", className, showLabel }: Props) {
  const { liked, loading, toggle } = useLike(itemType, itemId);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      aria-label={liked ? "הסר לייק" : "סמן לייק"}
      className={cn(liked && "text-rose-500 hover:text-rose-600", className)}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      {showLabel && <span className="me-1">{liked ? "אהבתי" : "אהבתי"}</span>}
    </Button>
  );
}
