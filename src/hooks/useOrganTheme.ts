import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TYROS_THEME, type OrganTheme, mergeTheme } from "@/lib/organTheme";

const cache = new Map<string, OrganTheme>();

export function useOrganTheme(modelId: string | null | undefined) {
  const [theme, setTheme] = useState<OrganTheme>(DEFAULT_TYROS_THEME);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modelId) { setTheme(DEFAULT_TYROS_THEME); return; }
    if (cache.has(modelId)) { setTheme(cache.get(modelId)!); return; }
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("organ_ui_themes" as any)
        .select("theme")
        .eq("model_id", modelId)
        .maybeSingle();
      const merged = mergeTheme(DEFAULT_TYROS_THEME, (data as any)?.theme ?? null);
      cache.set(modelId, merged);
      if (mounted) { setTheme(merged); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [modelId]);

  return { theme, loading };
}

export function clearOrganThemeCache(modelId?: string) {
  if (modelId) cache.delete(modelId);
  else cache.clear();
}
