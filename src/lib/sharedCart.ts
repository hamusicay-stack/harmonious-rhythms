import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/contexts/CartContext";

// Only "full product" types are shareable. Variations / per-keyboard CPI items
// (requires_info_file = true) are explicitly forbidden.
const SHAREABLE_TYPES = new Set(["rhythm_set", "physical", "digital", "hybrid"]);

export function isShareableItem(item: CartItem): boolean {
  if (item.requires_info_file) return false;
  return SHAREABLE_TYPES.has(item.product_type);
}

// Encoded as `r:<setId>` for rhythm sets, `s:<productId>` for shop products.
export function encodeSharedCart(items: CartItem[]): string {
  const tokens: string[] = [];
  for (const it of items) {
    if (!isShareableItem(it)) continue;
    if (it.product_type === "rhythm_set") {
      const raw = it.id.startsWith("rhythm:") ? it.id.slice(7) : it.id;
      tokens.push(`r:${raw}`);
    } else {
      tokens.push(`s:${it.id}`);
    }
  }
  return tokens.join(",");
}

export type SharedFetchedItem = Omit<CartItem, "qty">;

export async function fetchSharedCartItems(token: string): Promise<SharedFetchedItem[]> {
  const tokens = token.split(",").map((t) => t.trim()).filter(Boolean);
  const rhythmIds: string[] = [];
  const shopIds: string[] = [];
  for (const t of tokens) {
    if (t.startsWith("r:")) rhythmIds.push(t.slice(2));
    else if (t.startsWith("s:")) shopIds.push(t.slice(2));
  }

  const results: SharedFetchedItem[] = [];

  if (rhythmIds.length) {
    const { data } = await supabase
      .from("rhythm_sets")
      .select("id, set_name, price, cover_image_url, requires_info_file, info_file_extension")
      .in("id", rhythmIds);
    for (const r of (data ?? []) as any[]) {
      if (r.requires_info_file) continue; // forbidden: partial / per-keyboard
      results.push({
        id: `rhythm:${r.id}`,
        slug: r.id,
        title: r.set_name,
        price: Number(r.price) || 0,
        image: r.cover_image_url ?? null,
        product_type: "rhythm_set",
        requires_info_file: false,
        info_file_extension: r.info_file_extension ?? null,
      });
    }
  }

  if (shopIds.length) {
    const { data } = await supabase
      .from("shop_products")
      .select("id, slug, title, price, sale_price, main_image, product_type")
      .in("id", shopIds);
    for (const p of (data ?? []) as any[]) {
      if (!SHAREABLE_TYPES.has(p.product_type)) continue;
      const price = Number(p.sale_price ?? p.price) || 0;
      results.push({
        id: p.id,
        slug: p.slug ?? p.id,
        title: p.title,
        price,
        image: p.main_image ?? null,
        product_type: p.product_type,
      });
    }
  }

  return results;
}
