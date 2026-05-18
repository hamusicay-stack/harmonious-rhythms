import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, MessageSquare, ShoppingBag, Tags, Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type ForumTopicRow = {
  target_id: string;
  forum_topics: { id: string; title: string | null; slug: string | null } | null;
};
type WishlistRow = {
  product_id: string;
  shop_products: { id: string; title: string | null; price: number | null; image_url?: string | null } | null;
};
type MarketLikeRow = {
  listing_id: string;
  marketplace_listings: { id: string; title: string | null; price: number | null } | null;
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function BookmarksTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<ForumTopicRow[]>([]);
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [listings, setListings] = useState<MarketLikeRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [t, w, l] = await Promise.all([
        supabase
          .from("forum_subscriptions")
          .select("target_id, forum_topics!inner(id,title,slug)")
          .eq("user_id", userId)
          .eq("target_type", "topic")
          .limit(50),
        supabase
          .from("shop_wishlists")
          .select("product_id, shop_products(id,title,price,image_url)")
          .eq("user_id", userId)
          .limit(50),
        supabase
          .from("marketplace_likes")
          .select("listing_id, marketplace_listings(id,title,price)")
          .eq("user_id", userId)
          .limit(50),
      ]);
      if (!alive) return;
      setTopics((t.data as unknown as ForumTopicRow[]) ?? []);
      setWishlist((w.data as unknown as WishlistRow[]) ?? []);
      setListings((l.data as unknown as MarketLikeRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-amber-500/5 to-transparent p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/10 p-2">
            <Bookmark className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">השמירות שלי</h2>
            <p className="text-sm text-muted-foreground">
              כל מה ששמרת במקום אחד — אשכולות, מוצרים ומודעות.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="forum">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forum" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            אשכולות ({topics.length})
          </TabsTrigger>
          <TabsTrigger value="shop" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" />
            רשימת קניות ({wishlist.length})
          </TabsTrigger>
          <TabsTrigger value="market" className="gap-1.5">
            <Tags className="h-4 w-4" />
            מודעות יד 2 ({listings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forum" className="mt-4 space-y-2">
          {topics.length === 0 ? (
            <EmptyState text="עדיין לא נרשמת לאשכולות. עבור לפורום והירשם לעדכונים על דיונים שמעניינים אותך." />
          ) : (
            topics.map((row) => (
              <Card key={row.target_id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {row.forum_topics?.title ?? "אשכול"}
                  </div>
                </div>
                {row.forum_topics?.slug && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/forum/topic/$slug" params={{ slug: row.forum_topics.slug }}>
                      פתח <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="shop" className="mt-4 space-y-2">
          {wishlist.length === 0 ? (
            <EmptyState text="רשימת הקניות ריקה. סמן ❤ במוצרים בחנות כדי לשמור אותם לכאן." />
          ) : (
            wishlist.map((row) => (
              <Card key={row.product_id} className="flex items-center justify-between p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {row.shop_products?.image_url && (
                    <img
                      src={row.shop_products.image_url}
                      alt=""
                      className="h-12 w-12 rounded-md border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {row.shop_products?.title ?? "מוצר"}
                    </div>
                    {row.shop_products?.price != null && (
                      <div className="text-sm text-amber-600 dark:text-amber-300">
                        ₪{row.shop_products.price}
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/shop">
                    פתח <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="market" className="mt-4 space-y-2">
          {listings.length === 0 ? (
            <EmptyState text="לא שמרת מודעות יד 2 עדיין. סמן ❤ במודעות שמעניינות אותך." />
          ) : (
            listings.map((row) => (
              <Card key={row.listing_id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {row.marketplace_listings?.title ?? "מודעה"}
                  </div>
                  {row.marketplace_listings?.price != null && (
                    <div className="text-sm text-amber-600 dark:text-amber-300">
                      ₪{row.marketplace_listings.price}
                    </div>
                  )}
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link
                    to="/marketplace/$listingId"
                    params={{ listingId: row.listing_id }}
                  >
                    פתח <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
