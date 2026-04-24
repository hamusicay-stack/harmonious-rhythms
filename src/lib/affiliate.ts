// Affiliate cookie tracking helpers (client-side only)
import { supabase } from "@/integrations/supabase/client";

const COOKIE_REF = "ref_aff";
const COOKIE_VID = "ref_vid";
const DEFAULT_DAYS = 30;

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function genVisitorId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Capture ?ref=CODE from URL into a cookie + log click. Call once on app boot. */
export async function captureAffiliateRef() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (!code) return;

  // Find the affiliate by code
  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, ref_code")
    .eq("ref_code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (!aff) return;

  let vid = getCookie(COOKIE_VID);
  if (!vid) { vid = genVisitorId(); setCookie(COOKIE_VID, vid, 365); }

  // Read configured cookie window (best effort)
  const { data: settings } = await supabase
    .from("affiliate_settings").select("cookie_days").eq("id", 1).maybeSingle();
  const days = settings?.cookie_days ?? DEFAULT_DAYS;
  setCookie(COOKIE_REF, aff.ref_code, days);

  await supabase.from("affiliate_clicks").insert({
    affiliate_id: aff.id,
    ref_code: aff.ref_code,
    target_path: window.location.pathname,
    visitor_id: vid,
    user_agent: navigator.userAgent,
    referrer: document.referrer || null,
  });

  // Strip ?ref from the URL for cleanliness (keep other params)
  params.delete("ref");
  const newQs = params.toString();
  const cleanUrl = window.location.pathname + (newQs ? `?${newQs}` : "") + window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
}

/** Build a shareable affiliate URL for the current site origin. */
export function buildAffiliateLink(refCode: string, targetPath = "/"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sep = targetPath.includes("?") ? "&" : "?";
  return `${origin}${targetPath}${sep}ref=${encodeURIComponent(refCode)}`;
}

export function getActiveRefCode(): string | null {
  return getCookie(COOKIE_REF);
}
