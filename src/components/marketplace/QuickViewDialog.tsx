import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowLeft, Flame } from "lucide-react";
import { ReportListingDialog } from "./ReportListingDialog";

type QuickViewListing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  city: string | null;
  region: string | null;
  images: string[] | null;
  audio_url?: string | null;
  is_urgent?: boolean;
  item_condition?: string;
};

interface Props {
  listing: QuickViewListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickViewDialog({ listing, open, onOpenChange }: Props) {
  if (!listing) return null;
  const cover = listing.images?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl">
        <div className="relative aspect-video bg-gradient-to-br from-secondary to-muted overflow-hidden">
          {cover ? (
            <img src={cover} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">אין תמונה</div>
          )}
          {listing.is_urgent && (
            <Badge className="absolute top-3 right-3 gap-1 shadow-lg bg-rose-500 hover:bg-rose-600">
              <Flame className="h-3 w-3" />מכירה דחופה
            </Badge>
          )}
        </div>
        <div className="p-6 space-y-4">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-display">{listing.title}</DialogTitle>
            {(listing.brand || listing.model) && (
              <div className="text-sm text-muted-foreground">
                {[listing.brand, listing.model].filter(Boolean).join(" · ")}
              </div>
            )}
          </DialogHeader>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-3xl font-display font-bold text-gradient-gold">
              ₪{Number(listing.price).toLocaleString()}
            </div>
            {(listing.city || listing.region) && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />{listing.city || listing.region}
              </div>
            )}
          </div>

          {listing.item_condition && (
            <div className="text-sm">
              <span className="text-muted-foreground">מצב הכלי: </span>
              <span className="font-medium">{listing.item_condition}</span>
            </div>
          )}

          {listing.audio_url && (
            <div className="space-y-2">
              <div className="text-sm font-medium">🎵 השמעה מהמוכר</div>
              <audio controls src={listing.audio_url} className="w-full" />
            </div>
          )}

          <div className="flex gap-2 pt-2 flex-wrap">
            <Button asChild className="flex-1 gap-2 min-w-[180px]">
              <Link to="/marketplace/$listingId" params={{ listingId: listing.id }}>
                לדף המודעה המלא
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>סגור</Button>
          </div>
          <div className="flex justify-center pt-1">
            <ReportListingDialog listingId={listing.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
