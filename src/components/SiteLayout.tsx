import { ReactNode, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LANG_DIR, type Lang } from "@/i18n";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { BannerSlot } from "./BannerSlot";
import { SidebarAd } from "./SidebarAd";
import { BackgroundMesh } from "./BackgroundMesh";
import { CustomCursor } from "./CustomCursor";
import { CommandPalette } from "./CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePredictivePrefetch } from "@/hooks/usePredictivePrefetch";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const PAGE_PREFIX: Record<string, string> = {
  "/": "home",
  "/forum": "forum",
  "/store": "store",
  "/academy": "academy",
  "/marketplace": "marketplace",
  "/pros": "pros",
  "/about": "about",
  "/contact": "contact",
};

export function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const prefix = PAGE_PREFIX[pathname];
  const showBanners = prefix !== undefined;

  const [paletteOpen, setPaletteOpen] = useState(false);

  useKeyboardShortcuts({
    onCommandPalette: () => setPaletteOpen((v) => !v),
    onSearch: () => setPaletteOpen(true),
  });

  usePredictivePrefetch(100);

  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "he") as Lang;
  const dir = LANG_DIR[lang] ?? "rtl";
  const align = dir === "rtl" ? "text-right" : "text-left";

  return (
    <div dir={dir} className={`relative flex min-h-screen flex-col ${align}`}>
      <BackgroundMesh />
      <CustomCursor />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <SiteHeader onCommandPalette={() => setPaletteOpen(true)} />

      {showBanners && (
        <div className="container mx-auto px-4 pt-4 md:px-8">
          <BannerSlot position="global_top" className="mb-2" />
          {prefix && <BannerSlot position={`${prefix}_top`} className="mb-2" />}
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Discreet side ads — only visible on xl+ screens, dismissible. */}
      {showBanners && (
        <>
          <SidebarAd side="right" position="sidebar_right" />
          <SidebarAd side="left" position="sidebar_left" />
        </>
      )}

      {showBanners && (
        <div className="container mx-auto px-4 pb-4 md:px-8">
          {prefix && <BannerSlot position={`${prefix}_bottom`} className="mt-2" />}
          <BannerSlot position="global_bottom" className="mt-2" />
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
